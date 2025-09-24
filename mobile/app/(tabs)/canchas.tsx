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

function EmptyState({ text }:{ text:string }) {
  return (
    <View style={{ padding: 24, alignItems: "center" }}>
      <Text style={{ color: "#6b7280" }}>{text}</Text>
    </View>
  );
}

function formatCLP(n?: number | null) {
  if (typeof n !== "number") return "";
  try { return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n); }
  catch { return `$${n.toLocaleString("es-CL")}`; }
}

// ----- estilos -----
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
    backgroundColor: "#0d9488",
  },
  title: { color: "white", fontSize: 20, fontWeight: "800" },

  segment: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  segmentActive: { backgroundColor: "#ffffff" },
  segmentText: { color: "white", fontWeight: "700" },
  segmentTextActive: { color: "#0d9488" },

  searchWrap: {
    marginTop: 12, marginBottom: 8,
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb",
    paddingHorizontal: 12, borderRadius: 12, height: 46,
  },

  filtersRow: {
    paddingHorizontal: 16, marginTop: 4, marginBottom: 8,
    flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap",
  },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb",
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999,
  },
  chipActive: { borderColor: "#99f6e4", backgroundColor: "#ecfeff" },
  chipText: { color: "#334155", fontWeight: "600" },
  chipTextActive: { color: "#0ea5a4" },

  card: {
    borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff",
    borderRadius: 12, padding: 14,
  },
  roundIcon: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: "#ecfeff",
    alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontWeight: "800", fontSize: 16 },
  cardSub: { color: "#6b7280", marginTop: 2 },

  cardActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  btnPrimary: {
    flex: 1, height: 44, borderRadius: 10,
    backgroundColor: "#0ea5a4", alignItems: "center", justifyContent: "center",
  },
  btnOutline: {
    flex: 1, height: 44, borderRadius: 10,
    borderWidth: 1, borderColor: "#99f6e4",
    backgroundColor: "#ecfeff", alignItems: "center", justifyContent: "center",
  },
});
