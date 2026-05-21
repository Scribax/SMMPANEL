import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { env } from '../config/env';
import { sendWelcomeEmail } from '../services/emailService';
import { logger } from '../utils/logger';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  balance: number;
  referral_code: string;
  referred_by: string | null;
}

const generateReferralCode = (): string =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

const signToken = (user: { id: string; email: string; role: string }): string =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });

export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, name, referralCode } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ success: false, message: 'Email, password and name are required' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    return;
  }

  const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length) {
    res.status(409).json({ success: false, message: 'Email already registered' });
    return;
  }

  let referredBy: string | null = null;
  if (referralCode) {
    const ref = await query<UserRow>('SELECT id FROM users WHERE referral_code = $1', [referralCode.toUpperCase()]);
    if (ref.rows.length) referredBy = ref.rows[0].id;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const newReferralCode = generateReferralCode();

  const result = await query<UserRow>(
    `INSERT INTO users (email, password_hash, name, role, referral_code, referred_by)
     VALUES ($1, $2, $3, 'user', $4, $5)
     RETURNING id, email, name, role, balance, referral_code`,
    [email.toLowerCase(), passwordHash, name, newReferralCode, referredBy]
  );

  const user = result.rows[0];

  if (referredBy) {
    await query(
      `INSERT INTO referrals (referrer_id, referred_id, reward_amount, status)
       VALUES ($1, $2, $3, 'pending')`,
      [referredBy, user.id, env.REFERRAL_REWARD_AMOUNT]
    ).catch((e) => logger.warn('Failed to create referral record', e));
  }

  const token = signToken(user);
  sendWelcomeEmail(user.email, user.name, user.referral_code).catch(() => {});

  logger.info('New user registered', { userId: user.id });
  res.status(201).json({
    success: true,
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, balance: user.balance ?? 0 },
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password are required' });
    return;
  }

  const result = await query<UserRow>(
    'SELECT id, email, name, role, password_hash, balance FROM users WHERE email = $1 AND is_active = true',
    [email.toLowerCase()]
  );

  if (!result.rows.length) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  const token = signToken(user);
  logger.info('User logged in', { userId: user.id });

  res.json({
    success: true,
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, balance: user.balance },
  });
};

export const getMe = async (req: Request & { user?: UserRow }, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const result = await query<Omit<UserRow, 'password_hash'>>(
    'SELECT id, email, name, role, balance, referral_code, created_at FROM users WHERE id = $1',
    [userId]
  );

  if (!result.rows.length) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  res.json({ success: true, user: result.rows[0] });
};

export const changePassword = async (req: Request & { user?: UserRow }, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.id;

  if (!currentPassword || !newPassword || newPassword.length < 8) {
    res.status(400).json({ success: false, message: 'Invalid password data' });
    return;
  }

  const result = await query<UserRow>('SELECT password_hash FROM users WHERE id = $1', [userId]);
  const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!valid) {
    res.status(401).json({ success: false, message: 'Current password is incorrect' });
    return;
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
  res.json({ success: true, message: 'Password updated successfully' });
};
