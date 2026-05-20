import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

const baseTemplate = (content: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: #0f0f1a; color: #e2e8f0; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 32px; }
    .logo { font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(99,102,241,0.2); border-radius: 16px; padding: 32px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; }
    .footer { text-align: center; margin-top: 32px; color: #64748b; font-size: 13px; }
    h2 { color: #a5b4fc; margin-top: 0; }
    p { line-height: 1.6; color: #cbd5e1; }
    .badge { display: inline-block; background: rgba(99,102,241,0.2); color: #a5b4fc; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">⚡ BoostIns</div>
    </div>
    <div class="card">${content}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} BoostIns — Social Media Growth Platform</p>
      <p>If you did not request this email, please ignore it.</p>
    </div>
  </div>
</body>
</html>
`;

export const sendOrderConfirmation = async (
  email: string,
  name: string,
  orderId: string,
  serviceName: string,
  quantity: number,
  price: number
): Promise<void> => {
  if (!env.SMTP_USER) return;
  try {
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: email,
      subject: '✅ Order Confirmed — BoostIns',
      html: baseTemplate(`
        <h2>Order Confirmed!</h2>
        <p>Hi <strong>${name}</strong>, your order has been received and is being processed.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="padding:8px;color:#94a3b8;">Order ID</td><td style="padding:8px;color:#e2e8f0;"><code>${orderId}</code></td></tr>
          <tr><td style="padding:8px;color:#94a3b8;">Service</td><td style="padding:8px;color:#e2e8f0;">${serviceName}</td></tr>
          <tr><td style="padding:8px;color:#94a3b8;">Quantity</td><td style="padding:8px;color:#e2e8f0;">${quantity.toLocaleString()}</td></tr>
          <tr><td style="padding:8px;color:#94a3b8;">Amount Paid</td><td style="padding:8px;color:#e2e8f0;font-weight:700;">R$ ${price.toFixed(2)}</td></tr>
        </table>
        <p>You can track your order status in your <a href="${env.FRONTEND_URL}/dashboard" style="color:#a5b4fc;">dashboard</a>.</p>
      `),
    });
  } catch (err) {
    logger.error('Failed to send order confirmation email', { email, error: err });
  }
};

export const sendOrderStatusUpdate = async (
  email: string,
  name: string,
  orderId: string,
  status: string
): Promise<void> => {
  if (!env.SMTP_USER) return;
  try {
    const statusLabels: Record<string, string> = {
      completed: '✅ Completed',
      processing: '⚙️ Processing',
      in_progress: '🚀 In Progress',
      partial: '⚠️ Partial',
      failed: '❌ Failed',
    };
    const label = statusLabels[status] ?? status;
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: email,
      subject: `Order Update: ${label} — BoostIns`,
      html: baseTemplate(`
        <h2>Order Status Update</h2>
        <p>Hi <strong>${name}</strong>, your order status has been updated.</p>
        <p>Order ID: <code>${orderId}</code></p>
        <p>New Status: <span class="badge">${label}</span></p>
        <a href="${env.FRONTEND_URL}/dashboard" class="btn">View Dashboard</a>
      `),
    });
  } catch (err) {
    logger.error('Failed to send status update email', { email, error: err });
  }
};

export const sendWelcomeEmail = async (
  email: string,
  name: string,
  referralCode: string
): Promise<void> => {
  if (!env.SMTP_USER) return;
  try {
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: email,
      subject: '🚀 Welcome to BoostIns!',
      html: baseTemplate(`
        <h2>Welcome to BoostIns, ${name}!</h2>
        <p>You're now part of the fastest growing social media growth platform. Start boosting your presence today.</p>
        <p>Your referral code: <span class="badge">${referralCode}</span></p>
        <p>Share it and earn <strong>R$ ${env.REFERRAL_REWARD_AMOUNT}</strong> for every friend who makes their first order!</p>
        <a href="${env.FRONTEND_URL}/services" class="btn">Browse Services</a>
      `),
    });
  } catch (err) {
    logger.error('Failed to send welcome email', { email, error: err });
  }
};
