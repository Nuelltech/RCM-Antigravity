import { Text, Button, Section } from '@react-email/components';
import * as React from 'react';
import EmailLayout from './EmailLayout';

interface ResetPasswordEmailProps {
    userName: string;
    resetLink: string;
    expiresInMinutes: number;
}

const ORANGE = '#f97316';

export default function ResetPasswordEmail({
    userName,
    resetLink,
    expiresInMinutes = 60
}: ResetPasswordEmailProps) {
    return (
        <EmailLayout>
            <Text style={heading}>Recuperar Password</Text>

            <Text style={paragraph}>
                Olá <strong>{userName}</strong>,
            </Text>

            <Text style={paragraph}>
                Recebemos um pedido para redefinir a password da tua conta no Restaurante Manager.
            </Text>

            <Text style={paragraph}>
                Clica no botão abaixo para criar uma nova password:
            </Text>

            <Section style={buttonContainer}>
                <Button href={resetLink} style={button}>
                    Redefinir Password
                </Button>
            </Section>

            <Text style={paragraph}>
                Ou copia e cola este link no teu navegador:
            </Text>

            <Text style={linkText}>
                {resetLink}
            </Text>

            <Text style={warningText}>
                ⚠️ Este link expira em <strong>{expiresInMinutes} minutos</strong>.
            </Text>

            <Text style={paragraph}>
                Se não pediste para redefinir a password, podes ignorar este email em segurança.
            </Text>
        </EmailLayout>
    );
}

// Styles
const heading = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#0f172a',
    margin: '0 0 16px 0',
};

const paragraph = {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#334155',
    margin: '12px 0',
};

const buttonContainer = {
    textAlign: 'center' as const,
    margin: '24px 0',
};

const button = {
    backgroundColor: ORANGE,
    color: '#ffffff',
    padding: '14px 32px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: '600',
    display: 'inline-block',
};

const linkText = {
    fontSize: '14px',
    color: '#64748b',
    wordBreak: 'break-all' as const,
    margin: '8px 0',
};

const warningText = {
    fontSize: '14px',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    padding: '12px',
    borderRadius: '6px',
    borderLeft: `4px solid #dc2626`,
    margin: '16px 0',
};
