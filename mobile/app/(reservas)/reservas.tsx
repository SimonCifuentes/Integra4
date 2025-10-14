﻿// app/(tabs)/reservas.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getItemAsync } from "expo-secure-store";

type Reserva = {
  id: string;
  status: "CONFIRMED" | "PENDING" | "CANCELLED" | "EXPIRED" | string;
  date?: string;            // YYYY-MM-DD
  startTime?: string;       // HH:mm
  endTime?: string;         // HH:mm
  totalPrice?: number;
  cancha?: { id: string; name?: string | number };
  venue?: { id: string; name: string; address?: string };
};

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api/v1";
const TEAL = "#0ea5a4";

/* --- ✅ FIX: getToken multiplataforma (funciona en web y móvil) --- */
async function getToken() {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        return window.localStorage.getItem("accessToken");
      }
      return null;
    }
    return await getItemAsync("accessToken");
  } catch (err) {
    console.warn("Error obteniendo token:", err);
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("accessToken");
    }
    return null;
  }
}

/* --- Fetch de reservas propias --- */
async function fetchMisReservas(): Promise<Reserva[]> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/reservas/mias`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Error ${res.status}: ${txt || "No se pudieron cargar tus reservas"}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
}

/* --- Componente Pill de estado --- */
function EstadoPill({ estado }: { estado: Reserva["status"] }) {
  const key = (estado ?? "").toString().toLowerCase();
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    confirmed: { bg: "#dcfce7", fg: "#166534", label: "Confirmada" },
    pending: { bg: "#fef9c3", fg: "#713f12", label: "Pendiente" },
    cancelled: { bg: "#fee2e2", fg: "#991b1b", label: "Cancelada" },
    expired: { bg: "#e5e7eb", fg: "#374151", label: "Vencida" },
  };
  const sty = map[key] ?? { bg: "#e5e7eb", fg: "#374151", label: estado?.toString() || "—" };
  return (
    <View
      style={{
        backgroundColor: sty.bg,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
      }}
    >
      <Text style={{ color: sty.fg, fontWeight: "800" }}>{sty.label}</Text>
    </View>
  );
}

/* --- Formateador de CLP --- */
function CLP({ value }: { value?: number }) {
  if (typeof value !== "number") return null;
  return (
    <Text style={{ fontWeight: "800" }}>
      {Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      }).format(value)}
    </Text>
  );
}

/* --- Tarjeta individual de reserva --- */
function ItemReserva({ r, onPress }: { r: Reserva; onPress?: () => void }) {
  const titulo = `${r.venue?.name ?? "Complejo"}${
    r.cancha?.name ? ` • Cancha ${r.cancha.name}` : ""
  }`;
  const fecha = r.date ?? "—";
  const horario = [r.startTime, r.endTime].filter(Boolean).join(" - ") || "—";

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.card}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <Text
          style={{ fontSize: 16, fontWeight: "900", color: "#0f172a" }}
          numberOfLines={1}
        >
          {titulo}
        </Text>
        <EstadoPill estado={r.status} />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
        <Ionicons name="calendar-outline" size={16} color={TEAL} />
        <Text style={styles.rowText}> {fecha}</Text>
        <View style={{ width: 10 }} />
        <Ionicons name="time-outline" size={16} color={TEAL} />
        <Text style={styles.rowText}> {horario}</Text>
      </View>

      {typeof r.totalPrice === "number" ? (
        <View style={{ marginTop: 8 }}>
          <CLP value={r.totalPrice} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

/* --- Pantalla principal --- */
export default function ReservasTab() {
  const router = useRouter();
  const [data, setData] = React.useState<Reserva[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const d = await fetchMisReservas();
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
      const d = await fetchMisReservas();
      setData(d);
    } catch (e: any) {
      setError(e?.message || "Error al actualizar");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(React.useCallback(() => { onRefresh(); }, [onRefresh]));
  React.useEffect(() => { load(); }, [load]);

  const preview = (data ?? []).slice(0, 3);

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reservas</Text>
      </View>

      {/* Acciones */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => router.push("/(tabs)/mis-reservas")}
        >
          <Ionicons name="reader-outline" size={16} color="#fff" />
          <Text style={styles.btnPrimaryText}>Mis reservas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnOutline}
          onPress={() => {
            // Cambia esto por tu flujo real de reserva
            router.push("/(tabs)/mis-reservas");
          }}
        >
          <Ionicons name="add-circle-outline" size={16} color={TEAL} />
          <Text style={styles.btnOutlineText}>Reservar</Text>
        </TouchableOpacity>
      </View>

      {/* Listado */}
      <View style={{ paddingHorizontal: 16, marginTop: 6 }}>
        <Text style={{ fontWeight: "900", color: "#0f172a" }}>Próximas reservas</Text>
      </View>

      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.centerMsg}>Cargando…</Text>
        </View>
      ) : error && (!data || data.length === 0) ? (
        <View style={[styles.center, { paddingHorizontal: 24 }]}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "900",
              textAlign: "center",
              marginBottom: 6,
            }}
          >
            No se pudieron cargar tus reservas
          </Text>
          <Text style={{ textAlign: "center", color: "#6b7280", marginBottom: 12 }}>
            {error}
          </Text>
          <TouchableOpacity onPress={load} style={styles.btnPrimary}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.btnPrimaryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={preview}
          keyExtractor={(r) => r.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 16 }}
          ListEmptyComponent={
            <View style={{ padding: 24 }}>
              <Text
                style={{
                  textAlign: "center",
                  fontWeight: "900",
                  fontSize: 16,
                  marginBottom: 6,
                }}
              >
                Sin reservas
              </Text>
              <Text style={{ textAlign: "center", color: "#6b7280" }}>
                Aún no tienes reservas confirmadas. Crea una desde una cancha.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ItemReserva
              r={item}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/reservadetalle",
                  params: {
                    id: item.id,
                    cancha: item.cancha?.name?.toString() ?? "",
                    complejo: item.venue?.name ?? "",
                    fecha: item.date ?? "",
                    hora: [item.startTime, item.endTime].filter(Boolean).join("-"),
                    estado: (item.status ?? "").toLowerCase(),
                  },
                })
              }
            />
          )}
          ListFooterComponent={
            (data ?? []).length > 3 ? (
              <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.btnOutline, { height: 44 }]}
                  onPress={() => router.push("/(tabs)/mis-reservas")}
                >
                  <Ionicons name="list-outline" size={16} color={TEAL} />
                  <Text style={styles.btnOutlineText}>Ver todas</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

/* --- Estilos --- */
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#0f172a" },

  actions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  btnPrimary: {
    backgroundColor: TEAL,
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    flex: 1,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },

  btnOutline: {
    backgroundColor: "#ecfeff",
    borderWidth: 1,
    borderColor: "#99f6e4",
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    flex: 1,
  },
  btnOutlineText: { color: TEAL, fontWeight: "800" },

  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
  },
  rowText: { color: "#334155", fontSize: 14 },
  center: { justifyContent: "center", alignItems: "center", paddingVertical: 24 },
  centerMsg: { marginTop: 8, color: "#6b7280" },
});
