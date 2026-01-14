import { View, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { router } from 'expo-router';
import api from '../../lib/api';
import { TextInput, Button } from '../../components/base';
import { theme } from '../../ui/theme';
import { spacing } from '../../ui/spacing';
import { typography } from '../../ui/typography';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            alert('Por favor, insira email e password');
            return;
        }

        try {
            setLoading(true);
            const response = await api.post('/api/auth/login', { email, password });

            // Backend returns { token, user, ... }
            const { token, user } = response.data;

            if (!token) {
                throw new Error('Token missing in response');
            }

            await login(token, user);

            // Redirect to dashboard after successful login
            router.replace('/(tabs)/dashboard');
        } catch (error: any) {
            console.error('Login failed', error);
            const url = api.defaults.baseURL + '/api/auth/login';
            alert(`Login Failed\nVerifique se o Backend está acessível:\n${url}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.logo}>RCM Mobile</Text>
                    <Text style={styles.subtitle}>Faça login no seu workspace</Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <TextInput
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        placeholder="admin@example.com"
                        keyboardType="email-address"
                        style={styles.input}
                    />

                    <TextInput
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        placeholder="••••••••"
                        secureTextEntry
                        style={styles.input}
                    />

                    <Button
                        onPress={handleLogin}
                        loading={loading}
                        disabled={loading}
                        style={styles.loginButton}
                    >
                        Entrar
                    </Button>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.backgroundDark,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    header: {
        marginBottom: spacing.xxl,
    },
    logo: {
        ...typography.h1,
        color: theme.colors.textInverse,
        textAlign: 'center',
    },
    subtitle: {
        color: theme.colors.textLight,
        textAlign: 'center',
        marginTop: spacing.sm,
        fontSize: 14,
    },
    form: {
        gap: spacing.md,
    },
    input: {
        marginBottom: spacing.sm,
    },
    loginButton: {
        marginTop: spacing.lg,
    },
});
