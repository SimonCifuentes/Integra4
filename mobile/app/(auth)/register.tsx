// app/(auth)/register.tsx
import { useState } from 'react';
import { View, TextInput, Button, Text, ActivityIndicator } from 'react-native';
import { useRegister } from '../../src/features/features/auth/hooks';
import { router } from 'expo-router';

export default function RegisterScreen() {
  const [nombre,   setNombre]   = useState('');
  const [apellido, setApellido] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);

  const register = useRegister();

  const onSubmit = async () => {
  if (register.isPending) return; // evita doble submit
  setError(null);
  try {
    await register.mutateAsync({ nombre, apellido, email, password });
    router.replace('/(auth)/login'); // después de registrarse, va al login
  } catch (e: any) {
    // Imprime todo el error en consola para depurar
    console.log("Error de registro completo:", e);

    // Si la respuesta tiene un detalle específico del backend, úsalo
    const msg = e?.response?.data?.detail || e?.message || 'No se pudo registrar el usuario.';
    setError(msg);
  }
};


  return (
    <View style={{ flex:1, padding:16, justifyContent:'center', gap:12 }}>
      <Text style={{ fontSize:22, fontWeight:'600' }}>Crear cuenta</Text>

      <TextInput
        placeholder="Nombre"
        value={nombre}
        onChangeText={setNombre}
        style={{ borderWidth:1, borderRadius:8, padding:12 }}
      />

      <TextInput
        placeholder="Apellido"
        value={apellido}
        onChangeText={setApellido}
        style={{ borderWidth:1, borderRadius:8, padding:12 }}
      />

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

      {register.isPending && (
        <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
          <ActivityIndicator />
          <Text>Registrando…</Text>
        </View>
      )}

      <Button
        title={register.isPending ? 'Registrando…' : 'Registrarse'}
        onPress={onSubmit}
        disabled={register.isPending}
      />
    </View>
  );
}
