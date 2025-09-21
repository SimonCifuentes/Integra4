import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useMisReservas, useCancelarReserva } from "@/src/features/reservas/hooks";

export default function MisReservas() {
  const { data, isLoading, error, refetch, isRefetching } = useMisReservas();
  const cancelar = useCancelarReserva();

  const onCancelar = (id: number) => {
    Alert.alert(
      "Cancelar reserva",
      "¿Seguro que quieres cancelar esta reserva?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Sí, cancelar",
          style: "destructive",
          onPress: () =>
            cancelar.mutate(id, {
              onError: () => Alert.alert("Error", "No se pudo cancelar la reserva"),
            }),
        },
      ]
    );
  };

  if (isLoading) {
    return <ActivityIndicator style={{ marginTop: 24 }} />;
  }

  if (error) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>Mis reservas</Text>
        <Text style={{ color: "#a00" }}>Ocurrió un error al cargar tus reservas.</Text>
        <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: "#eee" }}>
          <Text style={{ textAlign: "center" }}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const items = data ?? [];

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>Mis reservas</Text>

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id_reserva)}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          <Text style={{ opacity: 0.7 }}>Aún no tienes reservas.</Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: "#fff",
              marginBottom: 10,
              // Sombra simple cross-platform
              shadowColor: "#000",
              shadowOpacity: 0.08,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
            }}
          >
            <Text style={{ fontWeight: "600" }}>Cancha #{item.id_cancha}</Text>
            <Text>{item.fecha_reserva} · {item.hora_inicio} - {item.hora_fin}</Text>
            <Text style={{ marginTop: 4, opacity: 0.7 }}>Estado: {item.estado}</Text>

            {item.estado !== "cancelled" && (
              <TouchableOpacity
                onPress={() => onCancelar(item.id_reserva)}
                style={{ marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: "#fee" }}
                disabled={cancelar.isPending}
              >
                <Text style={{ color: "#a00", textAlign: "center" }}>
                  {cancelar.isPending ? "Cancelando..." : "Cancelar"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}
