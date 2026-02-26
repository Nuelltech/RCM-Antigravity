import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import ResetPasswordEmail from '../email-templates/ResetPassword';
import VerifyAccountEmail from '../email-templates/VerifyAccount';
import ForgotPasswordEmail from '../email-templates/ForgotPassword';
import UserInvite from '../email-templates/UserInvite';
import WelcomeEmail from '../email-templates/Welcome';

// Configuration
const FROM_EMAIL = process.env.EMAIL_FROM_ADDRESS || 'info@nuelltech.com';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Restaurante Manager';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

// Log configuration status
console.log('📧 Email Service Configuration:', {
    provider: SENDGRID_API_KEY ? 'SendGrid API' : 'SMTP Fallback',
    sender: `${FROM_NAME} <${FROM_EMAIL}>`,
});

// Helper to load SendGrid conditionally
let sgMail: any;
if (SENDGRID_API_KEY) {
    try {
        // Use require to avoid build errors if package is missing locally but present in prod
        sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(SENDGRID_API_KEY);
    } catch (e) {
        console.warn('SendGrid configured but module not found. Run npm install @sendgrid/mail');
    }
}

// SMTP Transporter (Fallback or Dev)
const smtpPort = parseInt(process.env.SMTP_PORT || '465');
const isSecure = smtpPort === 465;

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: smtpPort,
    secure: isSecure,
    requireTLS: !isSecure && smtpPort === 587,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        ciphers: 'SSLv3',
        servername: process.env.SMTP_HOST || 'smtp.hostinger.com',
    },
});

export interface EmailUser {
    email: string;
    name: string;
}

/**
 * Helper to send email using the best available provider
 */
async function sendMail(to: string, subject: string, html: string, text?: string) {
    let sentViaSendGrid = false;

    // Try SendGrid first if configured and module loaded
    if (SENDGRID_API_KEY && sgMail) {
        try {
            await sgMail.send({
                to,
                from: `${FROM_NAME} <${FROM_EMAIL}>`,
                subject,
                html,
                text,
            });
            console.log(`[SendGrid] Email sent to ${to}`);
            sentViaSendGrid = true;
            return;
        } catch (error: any) {
            console.warn('[SendGrid] Failed to send email. Falling back to SMTP.', error.message);
            if (error.response) {
                console.error('[SendGrid] Error Body:', JSON.stringify(error.response.body, null, 2));
            }
            // Proceed to SMTP fallback
        }
    }

    // SMTP Fallback (if SendGrid failed or not configured)
    if (!sentViaSendGrid) {
        // Assuming SMTP might fail on Render but we keep it as code fallback
        // If strict SendGrid is needed, implementing a specific error or check:
        if (process.env.NODE_ENV === 'production' && !sentViaSendGrid && SENDGRID_API_KEY) {
            console.error('CRITICAL: SendGrid failed in production and SMTP is unreliable.');
        }

        try {
            const info = await transporter.sendMail({
                from: `${FROM_NAME} <${FROM_EMAIL}>`,
                to,
                subject,
                html,
                text,
            });
            console.log(`[SMTP] Email sent to ${to} (MessageID: ${info.messageId})`);
        } catch (error: any) {
            console.error('[SMTP] Email sending failed:', error);
            throw new Error(`Failed to send email via both providers: ${error.message}`);
        }
    }
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(user: EmailUser, resetToken: string): Promise<void> {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const emailHtml = render(
        ResetPasswordEmail({
            userName: user.name,
            resetLink,
            expiresInMinutes: 60
        })
    );

    await sendMail(user.email, 'Recuperar Password - Restaurante Manager', emailHtml);
}

/**
 * Send email verification code
 */
export async function sendVerificationCode(user: EmailUser, code: string): Promise<void> {
    const emailHtml = render(
        VerifyAccountEmail({
            userName: user.name,
            verificationCode: code,
            expiresInMinutes: 15
        })
    );

    const emailText = `Olá ${user.name},\n\nObrigado por te registares no Restaurante Manager!\n\nCódigo de verificação: ${code}\n\nEste código expira em 15 minutos.`;

    console.log(`[EMAIL DEBUG] Verification Code for ${user.email}: ${code}`);

    await sendMail(user.email, 'Código de Verificação - Restaurante Manager', emailHtml, emailText);
}

/**
 * Send password recovery email with verification code
 */
export async function sendForgotPassword(user: EmailUser, code: string): Promise<void> {
    const emailHtml = render(
        ForgotPasswordEmail({
            userName: user.name,
            verificationCode: code,
            expiresInMinutes: 15
        })
    );

    const emailText = `Olá ${user.name},\n\nRecebemos um pedido para redefinir a password da tua conta.\n\nCódigo de verificação: ${code}`;

    await sendMail(user.email, 'Código de Segurança: Recuperação de Conta', emailHtml, emailText);
}

/**
 * Send user invite email
 */
export async function sendUserInvite(
    user: EmailUser,
    restaurantName: string,
    inviteToken: string,
    roleName: string
): Promise<void> {
    const inviteLink = `${process.env.FRONTEND_URL}/accept-invite?token=${inviteToken}`;

    console.log('🔗 [EMAIL DEBUG] Generated invite link:', inviteLink);

    const emailHtml = render(
        UserInvite({
            userName: user.name,
            restaurantName,
            inviteLink,
            roleName,
        })
    );

    const emailText = `Bem-vindo, ${user.name}!\n\nFoi convidado para aceder ao sistema de gestão do restaurante ${restaurantName} como ${roleName}.\n\nLink: ${inviteLink}`;

    await sendMail(user.email, `Convite para ${restaurantName} - Restaurante Manager`, emailHtml, emailText);
}

/**
 * Send price alert email (future use)
 */
export async function sendPriceAlert(
    user: EmailUser,
    products: Array<{ name: string; oldPrice: number; newPrice: number }>
): Promise<void> {
    // TODO: Implement price alert email template
    console.log('Price alert email - to be implemented');
}

/**
 * Send welcome email after activation
 */
export async function sendWelcomeEmail(
    user: EmailUser,
    trialEndDate: Date
): Promise<void> {
    const loginLink = `${process.env.FRONTEND_URL}/auth/login`;
    const formattedDate = trialEndDate.toLocaleDateString('pt-PT', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const emailHtml = render(
        WelcomeEmail({
            userName: user.name,
            loginLink,
            trialEndDate: formattedDate
        })
    );

    const emailText = `Olá ${user.name}!\n\nA tua conta está ativa. O teu período de teste termina em ${formattedDate}.\n\nAcede aqui: ${loginLink}`;

    await sendMail(user.email, 'Bem-vindo ao Restaurante Manager! 🚀', emailHtml, emailText);
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared HTML layout builder for subscription lifecycle emails
// ─────────────────────────────────────────────────────────────────────────────
function buildEmailHtml(opts: {
    userName: string;
    badgeColor: string;
    badgeLabel: string;
    headline: string;
    body: string;
    ctaHref: string;
    ctaLabel: string;
    footerNote?: string;
}): string {
    const logoUrl = `${process.env.FRONTEND_URL || 'https://rcm-app.com'}/images/logo-sidebar.png`;
    const { userName, badgeColor, badgeLabel, headline, body, ctaHref, ctaLabel, footerNote } = opts;

    return `
<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.07);overflow:hidden;">
        <tr>
          <td style="background:#1f2937;padding:24px 40px;text-align:center;">
            <img src="${logoUrl}" alt="RCM" height="44" style="height:44px;max-width:180px;object-fit:contain;" />
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px 0;text-align:center;">
            <span style="display:inline-block;background:${badgeColor}1a;color:${badgeColor};font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:5px 14px;border-radius:999px;border:1px solid ${badgeColor}40;">${badgeLabel}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px 0;text-align:center;">
            <h1 style="margin:0;font-size:22px;font-weight:800;color:#111827;line-height:1.3;">${headline}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 0;color:#4b5563;font-size:15px;line-height:1.7;">
            <p style="margin:0 0 8px;">Ol&aacute; <strong>${userName}</strong>,</p>
            ${body}
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px;text-align:center;">
            <a href="${ctaHref}" style="display:inline-block;background:#f97316;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:10px;">&#128279;&nbsp; ${ctaLabel}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 32px;">
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px;" />
            ${footerNote ? `<p style="margin:0 0 12px;font-size:13px;color:#6b7280;text-align:center;">${footerNote}</p>` : ''}
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
              Restaurante Cost Manager &bull;
              <a href="${process.env.FRONTEND_URL || 'https://rcm-app.com'}" style="color:#9ca3af;">rcm-app.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Send warning that trial is expiring soon (3 days)
 */
export async function sendTrialExpiringEmail(
    user: EmailUser,
    daysRemaining: number,
    expiryDate: Date
): Promise<void> {
    const formattedDate = expiryDate.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' });
    const subscriptionLink = `${process.env.FRONTEND_URL}/settings/subscription`;
    const subject = `⏳ O teu trial termina em ${daysRemaining} dia(s) — age agora!`;

    const html = buildEmailHtml({
        userName: user.name,
        badgeColor: '#eab308',
        badgeLabel: `Trial expira em ${daysRemaining} dia(s)`,
        headline: 'O teu acesso está prestes a terminar',
        body: `
            <p style="margin:0 0 12px;">O teu período de teste gratuito termina a <strong>${formattedDate}</strong>. Depois disso, o acesso ao Restaurante Cost Manager será interrompido.</p>
            <p style="margin:0 0 12px;">Para continuares a usar todas as funcionalidades &mdash; dashboard, faturas, vendas e mais &mdash; escolhe um plano antes que o prazo expire.</p>
            <p style="margin:0;">Leva menos de 2 minutos. &#128526;</p>
        `,
        ctaHref: subscriptionLink,
        ctaLabel: 'Ver planos e subscrever',
        footerNote: 'Se já subscreveste, podes ignorar este email.',
    });

    await sendMail(user.email, subject, html);
}

/**
 * Send notification that account is suspended
 */
export async function sendAccountSuspendedEmail(
    user: EmailUser
): Promise<void> {
    const subscriptionLink = `${process.env.FRONTEND_URL}/settings/subscription`;
    const subject = `🚫 A tua conta foi suspensa`;

    const html = buildEmailHtml({
        userName: user.name,
        badgeColor: '#ef4444',
        badgeLabel: 'Conta Suspensa',
        headline: 'O acesso à tua conta foi interrompido',
        body: `
            <p style="margin:0 0 12px;">O período de carência terminou sem que o pagamento fosse regularizado. Por este motivo, a tua conta foi <strong>suspensa</strong> e o acesso às funcionalidades está bloqueado.</p>
            <p style="margin:0 0 12px;">Os teus dados estão seguros. Para recuperar o acesso, subscreve um plano &mdash; o processo demora menos de 2 minutos.</p>
            <p style="margin:0;">Precisas de ajuda? Contacta-nos em <a href="mailto:suporte@rcm-app.com" style="color:#f97316;">suporte@rcm-app.com</a></p>
        `,
        ctaHref: subscriptionLink,
        ctaLabel: 'Reativar a minha conta',
        footerNote: 'Os teus dados são mantidos por 30 dias após a suspensão.',
    });

    await sendMail(user.email, subject, html);
}

/**
 * Send notification that trial has just expired (no payment yet)
 */
export async function sendTrialExpiredEmail(
    user: EmailUser
): Promise<void> {
    const subscriptionLink = `${process.env.FRONTEND_URL}/settings/subscription`;
    const subject = `⏰ O teu trial expirou &mdash; tens 3 dias para subscrever`;

    const html = buildEmailHtml({
        userName: user.name,
        badgeColor: '#f97316',
        badgeLabel: 'Trial Expirado',
        headline: 'O teu período de teste gratuito terminou',
        body: `
            <p style="margin:0 0 12px;">O teu trial chegou ao fim. Para não perderes o acesso aos teus dados e às funcionalidades do RCM, precisas de escolher um plano.</p>
            <p style="margin:0 0 12px;">Tens um período de carência de <strong>3 dias</strong> para subscrever. Após esse prazo, a conta será suspensa automaticamente.</p>
            <p style="margin:0;">Não deixes para depois! &#128072;</p>
        `,
        ctaHref: subscriptionLink,
        ctaLabel: 'Escolher o meu plano agora',
        footerNote: 'A partir de &euro;65/mês. Cancela quando quiseres.',
    });

    await sendMail(user.email, subject, html);
}

/**
 * Send notification that a payment failed and grace period has started
 */
export async function sendPaymentFailedEmail(
    user: EmailUser,
    gracePeriodDays: number,
    gracePeriodEnd: Date
): Promise<void> {
    const subscriptionLink = `${process.env.FRONTEND_URL}/settings/subscription`;
    const formattedDate = gracePeriodEnd.toLocaleDateString('pt-PT', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
    const subject = `❌ Falha no pagamento &mdash; regulariza até ${gracePeriodEnd.toLocaleDateString('pt-PT')}`;

    const html = buildEmailHtml({
        userName: user.name,
        badgeColor: '#ef4444',
        badgeLabel: 'Pagamento Falhado',
        headline: 'Não conseguimos processar o teu pagamento',
        body: `
            <p style="margin:0 0 12px;">O pagamento da tua subscrição foi recusado. Isto pode acontecer por cartão expirado, fundos insuficientes ou actualização de dados bancários.</p>
            <p style="margin:0 0 12px;">Tens <strong>${gracePeriodDays} dias</strong> de carência (até <strong>${formattedDate}</strong>) para actualizar o método de pagamento. Após esse prazo, o acesso será suspenso.</p>
            <p style="margin:0;">Acede ao portal seguro do Stripe para actualizar o cartão em segundos. &#128179;</p>
        `,
        ctaHref: subscriptionLink,
        ctaLabel: 'Actualizar método de pagamento',
        footerNote: 'O Stripe gere os teus dados de pagamento com segurança. Nós nunca têmos acesso ao número do teu cartão.',
    });

    await sendMail(user.email, subject, html);
}
