// app/(perfil)/mis-resenas.tsx
import React from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, FlatList,
  RefreshControl, TouchableOpacity, Platform, Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "http://api-h1d7oi-a881cc-168-232-167-73.traefik.me/api/v1";
const TEAL = "#0ea5a4";

type Reserva = {
  id: string;
  status: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  cancha?: { id: string; name?: string | number };
  venue?: { id: string; name: string };
};

async function getToken() {
  try {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return (
        window.localStorage.getItem("token") ||
        window.localStorage.getItem("accessToken") ||
        window.localStorage.getItem("jwt") ||
        window.localStorage.getItem("access_token")
      );
    }
    const SecureStore = (await import("expo-secure-store")).default;
    return (
      (await SecureStore.getItemAsync("token")) ||
      (await SecureStore.getItemAsync("accessToken")) ||
      (await SecureStore.getItemAsync("jwt")) ||
      (await SecureStore.getItemAsync("access_token"))
    );
  } catch {
    return null;
  }
}

async function apiGet<T>(path: string): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(txt || `HTTP ${res.status}`);
  return txt ? JSON.parse(txt) : ({} as T);
}

async function fetchMisReservasConfirmadas(): Promise<Reserva[]> {
  const raw = await apiGet<any>("/reservas/mias");
  const list: any[] = Array.isArray(raw) ? raw : raw?.data ?? raw?.items ?? [];
  return list
    .map((r) => {
      const id = r.id ?? r.id_reserva ?? r.reserva_id;
      const estado = (r.estado ?? r.status ?? "").toString().toLowerCase();
      const fecha = r.fecha_reserva ?? r.fecha;
      const inicio = r.hora_inicio ?? r.inicio;
      const fin = r.hora_fin ?? r.fin;
      const canchaId = r?.cancha?.id ?? r.cancha_id ?? r.id_cancha ?? r?.cancha?.uuid ?? "";
      const canchaNombre = r?.cancha?.nombre ?? r.cancha_nombre ?? r.cancha ?? canchaId ?? "";
      const complejoNombre = r?.complejo?.nombre ?? r.complejo_nombre ?? r?.venue?.name ?? r.complejo ?? "Complejo";
      const complejoId = r?.complejo?.id ?? r.complejo_id ?? r?.venue?.id ?? r.id_complejo ?? "";
      return {
        id: String(id),
        status: String(estado),
        date: fecha,
        startTime: inicio,
        endTime: fin,
        cancha: { id: String(canchaId || ""), name: canchaNombre },
        venue: { id: String(complejoId || ""), name: complejoNombre },
      } as Reserva;
    })
    .filter((r) => ["confirmed", "confirmada"].includes((r.status || "").toLowerCase()));
}

async function fetchResenaPorReserva(idReserva: string) {
  const tryPaths = [
    `/resenas?id_reserva=${encodeURIComponent(idReserva)}`,
    `/resenas?reserva=${encodeURIComponent(idReserva)}`,
  ];
  for (const p of tryPaths) {
    try {
      const data: any = await apiGet(p);
      const arr: any[] = Array.isArray(data) ? data : data?.data ?? data?.items ?? [];
      if (arr.length > 0) {
        const first = arr[0];
        const id = first.id ?? first.id_resena ?? first.resena_id;
        const cal = first.calificacion ?? first.rating ?? 0;
        const com = first.comentario ?? first.comment ?? "";
        return { id_resena: String(id), calificacion: Number(cal), comentario: String(com) };
      }
    } catch { /* continúa */ }
  }
  return null;
}

export default function MisResenasScreen() {
  const router = useRouter();
  const [data, setData] = React.useState<Reserva[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [checking, setChecking] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const d = await fetchMisReservasConfirmadas();
      setData(d);
    } catch (e: any) {
      setError(e?.message || "Error al cargar");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);
      const d = await fetchMisReservasConfirmadas();
      setData(d);
    } catch (e: any) {
      setError(e?.message || "Error al actualizar");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(React.useCallback(() => { onRefresh(); }, [onRefresh]));
  React.useEffect(() => { load(); }, [load]);

  const irAResenar = async (r: Reserva) => {
    try {
      setChecking(r.id);
      const existente = await fetchResenaPorReserva(r.id);
      router.push({
        pathname: "/(resena)/resena",
        params: {
          reservationId: r.id,
          venueId: r.venue?.id ?? "",
          canchaId: r.cancha?.id ?? "",
          venueName: r.venue?.name ?? "Complejo",
          date: r.date ?? "",
          startTime: r.startTime ?? "",
          endTime: r.endTime ?? "",
          ...(existente ? {
            id_resena: existente.id_resena,
            current_rating: String(existente.calificacion),
            current_comment: existente.comentario,
          } : {}),
        },
      });
    } catch (e: any) {
      const m = e?.message ?? "No se pudo abrir la reseña.";
      if (Platform.OS === "web") window.alert(m); else Alert.alert("Error", m);
    } finally {
      setChecking(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 8 }}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis reseñas</Text>
      </View>

      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.centerMsg}>Cargando…</Text>
        </View>
      ) : error ? (
        <View style={[styles.center, { paddingHorizontal: 24 }]}>
          <Text style={{ fontSize: 16, fontWeight: "900", textAlign: "center", marginBottom: 6 }}>
            No se pudieron cargar tus reservas confirmadas
          </Text>
          <Text style={{ textAlign: "center", color: "#6b7280" }}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(r) => r.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 16 }}
          ListEmptyComponent={
            <View style={{ padding: 24 }}>
              <Text style={{ textAlign: "center", fontWeight: "900", fontSize: 16, marginBottom: 6 }}>
                Sin reservas confirmadas
              </Text>
              <Text style={{ textAlign: "center", color: "#6b7280" }}>
                Cuando tengas una reserva confirmada podrás dejar una reseña aquí.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={{ fontSize: 16, fontWeight: "900", color: "#0f172a" }} numberOfLines={1}>
                {item.venue?.name ?? "Complejo"}{item.cancha?.name ? ` • Cancha ${item.cancha.name}` : ""}
              </Text>
              <View style={{ flexDirection: "row", marginTop: 6 }}>
                <Ionicons name="calendar-outline" size={16} color={TEAL} />
                <Text style={styles.rowText}> {item.date ?? "—"}</Text>
                <View style={{ width: 10 }} />
                <Ionicons name="time-outline" size={16} color={TEAL} />
                <Text style={styles.rowText}> {[item.startTime, item.endTime].filter(Boolean).join(" - ") || "—"}</Text>
              </View>

              <TouchableOpacity
                style={[styles.btnPrimary, checking === item.id && { opacity: 0.6 }]}
                onPress={() => irAResenar(item)}
                disabled={!!checking}
              >
                {checking === item.id ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="create-outline" size={16} color="#fff" />
                    <Text style={styles.btnPrimaryText}>Reseñar / Editar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#0f172a" },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  rowText: { color: "#334155", fontSize: 14 },
  btnPrimary: {
    height: 44,
    borderRadius: 10,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },
  center: { justifyContent: "center", alignItems: "center", paddingVertical: 24 },
  centerMsg: { marginTop: 8, color: "#6b7280" },
});
