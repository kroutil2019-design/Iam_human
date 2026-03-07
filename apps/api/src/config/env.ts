function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parsePositiveInt(name: string, fallback: string): number {
  const raw = process.env[name] ?? fallback;
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer`);
  }
  return parsed;
}

export const env = {
  port: parsePositiveInt('PORT', '4000'),
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiry: process.env.JWT_EXPIRY?.trim() || '7d',
  adminApiKey: requireEnv('ADMIN_API_KEY'),
  hptExpiryDays: parsePositiveInt('HPT_EXPIRY_DAYS', '30'),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
} as const;