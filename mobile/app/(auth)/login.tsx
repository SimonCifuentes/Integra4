// app/(auth)/login.tsx
import { useState } from 'react';
import { View, TextInput, Button, Text, ActivityIndicator } from 'react-native';
import { useLogin } from '../../src/features/features/auth/hooks';
// filepath: c:\Users\nachi\OneDrive\Documentos\GitHub\Integra4\mobile\app\(auth)\login.tsx
import { useAuth } from '../../src/stores/auth';
import { router } from 'expo-router';
import { Link } from 'expo-router';

export default function LoginScreen() {
  const [email,    setEmail]    = useState('demo@demo.cl');
  const [password, setPassword] = useState('demo123');
  const [error,    setError]    = useState<string | null>(null);

  const login = useLogin(); // TanStack v5: isPending / isSuccess / isError
  const setSession = useAuth(s => s.setSession);

  const onSubmit = async () => {
    if (login.isPending) return; // evita doble submit
    setError(null);
    try {
      const { access_token, user } = await login.mutateAsync({ email, password });
      await setSession(access_token, user);
      router.replace('/(tabs)');
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'No se pudo iniciar sesión.';
      setError(msg);
    }
  };

  return (
    <View style={{ flex:1, padding:16, justifyContent:'center', gap:12 }}>
      <Text style={{ fontSize:22, fontWeight:'600' }}>Iniciar sesión</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth:1, borderRadius:8, padding:12 }}
      />

      <TextInput
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth:1, borderRadius:8, padding:12 }}
      />

      {error && <Text style={{ color:'red' }}>{error}</Text>}

      {login.isPending ? (
        <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
          <ActivityIndicator />
          <Text>Ingresando…</Text>
        </View>
      ) : null}

      <Button
        title={login.isPending ? 'Ingresando…' : 'Entrar'}
        onPress={onSubmit}
        disabled={login.isPending}
      />
      <Link href='/(auth)/register' style={{ marginTop: 12 }}>
  ¿No tienes cuenta? Crea una aquí
</Link>
    </View>
  );
}
