import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { PaperProvider } from 'react-native-paper';
import { paperTheme } from '../ui/theme';
import { ProtectedRouteWrapper } from '../lib/protected-route';

export default function RootLayout() {
  const { checkSession, isAuthenticated } = useAuth();

  useEffect(() => {
    checkSession();
  }, []);

  return (
    <PaperProvider theme={paperTheme}>
      <ProtectedRouteWrapper>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
        </Stack>
      </ProtectedRouteWrapper>
      <StatusBar style="light" />
    </PaperProvider>
  );
}
