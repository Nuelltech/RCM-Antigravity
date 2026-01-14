import { Stack } from 'expo-router';

export default function FinancialLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="invoices/index" />
            <Stack.Screen name="invoices/[id]" />
            <Stack.Screen name="invoices/match/[lineId]" />
        </Stack>
    );
}
