// app/(owner)/complejos.tsx  (ejemplo mínimo de lista)
import { useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { http } from '@/src/services/http';

export default function MisComplejos() {
  const [data, setData] = useState<any[]>([]);
  const [err, setErr] = useState<string|null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await http.get('/mis/complejos');
        setData(data?.items ?? data ?? []);
      } catch (e:any) {
        setErr(e?.response?.data?.detail ?? 'Error cargando');
      }
    })();
  }, []);

  if (err) return <Text style={{ color:'red', padding:16 }}>{err}</Text>;
  return (
    <View style={{ flex:1 }}>
      <FlatList
        data={data}
        keyExtractor={(it, idx)=> String(it.id_complejo ?? idx)}
        renderItem={({ item }) => (
          <View style={{ padding:16, borderBottomWidth:1 }}>
            <Text style={{ fontWeight:'600' }}>{item.nombre}</Text>
            <Text>{item.comuna}</Text>
          </View>
        )}
      />
    </View>
  );
}
