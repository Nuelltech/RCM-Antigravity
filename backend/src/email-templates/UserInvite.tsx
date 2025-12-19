import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Preview,
    Section,
    Text,
} from '@react-email/components';
import * as React from 'react';

interface UserInviteProps {
    userName: string;
    restaurantName: string;
    inviteLink: string;
}

export default function UserInvite({
    userName,
    restaurantName,
    inviteLink,
}: UserInviteProps) {
    return (
        <Html>
            <Head />
            <Preview>Convite para {restaurantName} - Restaurante Manager</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>Bem-vindo, {userName}!</Heading>

                    <Text style={text}>
                        Foi convidado para aceder ao sistema de gestão do restaurante{' '}
                        <strong>{restaurantName}</strong>.
                    </Text>

                    <Text style={text}>
                        O <strong>Restaurante Manager</strong> é uma plataforma completa para gestão de
                        custos, receitas, inventário e vendas do seu restaurante.
                    </Text>

                    <Section style={buttonContainer}>
                        <Button style={button} href={inviteLink}>
                            Aceitar Convite
                        </Button>
                    </Section>

                    <Text style={text}>
                        Este convite é válido por <strong>7 dias</strong>.
                    </Text>

                    <Text style={text}>
                        Após aceitar o convite, poderá definir a sua password e começar a usar a plataforma.
                    </Text>

                    <Hr style={hr} />

                    <Text style={footer}>
                        Se não solicitou este convite, pode ignorar este email com segurança.
                    </Text>

                    <Text style={footer}>
                        © {new Date().getFullYear()} Restaurante Manager. Todos os direitos reservados.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
}

// Styles
const main = {
    backgroundColor: '#f6f9fc',
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
};

const h1 = {
    color: '#0f172a',
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '40px 0',
    padding: '0 40px',
    textAlign: 'center' as const,
};

const text = {
    color: '#374151',
    fontSize: '16px',
    lineHeight: '26px',
    padding: '0 40px',
    marginBottom: '12px',
};

const buttonContainer = {
    padding: '27px 0 27px',
    textAlign: 'center' as const,
};

const button = {
    backgroundColor: '#f97316',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 40px',
};

const hr = {
    borderColor: '#e5e7eb',
    margin: '26px 0',
};

const footer = {
    color: '#9ca3af',
    fontSize: '14px',
    lineHeight: '24px',
    padding: '0 40px',
    textAlign: 'center' as const,
};
