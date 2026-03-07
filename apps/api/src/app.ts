import express from 'express';
import cors from 'cors';
import path from 'path';

import authRouter from './routes/auth';
import userRouter from './routes/user';
import proofsRouter from './routes/proofs';
import adminRouter from './routes/admin';

const app = express();

// CORS
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

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

// Static uploads (selfies)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/auth', authRouter);
app.use('/user', userRouter);
app.use('/proofs', proofsRouter);
app.use('/admin', adminRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
