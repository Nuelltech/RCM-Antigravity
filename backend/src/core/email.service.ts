import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { render } from '@react-email/render';
import ResetPasswordEmail from '../email-templates/ResetPassword';
import VerifyAccountEmail from '../email-templates/VerifyAccount';
import ForgotPasswordEmail from '../email-templates/ForgotPassword';
import UserInvite from '../email-templates/UserInvite';

// Configuration
const FROM_EMAIL = process.env.EMAIL_FROM_ADDRESS || 'info@nuelltech.com';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Restaurante Manager';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

// Log configuration status
console.log('📧 Email Service Configuration:', {
    provider: SENDGRID_API_KEY ? 'SendGrid API' : 'SMTP Fallback',
    sender: `${FROM_NAME} <${FROM_EMAIL}>`,
});

// Configure SendGrid if API key is present
if (SENDGRID_API_KEY) {
    sgMail.setApiKey(SENDGRID_API_KEY);
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
    try {
        if (SENDGRID_API_KEY) {
            await sgMail.send({
                to,
                from: `${FROM_NAME} <${FROM_EMAIL}>`, // Verified Sender
                subject,
                html,
                text,
            });
            console.log(`[SendGrid] Email sent to ${to}`);
        } else {
            const info = await transporter.sendMail({
                from: `${FROM_NAME} <${FROM_EMAIL}>`,
                to,
                subject,
                html,
                text,
            });
            console.log(`[SMTP] Email sent to ${to} (MessageID: ${info.messageId})`);
        }
    } catch (error: any) {
        console.error('Email sending failed:', error);
        if (error.response) {
            console.error('SendGrid Error Body:', error.response.body);
        }
        throw new Error(`Failed to send email: ${error.message}`);
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

    await sendMail(user.email, 'Recuperar Password - Restaurante Manager', emailHtml, emailText);
}

/**
 * Send user invite email
 */
export async function sendUserInvite(
    user: EmailUser,
    restaurantName: string,
    inviteToken: string
): Promise<void> {
    const inviteLink = `${process.env.FRONTEND_URL}/accept-invite?token=${inviteToken}`;

    console.log('🔗 [EMAIL DEBUG] Generated invite link:', inviteLink);

    const emailHtml = render(
        UserInvite({
            userName: user.name,
            restaurantName,
            inviteLink,
        })
    );

    const emailText = `Bem-vindo, ${user.name}!\n\nFoi convidado para aceder ao sistema de gestão do restaurante ${restaurantName}.\n\nLink: ${inviteLink}`;

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

