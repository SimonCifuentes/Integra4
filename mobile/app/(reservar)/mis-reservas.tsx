// app/(tabs)/mis-reservas.tsx
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
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getItemAsync } from "expo-secure-store";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "http://api-h1d7oi-a881cc-168-232-167-73.traefik.me/api/v1";
const TEAL = "#0ea5a4";

/* ===== Tipos UI ===== */
export type Reserva = {
  id: string;
  status: "CONFIRMED" | "PENDING" | "CANCELLED" | "EXPIRED" | string;
  date?: string;       // fecha_reserva
  startTime?: string;  // hora_inicio
  endTime?: string;    // hora_fin
  totalPrice?: number; // precio_total
  cancha?: { id: string; name?: string | number };
  venue?: { id: string; name: string; address?: string };
};

/* ===== Auth token ===== */
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
    return (
      (await getItemAsync("token")) ||
      (await getItemAsync("accessToken")) ||
      (await getItemAsync("jwt")) ||
      (await getItemAsync("access_token"))
    );
  } catch {
    return null;
  }
}

/* ===== API helpers ===== */
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

/* ===== Endpoints ===== */
async function fetchMisReservas(): Promise<Reserva[]> {
  const raw = await apiGet<any>("/reservas/mias");
  const list: any[] = Array.isArray(raw) ? raw : raw?.data ?? raw?.items ?? [];

  return list.map((r) => {
    const id = r.id ?? r.id_reserva ?? r.reserva_id;
    const estado = r.estado ?? r.status ?? "CONFIRMED";
    const fecha = r.fecha_reserva ?? r.fecha;
    const inicio = r.hora_inicio ?? r.inicio;
    const fin = r.hora_fin ?? r.fin;

    const canchaId =
      r?.cancha?.id ?? r.cancha_id ?? r.id_cancha ?? r?.cancha?.uuid ?? "";
    const canchaNombre =
      r?.cancha?.nombre ?? r.cancha_nombre ?? r.cancha ?? canchaId ?? "";
    const complejoId =
      r?.complejo?.id ?? r.complejo_id ?? r?.venue?.id ?? r.id_complejo ?? "";
    const complejoNombre =
      r?.complejo?.nombre ??
      r.complejo_nombre ??
      r?.venue?.name ??
      r.complejo ??
      "Complejo";
    const complejoDireccion =
      r?.complejo?.direccion ?? r?.venue?.address ?? r.direccion ?? undefined;

    const total =
      typeof r.monto_total === "number"
        ? r.monto_total
        : typeof r.precio_total === "number"
        ? r.precio_total
        : undefined;

    return {
      id: String(id),
      status: String(estado),
      date: fecha,
      startTime: inicio,
      endTime: fin,
      totalPrice: total,
      cancha: { id: String(canchaId || ""), name: canchaNombre },
      venue: {
        id: String(complejoId || ""),
        name: complejoNombre,
        address: complejoDireccion,
      },
    } as Reserva;
  });
}

/* ===== UI helpers ===== */
function EstadoPill({ estado }: { estado: Reserva["status"] }) {
  const key = (estado ?? "").toString().toLowerCase();
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    confirmed: { bg: "#dcfce7", fg: "#166534", label: "Confirmada" },
    pendiente: { bg: "#fef9c3", fg: "#713f12", label: "Pendiente" },
    pending: { bg: "#fef9c3", fg: "#713f12", label: "Pendiente" },
    cancelled: { bg: "#fee2e2", fg: "#991b1b", label: "Cancelada" },
    expired: { bg: "#e5e7eb", fg: "#374151", label: "Vencida" },
  };
  const sty =
    map[key] ??
    { bg: "#e5e7eb", fg: "#374151", label: estado?.toString() || "—" };
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

/* ===== Item ===== */
function ReservaItem({
  r,
  onPressDetalle,
}: {
  r: Reserva;
  onPressDetalle: () => void;
}) {
  const titulo = `${r.venue?.name ?? "Complejo"}${
    r.cancha?.name ? ` • Cancha ${r.cancha.name}` : ""
  }`;
  const fecha = r.date ?? "—";
  const horario = [r.startTime, r.endTime].filter(Boolean).join(" - ") || "—";

  return (
    <View style={styles.card}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "900",
            color: "#0f172a",
            flex: 1,
          }}
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

      <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
        <TouchableOpacity style={styles.btnOutline} onPress={onPressDetalle}>
          <Ionicons name="eye-outline" size={16} color={TEAL} />
          <Text style={styles.btnOutlineText}>Ver detalle</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ===== Pantalla ===== */
export default function MisReservasScreen() {
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

  return (
    <View style={{ flex: 1 }}>
      {/* Header con botón de volver */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 8 }}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis reservas</Text>
      </View>

      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.centerMsg}>Cargando…</Text>
        </View>
      ) : error && (!data || data.length === 0) ? (
        <View style={[styles.center, { paddingHorizontal: 24 }]}>
          <Text style={{ fontSize: 16, fontWeight: "900", textAlign: "center", marginBottom: 6 }}>
            No se pudieron cargar tus reservas
          </Text>
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
                Sin reservas
              </Text>
              <Text style={{ textAlign: "center", color: "#6b7280" }}>
                Aún no tienes reservas. Crea una desde una cancha.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ReservaItem
              r={item}
              onPressDetalle={() =>
                router.push({
                  pathname: "/(reservar)/reservadetalle",
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
        />
      )}
    </View>
  );
}

/* ===== Estilos ===== */
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
  },
  rowText: { color: "#334155", fontSize: 14 },

  btnOutline: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#99f6e4",
    backgroundColor: "#ecfeff",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnOutlineText: { color: TEAL, fontWeight: "800" },

  center: { justifyContent: "center", alignItems: "center", paddingVertical: 24 },
  centerMsg: { marginTop: 8, color: "#6b7280" },
});
