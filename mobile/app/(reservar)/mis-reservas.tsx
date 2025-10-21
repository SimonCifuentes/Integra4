// app/(tabs)/mis-reservas.tsx
import React from "react";
import {
  View, Text, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl,
  StyleSheet, Platform,
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
  date?: string;       // fecha_reserva (YYYY-MM-DD)
  startTime?: string;  // hora_inicio (HH:mm)
  endTime?: string;    // hora_fin (HH:mm)
  totalPrice?: number; // precio_total
  createdAt?: string;  // fecha/hora de creación ISO (YYYY-MM-DDTHH:mm:ssZ)
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
    const fecha = r.fecha_reserva ?? r.fecha;     // YYYY-MM-DD
    const inicio = r.hora_inicio ?? r.inicio;     // HH:mm
    const fin = r.hora_fin ?? r.fin;              // HH:mm

    const createdAt =
      r.createdAt ?? r.created_at ?? r.fecha_creacion ?? r.fecha_creado ?? r.fecha_registro;

    const canchaId =
      r?.cancha?.id ?? r.cancha_id ?? r.id_cancha ?? r?.cancha?.uuid ?? "";
    const canchaNombre =
      r?.cancha?.nombre ?? r.cancha_nombre ?? r.cancha ?? canchaId ?? "";
    const complejoId =
      r?.complejo?.id ?? r.complejo_id ?? r?.venue?.id ?? r.id_complejo ?? "";
    const complejoNombre =
      r?.complejo?.nombre ?? r.complejo_nombre ?? r?.venue?.name ?? r.complejo ?? "Complejo";
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
      createdAt: createdAt ? String(createdAt) : undefined,
      cancha: { id: String(canchaId || ""), name: canchaNombre },
      venue: { id: String(complejoId || ""), name: complejoNombre, address: complejoDireccion },
    } as Reserva;
  });
}

/* ===== Utils ===== */
const isCancelled = (s?: string) => {
  const k = (s ?? "").toLowerCase();
  return k === "cancelled" || k === "cancelada" || k === "canceled";
};

function toDateSafe(v?: string) {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

function composeReservaDateTime(r: Reserva): Date | undefined {
  // intenta construir YYYY-MM-DDTHH:mm en local para ordenar por fecha de reserva
  if (!r?.date && !r?.startTime) return undefined;
  const date = r.date ?? "";
  const time = r.startTime ?? "00:00";
  // Evita zonas: crea fecha local consistente
  const dt = new Date(`${date}T${time}:00`);
  return isNaN(dt.getTime()) ? undefined : dt;
}

/* ===== UI helpers ===== */
function EstadoPill({ estado }: { estado: Reserva["status"] }) {
  const key = (estado ?? "").toString().toLowerCase();
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    confirmed: { bg: "#dcfce7", fg: "#166534", label: "Confirmada" },
    pendiente: { bg: "#fef9c3", fg: "#713f12", label: "Pendiente" },
    pending:   { bg: "#fef9c3", fg: "#713f12", label: "Pendiente" },
    cancelled: { bg: "#fee2e2", fg: "#991b1b", label: "Cancelada" },
    cancelada: { bg: "#fee2e2", fg: "#991b1b", label: "Cancelada" },
    expired:   { bg: "#e5e7eb", fg: "#374151", label: "Vencida" },
  };
  const sty = map[key] ?? { bg: "#e5e7eb", fg: "#374151", label: estado?.toString() || "—" };
  return (
    <View style={{ backgroundColor: sty.bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
      <Text style={{ color: sty.fg, fontWeight: "800" }}>{sty.label}</Text>
    </View>
  );
}

function CLP({ value }: { value?: number }) {
  if (typeof value !== "number") return null;
  return (
    <Text style={{ fontWeight: "800" }}>
      {Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value)}
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
  const titulo = `${r.venue?.name ?? "Complejo"}${r.cancha?.name ? ` • Cancha ${r.cancha.name}` : ""}`;
  const fecha = r.date ?? "—";
  const horario = [r.startTime, r.endTime].filter(Boolean).join(" - ") || "—";

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <Text style={{ fontSize: 16, fontWeight: "900", color: "#0f172a", flex: 1 }} numberOfLines={1}>
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
type SortKey = "created" | "reservation";
type SortDir = "desc" | "asc";

export default function MisReservasScreen() {
  const router = useRouter();
  const [data, setData] = React.useState<Reserva[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Controles de orden
  const [sortKey, setSortKey] = React.useState<SortKey>("reservation");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");

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

  // Derivado: orden + canceladas al final
  const orderedData = React.useMemo(() => {
    const arr = [...(data ?? [])];

    // 1) separamos canceladas
    const active = arr.filter((r) => !isCancelled(r.status));
    const cancelled = arr.filter((r) => isCancelled(r.status));

    // 2) función de valor según sortKey
    const getVal = (r: Reserva): number => {
      if (sortKey === "created") {
        const d = toDateSafe(r.createdAt);
        return d ? d.getTime() : -Infinity;
      }
      // "reservation"
      const d2 = composeReservaDateTime(r);
      return d2 ? d2.getTime() : -Infinity;
    };

    // 3) orden para cada grupo
    const factor = sortDir === "desc" ? -1 : 1;
    active.sort((a, b) => {
      const va = getVal(a), vb = getVal(b);
      if (va === vb) return 0;
      return va > vb ? factor : -factor;
    });
    cancelled.sort((a, b) => {
      const va = getVal(a), vb = getVal(b);
      if (va === vb) return 0;
      return va > vb ? factor : -factor;
    });

    // 4) concatenamos: activas arriba, canceladas abajo
    return [...active, ...cancelled];
  }, [data, sortKey, sortDir]);

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 8 }}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Mis reservas</Text>
        <View style={{ flex: 1 }} />

        {/* Controles de orden */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={() => setSortKey((k) => (k === "reservation" ? "created" : "reservation"))}
            style={styles.headerChip}
          >
            <Ionicons name={sortKey === "reservation" ? "calendar-outline" : "time-outline"} size={16} color="#0f172a" />
            <Text style={styles.headerChipText}>
              {sortKey === "reservation" ? "Por fecha reserva" : "Por creación"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
            style={styles.headerChip}
          >
            <Ionicons name={sortDir === "desc" ? "arrow-down" : "arrow-up"} size={16} color="#0f172a" />
            <Text style={styles.headerChipText}>{sortDir === "desc" ? "Desc" : "Asc"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.centerMsg}>Cargando…</Text>
        </View>
      ) : error && (!orderedData || orderedData.length === 0) ? (
        <View style={[styles.center, { paddingHorizontal: 24 }]}>
          <Text style={{ fontSize: 16, fontWeight: "900", textAlign: "center", marginBottom: 6 }}>
            No se pudieron cargar tus reservas
          </Text>
        </View>
      ) : (
        <FlatList
          data={orderedData ?? []}
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

  headerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  headerChipText: { color: "#0f172a", fontWeight: "800" },

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
