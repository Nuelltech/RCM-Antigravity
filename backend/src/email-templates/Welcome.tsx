import { Text, Section, Button, Container, Hr } from '@react-email/components';
import * as React from 'react';
import EmailLayout from './EmailLayout';

interface WelcomeEmailProps {
    userName: string;
    loginLink: string;
    trialEndDate: string;
}

const ORANGE = '#f97316';

export default function WelcomeEmail({
    userName,
    loginLink,
    trialEndDate
}: WelcomeEmailProps) {
    return (
        <EmailLayout>
            <Text style={heading}>Bem-vindo ao Restaurante Manager! 🚀</Text>

            <Text style={paragraph}>
                Olá <strong>{userName}</strong>,
            </Text>

            <Text style={paragraph}>
                A tua conta foi ativada com sucesso! Estamos muito contentes por te ter a bordo.
            </Text>

            <Section style={infoContainer}>
                <Text style={infoText}>
                    O teu período de teste gratuito do plano <strong>Standard</strong> está ativo até <strong>{trialEndDate}</strong>.
                </Text>
                <Text style={infoText}>
                    Aproveita para configurar o teu menu, importar faturas e explorar todas as funcionalidades sem compromisso.
                </Text>
            </Section>

            <Section style={btnContainer}>
                <Button style={button} href={loginLink}>
                    Aceder à Minha Conta
                </Button>
            </Section>

            <Hr style={hr} />

            <Text style={paragraph}>
                <strong>Primeiros passos sugeridos:</strong>
            </Text>

            <Text style={listItem}>1. Configura os dados do teu restaurante</Text>
            <Text style={listItem}>2. Cria ou importa os teus produtos e receitas</Text>
            <Text style={listItem}>3. Começa a lançar faturas para veres os teus custos em tempo real</Text>

            <Text style={paragraph}>
                Se tiveres alguma dúvida, responde a este email. Estamos aqui para ajudar!
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

const infoContainer = {
    backgroundColor: '#fff7ed', // Amber/Orange tint
    borderLeft: `4px solid ${ORANGE}`,
    borderRadius: '4px',
    padding: '16px',
    margin: '20px 0',
};

const infoText = {
    ...paragraph,
    margin: '4px 0',
    fontSize: '15px'
};

const btnContainer = {
    textAlign: 'center' as const,
    margin: '32px 0',
};

const button = {
    backgroundColor: ORANGE,
    borderRadius: '8px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 24px',
};

const hr = {
    borderColor: '#e2e8f0',
    margin: '24px 0',
};

const listItem = {
    ...paragraph,
    margin: '8px 0 8px 12px',
};
