import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { useCanchas } from "@/src/features/canchas/hooks";
export default function Canchas(){
  const { data, isLoading } = useCanchas({ page:1, page_size:20 });
  if (isLoading) return <ActivityIndicator style={{marginTop:32}} />;
  return (
    <View style={{flex:1}}>
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(it)=>String(it.id_cancha)}
        renderItem={({item})=>(
          <View style={{padding:16,borderBottomWidth:1}}>
            <Text style={{fontWeight:"600"}}>{item.nombre}</Text>
            <Text>{item.deporte ?? "Deporte"}</Text>
          </View>
        )}
      />
    </View>
  );
}
