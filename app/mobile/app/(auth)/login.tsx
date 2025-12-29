
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import api from '../../lib/api';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            alert('Please enter email and password');
            return;
        }

        try {
            const response = await api.post('/api/auth/login', { email, password });

            // Backend returns { token, user, ... } NOT accessToken
            const { token, user } = response.data;

            if (!token) {
                throw new Error('Token missing in response');
            }

            await login(token, user);
        } catch (error: any) {
            console.error('Login failed', error);
            const url = api.defaults.baseURL + '/api/auth/login';
            alert(`Login Failed (404)\nTrying to reach:\n${url}\n\nCheck if Backend URL is correct.`);
        }
    };

    return (
        <View className="flex-1 justify-center px-8 bg-slate-900">
            <View className="mb-10">
                <Text className="text-3xl font-bold text-white text-center">RCM Mobile</Text>
                <Text className="text-slate-400 text-center mt-2">Login to your workspace</Text>
            </View>

            <View className="space-y-4">
                <View>
                    <Text className="text-slate-300 mb-2 font-medium">Email</Text>
                    <TextInput
                        className="w-full bg-slate-800 text-white rounded-lg p-4 border border-slate-700 focus:border-orange-500"
                        placeholder="admin@example.com"
                        placeholderTextColor="#64748b"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                    />
                </View>

                <View>
                    <Text className="text-slate-300 mb-2 font-medium">Password</Text>
                    <TextInput
                        className="w-full bg-slate-800 text-white rounded-lg p-4 border border-slate-700 focus:border-orange-500"
                        placeholder="••••••••"
                        placeholderTextColor="#64748b"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity
                    className="w-full bg-orange-600 p-4 rounded-lg mt-6"
                    onPress={handleLogin}
                >
                    <Text className="text-white text-center font-bold text-lg">Sign In</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
