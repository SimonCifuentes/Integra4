// app/(tabs)/complejos/[id].tsx
import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { http } from "@/src/services/http";

type Cancha = {
  id_cancha: number;
  id_complejo: number;
  nombre: string;
  deporte: string;
  superficie: string;
  capacidad: number;
  iluminacion: boolean;
  techada: boolean;
  esta_activa: boolean;
};

// --- API ---
async function fetchCanchasPorComplejo(idNum: number): Promise<Cancha[]> {
  const { data } = await http.get(`/complejos/${idNum}/canchas`);
  return Array.isArray(data) ? data : [];
}

export default function CanchasDeComplejoScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const idNum = Number(id);

  const {
    data: canchas,
    isLoading,
    isError,
    refetch,
    isRefetching,
    error,
  } = useQuery({
    queryKey: ["canchas-complejo", idNum],
    queryFn: () => fetchCanchasPorComplejo(idNum),
    enabled: Number.isFinite(idNum),
    retry: 1,
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // 🧱 Estados base
  if (!Number.isFinite(idNum)) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle" size={28} color="#ef4444" />
        <Text style={styles.error}>ID de complejo inválido.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryTxt}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Cargando canchas...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle" size={28} color="#ef4444" />
        <Text style={styles.error}>
          {(error as any)?.message ?? "No se pudieron cargar las canchas."}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
          <Text style={styles.retryTxt}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={canchas ?? []}
      keyExtractor={(item) => String(item.id_cancha)}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
      contentContainerStyle={{ padding: 16 }}
      ListHeaderComponent={
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Canchas del complejo</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="football-outline" size={20} color="#0ea5a4" />
            <Text style={styles.cardTitle}>{item.nombre}</Text>
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.text}>🏅 Deporte: {item.deporte}</Text>
            <Text style={styles.text}>🧱 Superficie: {item.superficie}</Text>
            <Text style={styles.text}>👥 Capacidad: {item.capacidad}</Text>
            <Text style={styles.text}>
              💡 Iluminación: {item.iluminacion ? "Sí" : "No"}
            </Text>
            <Text style={styles.text}>
              🏠 Techada: {item.techada ? "Sí" : "No"}
            </Text>
            <Text style={styles.text}>
              🔘 Estado: {item.esta_activa ? "Activa" : "Inactiva"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() =>
              router.push({
                pathname: "/reservar",
                params: { canchaId: String(item.id_cancha) },
              })
            }
          >
            <Ionicons name="calendar-outline" size={16} color="#fff" />
            <Text style={styles.btnPrimaryTxt}>Reservar cancha</Text>
          </TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.muted}>
            No hay canchas registradas para este complejo.
          </Text>
        </View>
      }
    />
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  muted: { color: "#6b7280", textAlign: "center", marginTop: 8 },
  error: { color: "#ef4444", textAlign: "center" },
  retryBtn: {
    marginTop: 10,
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryTxt: { color: "#fff", fontWeight: "600" },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#efefef",
    marginRight: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    elevation: 1,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  cardBody: { marginBottom: 10 },
  text: { color: "#374151", marginBottom: 4 },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0ea5a4",
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnPrimaryTxt: { color: "#fff", fontWeight: "700", marginLeft: 6 },
});
