import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { PaperProvider } from 'react-native-paper';
import { paperTheme } from '../ui/theme';
import { ProtectedRouteWrapper } from '../lib/protected-route';
import { ErrorBoundary } from '../components/ErrorBoundary';

import { usePushNotifications } from '../hooks/usePushNotifications';

export default function RootLayout() {
  const { checkSession, isAuthenticated } = useAuth();
  usePushNotifications();

  useEffect(() => {
    checkSession();
  }, []);

  return (
    <PaperProvider theme={paperTheme}>
      <ErrorBoundary>
        <ProtectedRouteWrapper>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
          </Stack>
        </ProtectedRouteWrapper>
      </ErrorBoundary>
      <StatusBar style="light" />
    </PaperProvider>
  );
}
