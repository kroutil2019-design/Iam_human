'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');

const router = express.Router();

const OTP_TTL_MINUTES = 10;

const otpRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests. Please try again later.' },
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification attempts. Please try again later.' },
});

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /auth/request-otp
router.post('/request-otp', otpRequestLimiter, async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'phone is required' });
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await pool.query(
    `INSERT INTO users (phone, otp, otp_expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (phone) DO UPDATE
       SET otp = EXCLUDED.otp,
           otp_expires_at = EXCLUDED.otp_expires_at`,
    [phone, otp, expiresAt]
  );

  // In production, send the OTP via SMS. Here we return it for development.
  console.log(`OTP for ${phone}: ${otp}`);

  res.json({ message: 'OTP sent', expiresInMinutes: OTP_TTL_MINUTES });
});

// POST /auth/verify-otp
router.post('/verify-otp', otpVerifyLimiter, async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ error: 'phone and otp are required' });
  }

  const { rows } = await pool.query(
    'SELECT id, otp, otp_expires_at FROM users WHERE phone = $1',
    [phone]
  );

  if (!rows.length) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const user = rows[0];
  if (user.otp !== otp || new Date() > new Date(user.otp_expires_at)) {
    return res.status(401).json({ error: 'Invalid or expired OTP' });
  }

  await pool.query(
    'UPDATE users SET otp = NULL, otp_expires_at = NULL WHERE id = $1',
    [user.id]
  );

  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

  res.json({ token });
});

module.exports = router;
