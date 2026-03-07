'use strict';

const express = require('express');
const multer = require('multer');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const { pool } = require('../db');

const router = express.Router();

const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const upload = multer({
  dest: path.join(__dirname, '../../uploads'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

// POST /user/selfie
router.post('/selfie', userLimiter, authenticate, upload.single('selfie'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'selfie image is required' });
  }

  const selfieUrl = `/uploads/${req.file.filename}`;

  await pool.query(
    'UPDATE users SET selfie_url = $1 WHERE id = $2',
    [selfieUrl, req.user.sub]
  );

  res.json({ message: 'Selfie uploaded', selfieUrl });
});

module.exports = router;
