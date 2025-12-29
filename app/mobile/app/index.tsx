import { View, ActivityIndicator } from 'react-native';

export default function Index() {
    return (
        <View className="flex-1 items-center justify-center bg-slate-900">
            <ActivityIndicator size="large" color="#f97316" />
        </View>
    );
}
