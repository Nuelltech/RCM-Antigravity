import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import ResetPasswordEmail from '../email-templates/ResetPassword';
import VerifyAccountEmail from '../email-templates/VerifyAccount';
import ForgotPasswordEmail from '../email-templates/ForgotPassword';
import UserInvite from '../email-templates/UserInvite';

// SMTP Configuration (Hostinger)
const smtpPort = parseInt(process.env.SMTP_PORT || '465');
const isSecure = smtpPort === 465; // Use SSL for port 465, STARTTLS for 587

console.log('📧 SMTP Configuration:', {
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: isSecure,
    user: process.env.SMTP_USER || 'NOT SET',
    passSet: !!process.env.SMTP_PASS
});

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: smtpPort,
    secure: isSecure, // false for 587
    requireTLS: !isSecure, // true for 587 (Hostinger recommendation)
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        ciphers: 'SSLv3',
        servername: process.env.SMTP_HOST || 'smtp.hostinger.com', // Crucial for cloud environments
    },
});

const FROM_EMAIL = process.env.EMAIL_FROM_ADDRESS || 'info@nuelltech.com';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Restaurante Manager';

export interface EmailUser {
    email: string;
    name: string;
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(user: EmailUser, resetToken: string): Promise<void> {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    try {
        // Render React Email template to HTML
        const emailHtml = render(
            ResetPasswordEmail({
                userName: user.name,
                resetLink,
                expiresInMinutes: 60
            })
        );

        // Send email via SMTP
        const info = await transporter.sendMail({
            from: `${FROM_NAME} <${FROM_EMAIL}>`,
            to: user.email,
            subject: 'Recuperar Password - Restaurante Manager',
            html: emailHtml,
        });

        console.log('Password reset email sent:', info.messageId);
    } catch (error: any) {
        console.error('Email service error:', error);
        throw new Error(`Failed to send password reset email: ${error.message}`);
    }
}

/**
 * Send email verification code
 */
export async function sendVerificationCode(user: EmailUser, code: string): Promise<void> {
    try {
        // Render React Email template to HTML
        const emailHtml = render(
            VerifyAccountEmail({
                userName: user.name,
                verificationCode: code,
                expiresInMinutes: 15
            })
        );

        // Plain text fallback
        const emailText = `Olá ${user.name},

Obrigado por te registares no Restaurante Manager!

Código de verificação: ${code}

Este código expira em 15 minutos.

Introduz este código na aplicação para verificar o teu email e ativar a conta.

Se não criaste esta conta, podes ignorar este email.

© ${new Date().getFullYear()} Restaurante Manager`;

        // Send email via SMTP
        const info = await transporter.sendMail({
            from: `${FROM_NAME} <${FROM_EMAIL}>`,
            to: user.email,
            subject: 'Código de Verificação - Restaurante Manager',
            html: emailHtml,
            text: emailText,
        });

        console.log('Verification email sent:', info.messageId);
    } catch (error: any) {
        console.error('Email service error:', error);
        throw new Error(`Failed to send verification email: ${error.message}`);
    }
}

/**
 * Send password recovery email with verification code
 */
export async function sendForgotPassword(user: EmailUser, code: string): Promise<void> {
    try {
        // Render React Email template to HTML
        const emailHtml = render(
            ForgotPasswordEmail({
                userName: user.name,
                verificationCode: code,
                expiresInMinutes: 15
            })
        );

        // Plain text fallback
        const emailText = `Olá ${user.name},

Recebemos um pedido para redefinir a password da tua conta no Restaurante Manager.

Código de verificação: ${code}

Este código expira em 15 minutos.

Se não pediste para redefinir a password, podes ignorar este email.

© ${new Date().getFullYear()} Restaurante Manager`;

        // Send email via SMTP
        const info = await transporter.sendMail({
            from: `${FROM_NAME} <${FROM_EMAIL}>`,
            to: user.email,
            subject: 'Recuperar Password - Restaurante Manager',
            html: emailHtml,
            text: emailText,
        });

        console.log('Forgot password email sent:', info.messageId);
    } catch (error: any) {
        console.error('Email service error:', error);
        throw new Error(`Failed to send forgot password email: ${error.message}`);
    }
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

    console.log('🔗 [EMAIL DEBUG] FRONTEND_URL:', process.env.FRONTEND_URL);
    console.log('🔗 [EMAIL DEBUG] Generated invite link:', inviteLink);

    try {
        // Render React Email template to HTML
        const emailHtml = render(
            UserInvite({
                userName: user.name,
                restaurantName,
                inviteLink,
            })
        );

        // Generate plain text version
        const emailText = `
Bem-vindo, ${user.name}!

Foi convidado para aceder ao sistema de gestão do restaurante ${restaurantName}.

Para aceitar o convite e definir a sua password, aceda ao seguinte link:
${inviteLink}

Este convite é válido por 7 dias.

---
© ${new Date().getFullYear()} Nuelltech RCM. Todos os direitos reservados.
Se não solicitou este convite, pode ignorar este email.
        `;

        // Send email via SMTP
        const info = await transporter.sendMail({
            from: `${FROM_NAME} <${FROM_EMAIL}>`,
            to: user.email,
            subject: `Convite para ${restaurantName} - Restaurante Manager`,
            html: emailHtml,
            text: emailText,
        });

        console.log('User invite email sent:', info.messageId);
    } catch (error: any) {
        console.error('Email service error:', error);
        throw new Error(`Failed to send user invite email: ${error.message}`);
    }
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

