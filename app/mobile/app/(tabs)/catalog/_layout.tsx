import { Stack } from 'expo-router';

export default function CatalogLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="details/combo/[id]" />
            <Stack.Screen name="details/menu/[id]" />
            <Stack.Screen name="details/product/[id]" />
            <Stack.Screen name="details/recipe/[id]" />
            <Stack.Screen name="alerts" />
        </Stack>
    );
}
