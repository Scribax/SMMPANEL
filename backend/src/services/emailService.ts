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
      subject: '✅ Pedido confirmado — BoostIns',
      html: baseTemplate(`
        <h2>¡Pedido confirmado!</h2>
        <p>Hola <strong>${name}</strong>, tu pedido fue recibido y está siendo procesado.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="padding:8px;color:#94a3b8;">N° de pedido</td><td style="padding:8px;color:#e2e8f0;"><code>${orderId}</code></td></tr>
          <tr><td style="padding:8px;color:#94a3b8;">Servicio</td><td style="padding:8px;color:#e2e8f0;">${serviceName}</td></tr>
          <tr><td style="padding:8px;color:#94a3b8;">Cantidad</td><td style="padding:8px;color:#e2e8f0;">${quantity.toLocaleString()}</td></tr>
          <tr><td style="padding:8px;color:#94a3b8;">Total pagado</td><td style="padding:8px;color:#e2e8f0;font-weight:700;">$ ${price.toFixed(2)} ARS</td></tr>
        </table>
        <p>Podés ver el estado de tu pedido en tu <a href="${env.FRONTEND_URL}/dashboard" style="color:#a5b4fc;">panel de control</a>.</p>
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
      subject: `Actualización de pedido: ${label} — BoostIns`,
      html: baseTemplate(`
        <h2>Estado actualizado</h2>
        <p>Hola <strong>${name}</strong>, el estado de tu pedido fue actualizado.</p>
        <p>N° de pedido: <code>${orderId}</code></p>
        <p>Nuevo estado: <span class="badge">${label}</span></p>
        <a href="${env.FRONTEND_URL}/dashboard" class="btn">Ver mi panel</a>
      `),
    });
  } catch (err) {
    logger.error('Failed to send status update email', { email, error: err });
  }
};

export const sendAdminProviderFailAlert = async (
  orderId: string,
  serviceName: string,
  quantity: number,
  link: string,
  errorMessage: string
): Promise<void> => {
  if (!env.SMTP_USER || !env.ADMIN_EMAIL) return;
  try {
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: env.ADMIN_EMAIL,
      subject: '⚠️ Pedido fallido — sin saldo en proveedor',
      html: baseTemplate(`
        <h2>⚠️ Pedido no ejecutado</h2>
        <p>Un pedido no pudo ser enviado al proveedor. Probablemente por <strong>saldo insuficiente en SMM Engineer</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="padding:8px;color:#94a3b8;">N° de pedido</td><td style="padding:8px;color:#e2e8f0;"><code>${orderId}</code></td></tr>
          <tr><td style="padding:8px;color:#94a3b8;">Servicio</td><td style="padding:8px;color:#e2e8f0;">${serviceName}</td></tr>
          <tr><td style="padding:8px;color:#94a3b8;">Cantidad</td><td style="padding:8px;color:#e2e8f0;">${quantity.toLocaleString()}</td></tr>
          <tr><td style="padding:8px;color:#94a3b8;">Link</td><td style="padding:8px;color:#e2e8f0;">${link}</td></tr>
          <tr><td style="padding:8px;color:#94a3b8;">Error</td><td style="padding:8px;color:#f87171;">${errorMessage}</td></tr>
        </table>
        <p>Recargá saldo en <a href="https://smmengineer.com" style="color:#a5b4fc;">smmengineer.com</a> y luego reintentá el pedido desde el panel admin.</p>
        <a href="${env.FRONTEND_URL}/admin" class="btn">Ir al panel admin</a>
      `),
    });
  } catch (err) {
    logger.error('Failed to send admin provider fail alert', { error: err });
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
      subject: '🚀 ¡Bienvenido a BoostIns!',
      html: baseTemplate(`
        <h2>¡Bienvenido a BoostIns, ${name}!</h2>
        <p>Ya sos parte de la plataforma de crecimiento en redes sociales más rápida. ¡Empezá a crecer hoy!</p>
        <p>Tu código de referido: <span class="badge">${referralCode}</span></p>
        <p>Compartilo y ganás <strong>$ ${env.REFERRAL_REWARD_AMOUNT} ARS</strong> por cada amigo que haga su primer pedido.</p>
        <a href="${env.FRONTEND_URL}/order" class="btn">Hacer un pedido</a>
      `),
    });
  } catch (err) {
    logger.error('Failed to send welcome email', { email, error: err });
  }
};
