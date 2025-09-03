import { View, Text, Button } from 'react-native';
import { useAuth } from '@/src/stores/auth';
import { router } from 'expo-router';
import { AuthAPI } from '@/src/features/auth/api';

export default function Home() {
  const { user, logout } = useAuth();
  const doLogout = async () => {
    try { await AuthAPI.logout(); } catch {}
    await logout();
    router.replace('/(auth)/login');
  };
  return (
    <View style={{ flex:1, padding:16, justifyContent:'center', gap:12 }}>
      <Text style={{ fontSize:18 }}>Hola, {user?.nombre} 👋</Text>
      <Button title="Cerrar sesión" onPress={doLogout} />
    </View>
  );
}
