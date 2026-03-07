import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import rateLimit from 'express-rate-limit';

import authRouter from './routes/auth';
import userRouter from './routes/user';
import proofsRouter from './routes/proofs';
import adminRouter from './routes/admin';
import { env } from './config/env';

const app = express();

// Codespaces/public ingress sits behind one proxy hop.
app.set('trust proxy', 1);

// CORS
const allowedOrigins = env.corsOrigins;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// Rate limiting
const isProduction = process.env.NODE_ENV === 'production';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  skip: () => !isProduction,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

// Static uploads (selfies)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/auth', authLimiter, authRouter);
app.use('/user', generalLimiter, userRouter);
app.use('/proofs', generalLimiter, proofsRouter);
app.use('/admin', generalLimiter, adminRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global async error handler — catches errors thrown/rejected in route handlers
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

export default app;
