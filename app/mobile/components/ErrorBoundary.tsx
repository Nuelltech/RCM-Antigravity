
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../ui/theme';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: any;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <ScrollView contentContainerStyle={styles.scroll}>
                        <Text style={styles.title}>💥 Ups! Algo correu mal.</Text>
                        <Text style={styles.subtitle}>Por favor envie um print disto:</Text>

                        <View style={styles.box}>
                            <Text style={styles.errorText}>
                                {this.state.error?.toString()}
                            </Text>
                        </View>

                        {this.state.errorInfo && (
                            <View style={styles.box}>
                                <Text style={styles.stackText}>
                                    {this.state.errorInfo.componentStack}
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => this.setState({ hasError: false })}
                        >
                            <Text style={styles.buttonText}>Tentar Novamente</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        paddingTop: 50,
    },
    scroll: {
        padding: 20,
    },
    title: {
        color: '#ef4444',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
        color: '#94a3b8',
        marginBottom: 20,
    },
    box: {
        backgroundColor: '#1e293b',
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
    },
    errorText: {
        color: '#f8fafc',
        fontFamily: 'monospace',
        fontSize: 14,
    },
    stackText: {
        color: '#cbd5e1',
        fontFamily: 'monospace',
        fontSize: 10,
    },
    button: {
        backgroundColor: '#3b82f6',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
    }
});
