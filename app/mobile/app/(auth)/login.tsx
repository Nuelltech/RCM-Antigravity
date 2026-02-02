import { View, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { useState, useEffect } from 'react';
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
    const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
    const { login } = useAuth();

    // Check biometric availability on mount
    useEffect(() => {
        const checkBiometric = async () => {
            // Dynamically import to avoid crash if package not installed
            try {
                const { BiometricService } = require('../../services/biometric.service');
                const available = await BiometricService.isAvailable();
                const credentials = await BiometricService.getCredentials();
                setIsBiometricAvailable(available && !!credentials);
            } catch (e) {
                console.log('Biometric check skipped (module likely missing)');
            }
        };
        checkBiometric();
    }, []);

    const handleBiometricLogin = async () => {
        try {
            setLoading(true);
            const { BiometricService } = require('../../services/biometric.service');
            const success = await BiometricService.authenticate();

            if (success) {
                const credentials = await BiometricService.getCredentials();
                if (credentials) {
                    await login(credentials.token, credentials.user);
                    router.replace('/(tabs)/dashboard');
                    return;
                }
            }
        } catch (e) {
            alert('Falha no login biométrico');
        } finally {
            setLoading(false);
        }
    };

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

            // Save for future biometric login
            try {
                const { BiometricService } = require('../../services/biometric.service');
                if (await BiometricService.isAvailable()) {
                    await BiometricService.saveCredentials(email, token, user);
                }
            } catch (e) {
                // Ignore if biometric service not available
            }

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
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../assets/images/RCM_Short_logo_1000_Laranja-cutout_1x1.png')}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                    </View>
                    <Text style={styles.appTitle}>Restaurant Cost Management</Text>
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

                    {isBiometricAvailable && (
                        <Button
                            mode="text"
                            onPress={handleBiometricLogin}
                            disabled={loading}
                            style={styles.bioButton}
                            icon="fingerprint"
                        >
                            Entrar com Biometria
                        </Button>
                    )}
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
    logoContainer: {
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    logoImage: {
        width: 100,
        height: 100,
    },
    appTitle: {
        ...typography.h2,
        color: theme.colors.textInverse,
        textAlign: 'center',
        fontWeight: 'bold',
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
    bioButton: {
        marginTop: spacing.sm,
    },
});
