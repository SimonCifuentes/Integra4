import React, { useState } from "react";
import { View, Text, FlatList, ActivityIndicator, Button } from "react-native";
import { useCanchas } from '../../src/features/features/canchas/hooks';
import ReservaModal from "../../src/components/ReservaModal";

export default function Canchas(){
  const { data, isLoading } = useCanchas({ page:1, page_size:20 });
  const [selectedCancha, setSelectedCancha] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openReserva = (cancha: any) => {
    setSelectedCancha(cancha);
    setModalVisible(true);
  };

  // Este será el onSubmit que le pasamos al modal
  const handleReservaSubmit = async (reservaData: { fecha: string; horaInicio: string; horaFin: string; canchaId?: string | number }) => {
    // Combinar con selectedCancha si canchaId no fue ingresado manualmente
    const idCancha = reservaData.canchaId ?? selectedCancha?.id_cancha ?? selectedCancha?.id;

    const payload = {
      id_cancha: Number(idCancha),
      inicio: `${reservaData.fecha}T${reservaData.horaInicio}:00`, // ajusta zona horaria si hace falta
      fin: `${reservaData.fecha}T${reservaData.horaFin}:00`,
    };

    console.log("POST /reservas payload:", payload);

    // Aquí puedes hacer el POST al backend, por ejemplo:
    // await fetch(`${API_URL}/reservas`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    //   body: JSON.stringify(payload)
    // });

    setModalVisible(false);
  };

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
            <Button title="Reservar" onPress={() => openReserva(item)} />
          </View>
        )}
      />

      <ReservaModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        cancha={selectedCancha}
        onSubmit={handleReservaSubmit}
      />
    </View>
  );
}
