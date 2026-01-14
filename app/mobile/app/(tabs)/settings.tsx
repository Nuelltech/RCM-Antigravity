import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, List, Divider } from 'react-native-paper';
import { useAuth } from '../../lib/auth';
import { useRouter } from 'expo-router';
import { Button } from '../../components/base';
import { theme } from '../../ui/theme';
import { spacing } from '../../ui/spacing';
import { typography } from '../../ui/typography';

export default function SettingsScreen() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.replace('/(auth)/login');
    };

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Definições</Text>
                <Text style={styles.subtitle}>Gerir conta e aplicação</Text>
            </View>

            {/* User Info */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>CONTA</Text>
                <Card style={styles.card}>
                    <List.Item
                        title="Nome"
                        description={user?.name || 'N/A'}
                        titleStyle={styles.listTitle}
                        descriptionStyle={styles.listDescription}
                    />
                    <Divider />
                    <List.Item
                        title="Email"
                        description={user?.email || 'N/A'}
                        titleStyle={styles.listTitle}
                        descriptionStyle={styles.listDescription}
                    />
                    <Divider />
                    <List.Item
                        title="Cargo"
                        description={user?.role || 'N/A'}
                        titleStyle={styles.listTitle}
                        descriptionStyle={styles.listDescription}
                    />
                </Card>
            </View>

            {/* App Info */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>APLICAÇÃO</Text>
                <Card style={styles.card}>
                    <List.Item
                        title="Versão"
                        description="1.0.0"
                        titleStyle={styles.listTitle}
                        descriptionStyle={styles.listDescription}
                    />
                    <Divider />
                    <List.Item
                        title="Build"
                        description="SDK 52"
                        titleStyle={styles.listTitle}
                        descriptionStyle={styles.listDescription}
                    />
                </Card>
            </View>

            {/* Logout Button */}
            <View style={styles.section}>
                <Button
                    onPress={handleLogout}
                    style={styles.logoutButton}
                >
                    Terminar Sessão
                </Button>
            </View>

            <View style={styles.bottomSpace} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.backgroundDark,
    },
    header: {
        padding: spacing.lg,
        paddingTop: 64,
        paddingBottom: spacing.md,
    },
    title: {
        ...typography.h1,
        color: theme.colors.textInverse,
    },
    subtitle: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    section: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: spacing.sm,
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: theme.colors.surfaceDark,
    },
    listTitle: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    listDescription: {
        color: theme.colors.textInverse,
        fontSize: 16,
        fontWeight: '500',
    },
    logoutButton: {
        backgroundColor: theme.colors.error,
    },
    bottomSpace: {
        height: 96,
    },
});
