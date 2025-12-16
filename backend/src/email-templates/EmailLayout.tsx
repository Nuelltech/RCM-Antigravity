import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Text,
    Link,
    Hr,
} from '@react-email/components';
import * as React from 'react';

interface EmailLayoutProps {
    children: React.ReactNode;
}

const NAVY = '#0f172a';
const ORANGE = '#f97316';

export default function EmailLayout({ children }: EmailLayoutProps) {
    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    {/* Header */}
                    <Section style={header}>
                        <Text style={logoText}>
                            🍽️ Restaurante Manager
                        </Text>
                    </Section>

                    {/* Content */}
                    <Section style={content}>
                        {children}
                    </Section>

                    {/* Footer */}
                    <Hr style={divider} />
                    <Section style={footer}>
                        <Text style={footerText}>
                            © {new Date().getFullYear()} Restaurante Manager
                        </Text>
                        <Text style={footerText}>
                            Este é um email automático, por favor não responda.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

// Styles
const main = {
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
    margin: '0 auto',
    padding: '20px 0',
    maxWidth: '600px',
};

const header = {
    backgroundColor: NAVY,
    padding: '24px',
    borderRadius: '8px 8px 0 0',
};

const logoText = {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0',
    textAlign: 'center' as const,
};

const content = {
    backgroundColor: '#ffffff',
    padding: '32px 24px',
    borderLeft: '1px solid #e2e8f0',
    borderRight: '1px solid #e2e8f0',
};

const divider = {
    borderColor: '#e2e8f0',
    margin: '0',
};

const footer = {
    backgroundColor: '#ffffff',
    padding: '20px 24px',
    borderRadius: '0 0 8px 8px',
    borderLeft: '1px solid #e2e8f0',
    borderRight: '1px solid #e2e8f0',
    borderBottom: '1px solid #e2e8f0',
};

const footerText = {
    color: '#64748b',
    fontSize: '12px',
    margin: '4px 0',
    textAlign: 'center' as const,
};
