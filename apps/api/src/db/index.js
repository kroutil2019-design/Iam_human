'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone TEXT UNIQUE NOT NULL,
      otp TEXT,
      otp_expires_at TIMESTAMPTZ,
      selfie_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS proofs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      token TEXT UNIQUE NOT NULL,
      issued_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      revoked BOOLEAN DEFAULT FALSE
    );
  `);
}

module.exports = { pool, initDb };
