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

/**
 * Send warning that trial is expiring soon (3 days)
 */
export async function sendTrialExpiringEmail(
    user: EmailUser,
    daysRemaining: number,
    expiryDate: Date
): Promise<void> {
    const formattedDate = expiryDate.toLocaleDateString('pt-PT');
    const subject = `⚠️ O teu período de teste termina em ${daysRemaining} dias`;
    const html = `<p>Olá ${user.name},</p><p>Aviso que o teu período de teste termina no dia <strong>${formattedDate}</strong>.</p><p>Para garantir que não perdes acesso, subscreve um plano agora.</p>`;
    // TODO: Create React Template

    await sendMail(user.email, subject, html);
}

/**
 * Send notification that account is suspended
 */
export async function sendAccountSuspendedEmail(
    user: EmailUser
): Promise<void> {
    const subject = `🚫 Conta Suspensa - Ação Necessária`;
    const html = `<p>Olá ${user.name},</p><p>O teu período de teste expirou há mais de 3 dias e a tua conta foi suspensa.</p><p>Para recuperar o acesso aos teus dados, por favor renova a tua subscrição.</p>`;

    await sendMail(user.email, subject, html);
}

