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
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>FollowArg</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td align="center" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px 16px 0 0;padding:32px 40px;">
            <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">FollowArg</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px;">Social Media Growth Platform</div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:40px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td align="center" style="padding:24px 0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} FollowArg — Social Media Growth Platform</p>
            <p style="margin:4px 0 0;font-size:12px;color:#cbd5e1;">Si no solicitaste este correo, podés ignorarlo.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const renderPersonalizedText = (
  value: string,
  user: { name: string; email: string },
): string =>
  value
    .replace(/\{\{\s*name\s*\}\}/gi, user.name)
    .replace(/\{\{\s*email\s*\}\}/gi, user.email);

const renderEmailParagraphs = (body: string): string =>
  body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.65;">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`,
    )
    .join('');

export const renderMarketingEmail = (data: {
  subject: string;
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  user: { name: string; email: string };
}): { subject: string; html: string } => {
  const subject = renderPersonalizedText(data.subject, data.user);
  const title = renderPersonalizedText(data.title, data.user);
  const body = renderPersonalizedText(data.body, data.user);
  const ctaText = data.ctaText
    ? renderPersonalizedText(data.ctaText, data.user)
    : '';
  const ctaUrl = data.ctaUrl?.trim();

  return {
    subject,
    html: baseTemplate(`
      <div style="display:inline-block;background:#ede9fe;color:#6366f1;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:700;margin:0 0 18px;">FollowArg</div>
      <h1 style="margin:0 0 12px;color:#111827;font-size:26px;line-height:1.2;">${escapeHtml(title)}</h1>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">Hola <strong style="color:#1e293b;">${escapeHtml(data.user.name)}</strong>, tenemos novedades para vos.</p>
      ${renderEmailParagraphs(body)}
      ${
        ctaText && ctaUrl
          ? `<div style="margin-top:28px;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">${escapeHtml(ctaText)}</a></div>`
          : ''
      }
      <div style="margin-top:30px;padding:16px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;">
        <p style="margin:0;color:#64748b;font-size:13px;line-height:1.5;">Este correo fue enviado porque tenés una cuenta registrada en FollowArg.</p>
      </div>
    `),
  };
};

export const sendMarketingEmail = async (data: {
  email: string;
  name: string;
  subject: string;
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}): Promise<void> => {
  if (!env.SMTP_USER) return;

  const rendered = renderMarketingEmail({
    subject: data.subject,
    title: data.title,
    body: data.body,
    ctaText: data.ctaText,
    ctaUrl: data.ctaUrl,
    user: { name: data.name, email: data.email },
  });

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: data.email,
    subject: rendered.subject,
    html: rendered.html,
  });
};

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
      subject: '✅ Pedido confirmado — FollowArg',
      html: baseTemplate(`
        <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px;">¡Pedido confirmado!</h2>
        <p style="margin:0 0 24px;color:#64748b;font-size:15px;">Hola <strong style="color:#1e293b;">${name}</strong>, tu pedido fue recibido y está siendo procesado.</p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 24px;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr style="background:#f8fafc;"><td style="padding:12px 16px;color:#64748b;font-size:13px;width:40%;">N° de pedido</td><td style="padding:12px 16px;color:#1e293b;font-size:13px;font-family:monospace;">${orderId.slice(0,8)}...</td></tr>
          <tr><td style="padding:12px 16px;color:#64748b;font-size:13px;border-top:1px solid #f1f5f9;">Servicio</td><td style="padding:12px 16px;color:#1e293b;font-size:13px;border-top:1px solid #f1f5f9;">${serviceName}</td></tr>
          <tr style="background:#f8fafc;"><td style="padding:12px 16px;color:#64748b;font-size:13px;">Cantidad</td><td style="padding:12px 16px;color:#1e293b;font-size:13px;">${quantity.toLocaleString()}</td></tr>
          <tr><td style="padding:12px 16px;color:#64748b;font-size:13px;border-top:1px solid #f1f5f9;">Total pagado</td><td style="padding:12px 16px;color:#6366f1;font-size:15px;font-weight:700;border-top:1px solid #f1f5f9;">$ ${price.toFixed(2)} ARS</td></tr>
        </table>
        <a href="${env.FRONTEND_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ver mis pedidos</a>
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
      subject: `Actualización de pedido: ${label} — FollowArg`,
      html: baseTemplate(`
        <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px;">Estado actualizado</h2>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Hola <strong style="color:#1e293b;">${name}</strong>, el estado de tu pedido fue actualizado.</p>
        <p style="margin:0 0 8px;color:#64748b;font-size:13px;">N° de pedido: <span style="font-family:monospace;color:#1e293b;">${orderId.slice(0,8)}...</span></p>
        <p style="margin:0 0 24px;">Nuevo estado: <span style="display:inline-block;background:#ede9fe;color:#6366f1;padding:4px 14px;border-radius:20px;font-size:13px;font-weight:600;">${label}</span></p>
        <a href="${env.FRONTEND_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ver mis pedidos</a>
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
      subject: '⚠️ Pedido fallido — revisá saldo en proveedor',
      html: baseTemplate(`
        <h2 style="margin:0 0 8px;color:#dc2626;font-size:22px;">⚠️ Pedido no ejecutado</h2>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Un pedido no pudo enviarse al proveedor, probablemente por <strong style="color:#1e293b;">saldo insuficiente en SMM Engineer</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 24px;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr style="background:#f8fafc;"><td style="padding:12px 16px;color:#64748b;font-size:13px;width:35%;">N° de pedido</td><td style="padding:12px 16px;color:#1e293b;font-size:13px;font-family:monospace;">${orderId.slice(0,8)}...</td></tr>
          <tr><td style="padding:12px 16px;color:#64748b;font-size:13px;border-top:1px solid #f1f5f9;">Servicio</td><td style="padding:12px 16px;color:#1e293b;font-size:13px;border-top:1px solid #f1f5f9;">${serviceName}</td></tr>
          <tr style="background:#f8fafc;"><td style="padding:12px 16px;color:#64748b;font-size:13px;">Cantidad</td><td style="padding:12px 16px;color:#1e293b;font-size:13px;">${quantity.toLocaleString()}</td></tr>
          <tr><td style="padding:12px 16px;color:#64748b;font-size:13px;border-top:1px solid #f1f5f9;">Link</td><td style="padding:12px 16px;color:#1e293b;font-size:13px;border-top:1px solid #f1f5f9;">${link}</td></tr>
          <tr style="background:#fef2f2;"><td style="padding:12px 16px;color:#64748b;font-size:13px;">Error</td><td style="padding:12px 16px;color:#dc2626;font-size:13px;">${errorMessage.slice(0,120)}</td></tr>
        </table>
        <p style="margin:0 0 20px;color:#64748b;font-size:14px;">Recargá saldo en <a href="https://smmengineer.com" style="color:#6366f1;">smmengineer.com</a> y luego reintentá el pedido desde el panel admin.</p>
        <a href="${env.FRONTEND_URL}/admin" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ir al panel admin</a>
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
      subject: '🚀 ¡Bienvenido a FollowArg!',
      html: baseTemplate(`
        <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px;">¡Bienvenido a FollowArg, ${name}!</h2>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Ya sos parte de la plataforma de crecimiento en redes sociales más rápida de Argentina. ¡Empezá a crecer hoy!</p>
        <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Tu código de referido:</p>
        <p style="margin:0 0 20px;"><span style="display:inline-block;background:#ede9fe;color:#6366f1;padding:6px 18px;border-radius:20px;font-size:16px;font-weight:700;letter-spacing:1px;">${referralCode}</span></p>
        <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Compartilo y ganás <strong style="color:#1e293b;">$ ${env.REFERRAL_REWARD_AMOUNT} ARS</strong> por cada amigo que gaste $${env.REFERRAL_SPEND_THRESHOLD} o más en la plataforma.</p>
        <a href="${env.FRONTEND_URL}/order" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Hacer mi primer pedido</a>
      `),
    });
  } catch (err) {
    logger.error('Failed to send welcome email', { email, error: err });
  }
};

export const sendTicketNotificationEmail = async (ticket: any, type: 'new' | 'admin_reply' | 'user_reply' | 'resolved'): Promise<void> => {
  if (!env.SMTP_USER) return;
  try {
    let subject = '';
    let content = '';
    let toEmail = env.SMTP_FROM; // Default to admin email

    if (type === 'new') {
      subject = `🎫 Nuevo ticket de ${ticket.user?.name ?? 'un usuario'}: ${ticket.subject}`;
      content = `
        <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px;">Nuevo ticket de soporte</h2>
        <p style="margin:0 0 16px;color:#64748b;font-size:15px;">Se ha creado un nuevo ticket que requiere tu atención.</p>
        <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:0 0 12px;">
          <p style="margin:0 0 4px;color:#1e293b;font-weight:600;">Cliente:</p>
          <p style="margin:0 0 12px;color:#6366f1;">${ticket.user?.name ?? '-'} &lt;${ticket.user?.email ?? '-'}&gt;</p>
          <p style="margin:0 0 4px;color:#1e293b;font-weight:600;">Asunto:</p>
          <p style="margin:0 0 12px;color:#64748b;">${ticket.subject}</p>
          <p style="margin:0 0 4px;color:#1e293b;font-weight:600;">Mensaje:</p>
          <p style="margin:0;color:#64748b;">${ticket.message}</p>
        </div>
        <a href="${env.FRONTEND_URL}/admin/tickets" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ver ticket</a>
      `;
    } else if (type === 'user_reply') {
      subject = `💬 Respuesta de ${ticket.user?.name ?? 'un cliente'} en ticket: ${ticket.subject ?? ''}`;
      content = `
        <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px;">Un cliente respondió a su ticket</h2>
        <p style="margin:0 0 16px;color:#64748b;font-size:15px;">Tiene una nueva respuesta de un cliente que requiere tu atención.</p>
        <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:0 0 20px;">
          <p style="margin:0 0 4px;color:#1e293b;font-weight:600;">Cliente:</p>
          <p style="margin:0 0 12px;color:#6366f1;">${ticket.user?.name ?? '-'} &lt;${ticket.user?.email ?? '-'}&gt;</p>
          <p style="margin:0 0 4px;color:#1e293b;font-weight:600;">Asunto del ticket:</p>
          <p style="margin:0;color:#64748b;">${ticket.subject ?? '-'}</p>
        </div>
        <a href="${env.FRONTEND_URL}/admin/tickets" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ver ticket</a>
      `;
    } else if (type === 'admin_reply') {
      subject = '💬 Respuesta a tu ticket de soporte';
      content = `
        <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px;">Tienes una nueva respuesta</h2>
        <p style="margin:0 0 16px;color:#64748b;font-size:15px;">El equipo de soporte ha respondido a tu ticket.</p>
        <a href="${env.FRONTEND_URL}/dashboard/tickets" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ver respuesta</a>
      `;
    } else if (type === 'resolved') {
      subject = '✅ Tu ticket ha sido resuelto';
      content = `
        <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px;">¡Ticket resuelto!</h2>
        <p style="margin:0 0 16px;color:#64748b;font-size:15px;">Tu ticket de soporte ha sido marcado como resuelto.</p>
        <a href="${env.FRONTEND_URL}/dashboard/tickets" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ver ticket</a>
      `;
    }

    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: toEmail,
      subject,
      html: baseTemplate(content),
    });
  } catch (err) {
    logger.error('Failed to send ticket notification email', { ticket, type, error: err });
  }
};
