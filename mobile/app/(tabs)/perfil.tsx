import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { useAuth } from '@/src/stores/auth';
import { AuthAPI } from '@/src/features/features/auth/api';
import { Link } from 'expo-router';

export default function Perfil() {
  const { user, setUser } = useAuth(); // 👈 usa setUser
  const [nombre, setNombre] = useState(user?.nombre ?? '');
  const [apellido, setApellido] = useState(user?.apellido ?? '');
  const [telefono, setTelefono] = useState(user?.telefono ?? '');

  useEffect(() => {
    (async () => {
      try {
        const me = await AuthAPI.me();
        await setUser(me);                          // 👈 ACTUALIZA SOLO EL PERFIL
        setNombre(me.nombre);
        setApellido(me.apellido ?? '');
        setTelefono(me.telefono ?? '');
      } catch {}
    })();
  }, []);

  const onGuardar = async () => {
    try {
      const me = await AuthAPI.updateMe({ nombre, apellido, telefono });
      await setUser(me);                            // 👈 NO toques el token
      Alert.alert('Listo', 'Perfil actualizado');
    } catch (e:any) {
      Alert.alert('Error', e?.response?.data?.detail ?? 'No se pudo actualizar');
    }
  };

  return (
    <View style={{ flex:1, padding:16, gap:12 }}>
      <Text style={{ fontSize:20, fontWeight:'700' }}>Mi perfil</Text>
      <Text>Rol: {user?.rol}</Text>

      <Text>Nombre</Text>
      <TextInput value={nombre} onChangeText={setNombre} style={{ borderWidth:1, borderRadius:8, padding:10 }} />

      <Text>Apellido</Text>
      <TextInput value={apellido} onChangeText={setApellido} style={{ borderWidth:1, borderRadius:8, padding:10 }} />

      <Text>Teléfono</Text>
      <TextInput value={telefono ?? ''} onChangeText={setTelefono} keyboardType="phone-pad" style={{ borderWidth:1, borderRadius:8, padding:10 }} />

      <Button title="Guardar" onPress={onGuardar} />

      {(user?.rol === 'owner' || user?.rol === 'admin' || user?.rol === 'superadmin') && (
        <View style={{ marginTop:24, gap:8 }}>
          <Text style={{ fontWeight:'600' }}>Panel de gestión</Text>
          <Link href="/(owner)/complejos">Ir a mis complejos →</Link>
        </View>
      )}
      {(user?.rol === 'admin' || user?.rol === 'superadmin') && (
        <View style={{ marginTop:8 }}>
          <Link href="/(admin)/usuarios">Ir a administración →</Link>
        </View>
      )}
    </View>
  );
}
