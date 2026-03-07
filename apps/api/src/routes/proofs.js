'use strict';

const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const { pool } = require('../db');

const router = express.Router();

const PROOF_TTL_DAYS = 30;

const proofsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

function generateProofToken() {
  return crypto.randomBytes(32).toString('hex');
}

// POST /proofs/human – issue a Human Proof Token for the authenticated user
router.post('/human', proofsLimiter, authenticate, async (req, res) => {
  const userId = req.user.sub;

  const { rows: userRows } = await pool.query(
    'SELECT selfie_url FROM users WHERE id = $1',
    [userId]
  );

  if (!userRows.length || !userRows[0].selfie_url) {
    return res.status(422).json({
      error: 'Selfie required before issuing a proof',
    });
  }

  const token = generateProofToken();
  const expiresAt = new Date(Date.now() + PROOF_TTL_DAYS * 24 * 60 * 60 * 1000);

  const { rows } = await pool.query(
    `INSERT INTO proofs (user_id, token, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, token, issued_at, expires_at`,
    [userId, token, expiresAt]
  );

  res.status(201).json(rows[0]);
});

// GET /proofs/current – get the current active proof for the authenticated user
router.get('/current', proofsLimiter, authenticate, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, token, issued_at, expires_at
     FROM proofs
     WHERE user_id = $1
       AND revoked = FALSE
       AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY issued_at DESC
     LIMIT 1`,
    [req.user.sub]
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'No active proof found' });
  }

  res.json(rows[0]);
});

// POST /proofs/verify – verify a Human Proof Token (public endpoint)
router.post('/verify', proofsLimiter, async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'token is required' });
  }

  const { rows } = await pool.query(
    `SELECT id, issued_at, expires_at, revoked
     FROM proofs
     WHERE token = $1`,
    [token]
  );

  if (!rows.length) {
    return res.json({ valid: false, reason: 'Token not found' });
  }

  const proof = rows[0];

  if (proof.revoked) {
    return res.json({ valid: false, reason: 'Token revoked' });
  }

  if (proof.expires_at && new Date() > new Date(proof.expires_at)) {
    return res.json({ valid: false, reason: 'Token expired' });
  }

  res.json({ valid: true, issuedAt: proof.issued_at, expiresAt: proof.expires_at });
});

module.exports = router;
