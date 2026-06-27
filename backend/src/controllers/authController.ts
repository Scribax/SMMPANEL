import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { query } from "../config/database";
import { env } from "../config/env";
import { sendWelcomeEmail } from "../services/emailService";
import { logger } from "../utils/logger";
import { getResellerPricingProfile } from "../services/resellerService";

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
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN as any,
    },
  );

export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, name, referralCode } = req.body;

  if (!email || !password || !name) {
    res
      .status(400)
      .json({
        success: false,
        message: "Email, password and name are required",
      });
    return;
  }

  if (password.length < 8) {
    res
      .status(400)
      .json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    return;
  }

  const existing = await query("SELECT id FROM users WHERE email = $1", [
    email.toLowerCase(),
  ]);
  if (existing.rows.length) {
    res
      .status(409)
      .json({ success: false, message: "Email already registered" });
    return;
  }

  let referredBy: string | null = null;
  if (referralCode) {
    const ref = await query<UserRow>(
      "SELECT id FROM users WHERE referral_code = $1",
      [referralCode.toUpperCase()],
    );
    if (ref.rows.length) referredBy = ref.rows[0].id;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const newReferralCode = generateReferralCode();

  const result = await query<UserRow>(
    `INSERT INTO users (email, password_hash, name, role, referral_code, referred_by)
     VALUES ($1, $2, $3, 'user', $4, $5)
     RETURNING id, email, name, role, balance, referral_code`,
    [email.toLowerCase(), passwordHash, name, newReferralCode, referredBy],
  );

  const user = result.rows[0];

  if (referredBy) {
    await query(
      `INSERT INTO referrals (referrer_id, referred_id, reward_amount, status)
       VALUES ($1, $2, $3, 'pending')`,
      [referredBy, user.id, env.REFERRAL_REWARD_AMOUNT],
    ).catch((e) => logger.warn("Failed to create referral record", e));
  }

  const token = signToken(user);
  sendWelcomeEmail(user.email, user.name, user.referral_code).catch(() => {});

  logger.info("New user registered", { userId: user.id });
  res.status(201).json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      balance: user.balance ?? 0,
      referral_code: user.referral_code,
    },
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res
      .status(400)
      .json({ success: false, message: "Email and password are required" });
    return;
  }

  const result = await query<UserRow>(
    "SELECT id, email, name, role, password_hash, balance, referral_code FROM users WHERE email = $1 AND is_active = true",
    [email.toLowerCase()],
  );

  if (!result.rows.length) {
    res.status(401).json({ success: false, message: "Invalid credentials" });
    return;
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ success: false, message: "Invalid credentials" });
    return;
  }

  const token = signToken(user);
  logger.info("User logged in", { userId: user.id });

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      balance: user.balance,
      referral_code: user.referral_code,
    },
  });
};

export const getMe = async (
  req: Request & { user?: UserRow },
  res: Response,
): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  const result = await query<Omit<UserRow, "password_hash">>(
    `SELECT id, email, name, role, balance, referral_code,
            reseller_enabled, reseller_discount_percent, reseller_min_deposit,
            created_at
     FROM users WHERE id = $1`,
    [userId],
  );

  if (!result.rows.length) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  const resellerProfile = await getResellerPricingProfile(userId);
  res.json({
    success: true,
    user: {
      ...result.rows[0],
      reseller: resellerProfile,
    },
  });
};

export const getMyReferrals = async (
  req: Request & { user?: UserRow },
  res: Response,
): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  // Get all referrals where this user is the referrer
  const referrals = await query<{
    id: string;
    referred_name: string;
    referred_email: string;
    referred_total_spent: number;
    spend_threshold: number;
    reward_amount: number;
    status: string;
    paid_at: string | null;
    created_at: string;
  }>(
    `SELECT r.id, u.name AS referred_name,
            CONCAT(LEFT(u.email, 3), '***@', SPLIT_PART(u.email, '@', 2)) AS referred_email,
            r.referred_total_spent, r.spend_threshold, r.reward_amount,
            r.status, r.paid_at, r.created_at
     FROM referrals r
     JOIN users u ON r.referred_id = u.id
     WHERE r.referrer_id = $1
     ORDER BY r.created_at DESC`,
    [userId],
  );

  const totalEarned = referrals.rows
    .filter((r) => r.status === "qualified" || r.status === "paid")
    .reduce((sum, r) => sum + Number(r.reward_amount), 0);

  const pendingCount = referrals.rows.filter(
    (r) => r.status === "pending",
  ).length;
  const qualifiedCount = referrals.rows.filter(
    (r) => r.status === "qualified" || r.status === "paid",
  ).length;

  res.json({
    success: true,
    referrals: referrals.rows,
    summary: {
      total: referrals.rows.length,
      pending: pendingCount,
      qualified: qualifiedCount,
      totalEarned,
      rewardAmount: env.REFERRAL_REWARD_AMOUNT,
      spendThreshold: env.REFERRAL_SPEND_THRESHOLD,
    },
  });
};

export const changePassword = async (
  req: Request & { user?: UserRow },
  res: Response,
): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.id;

  if (!currentPassword || !newPassword || newPassword.length < 8) {
    res.status(400).json({ success: false, message: "Invalid password data" });
    return;
  }

  const result = await query<UserRow>(
    "SELECT password_hash FROM users WHERE id = $1",
    [userId],
  );
  const valid = await bcrypt.compare(
    currentPassword,
    result.rows[0].password_hash,
  );
  if (!valid) {
    res
      .status(401)
      .json({ success: false, message: "Current password is incorrect" });
    return;
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [
    hash,
    userId,
  ]);
  res.json({ success: true, message: "Password updated successfully" });
};
