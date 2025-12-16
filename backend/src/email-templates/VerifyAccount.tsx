import { Text, Section } from '@react-email/components';
import * as React from 'react';
import EmailLayout from './EmailLayout';

interface VerifyAccountEmailProps {
    userName: string;
    verificationCode: string;
    expiresInMinutes: number;
}

const ORANGE = '#f97316';

export default function VerifyAccountEmail({
    userName,
    verificationCode,
    expiresInMinutes = 15
}: VerifyAccountEmailProps) {
    return (
        <EmailLayout>
            <Text style={heading}>Verificar Conta</Text>

            <Text style={paragraph}>
                Olá <strong>{userName}</strong>,
            </Text>

            <Text style={paragraph}>
                Obrigado por te registares no Restaurante Manager!
            </Text>

            <Text style={paragraph}>
                Para completar o registo e ativar a tua conta, usa o código de verificação abaixo:
            </Text>

            <Section style={codeContainer}>
                <Text style={code}>{verificationCode}</Text>
            </Section>

            <Text style={warningText}>
                ⏱️ Este código expira em <strong>{expiresInMinutes} minutos</strong>.
            </Text>

            <Text style={paragraph}>
                Introduz este código na aplicação para verificar o teu email e ativar a conta.
            </Text>

            <Text style={paragraph}>
                Se não criaste esta conta, podes ignorar este email em segurança.
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
    backgroundColor: '#f8fafc',
    border: `2px solid ${ORANGE}`,
    borderRadius: '8px',
    padding: '24px',
    margin: '24px 0',
    textAlign: 'center' as const,
};

const code = {
    fontSize: '36px',
    fontWeight: 'bold',
    color: ORANGE,
    letterSpacing: '8px',
    fontFamily: 'monospace',
    margin: '0',
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
