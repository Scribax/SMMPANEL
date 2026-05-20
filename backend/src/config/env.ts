import dotenv from 'dotenv';
dotenv.config();

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  DATABASE_URL: requireEnv('DATABASE_URL'),

  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_in_production',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'dev_encryption_key_change_it_now',

  MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN || '',
  MP_PUBLIC_KEY: process.env.MP_PUBLIC_KEY || '',
  MP_WEBHOOK_URL: process.env.MP_WEBHOOK_URL || '',

  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'FollowArg <noreply@followarg.com>',

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  REFERRAL_REWARD_AMOUNT: parseFloat(process.env.REFERRAL_REWARD_AMOUNT || '5.00'),
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@followarg.com',
};
