import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing auth token' });
    return;
  }

  const token = header.slice(7);
  try {
    const secret = process.env.JWT_SECRET ?? '';
    const payload = jwt.verify(token, secret) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired auth token' });
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const key =
    req.headers['x-admin-key'] ??
    req.headers['authorization']?.replace('Bearer ', '');
  if (!key || key !== process.env.ADMIN_API_KEY) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return;
  }
  next();
}
