import { Text, Section } from '@react-email/components';
import * as React from 'react';
import EmailLayout from './EmailLayout';

interface ForgotPasswordEmailProps {
    userName: string;
    verificationCode: string;
    expiresInMinutes: number;
}

const ORANGE = '#f97316';

export default function ForgotPasswordEmail({
    userName,
    verificationCode,
    expiresInMinutes = 15
}: ForgotPasswordEmailProps) {
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
                Usa o código abaixo para criar uma nova password:
            </Text>

            <Section style={codeContainer}>
                <Text style={codeText}>{verificationCode}</Text>
            </Section>

            <Text style={paragraph}>
                Introduz este código na aplicação para recuperar a tua password.
            </Text>

            <Text style={warningText}>
                ⏱️ Este código expira em <strong>{expiresInMinutes} minutos</strong>.
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

const codeContainer = {
    textAlign: 'center' as const,
    margin: '32px 0',
    padding: '24px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: `2px solid ${ORANGE}`,
};

const codeText = {
    fontSize: '36px',
    fontWeight: 'bold',
    color: ORANGE,
    letterSpacing: '8px',
    margin: '0',
    fontFamily: 'monospace',
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
