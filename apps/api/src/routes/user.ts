import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import pool from '../db/pool';

const router = Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// POST /user/selfie
router.post(
  '/selfie',
  requireAuth,
  upload.single('selfie'),
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No selfie file uploaded' });
      return;
    }

    const userId = req.userId!;
    const filePath = req.file.path;

    await pool.query(
      `INSERT INTO selfies (user_id, file_path) VALUES ($1, $2)`,
      [userId, filePath]
    );

    await pool.query(
      `UPDATE users SET selfie_uploaded = TRUE, updated_at = NOW() WHERE id = $1`,
      [userId]
    );

    res.json({ success: true });
  }
);

// GET /user/me
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const result = await pool.query(
    `SELECT id, email, created_at, verified_basic, selfie_uploaded, status FROM users WHERE id = $1`,
    [req.userId]
  );
  if (result.rowCount === 0) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  res.json({ success: true, user: result.rows[0] });
});

// DELETE /user/account
router.delete('/account', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  await pool.query(
    `UPDATE users SET status = 'deleted', updated_at = NOW() WHERE id = $1`,
    [req.userId]
  );
  res.json({ success: true });
});

export default router;
