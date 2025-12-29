import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Home, LayoutList, BarChart3 } from 'lucide-react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#0f172a', // Slate-900
                    borderTopColor: '#334155', // Slate-700
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: '#f97316', // Orange-500
                tabBarInactiveTintColor: '#94a3b8', // Slate-400
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '500',
                },
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="catalog"
                options={{
                    title: 'Catalog',
                    tabBarIcon: ({ color, size }) => <LayoutList color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="financial"
                options={{
                    title: 'Finance',
                    tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />,
                }}
            />
        </Tabs>
    );
}
