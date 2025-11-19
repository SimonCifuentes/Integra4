﻿﻿// app/(tabs)/reservas.tsx
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
  date?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  totalPrice?: number;
  cancha?: { id: string; name?: string | number };
  venue?: { id: string; name: string; address?: string };
};

type FrequentCancha = {
  key: string;
  canchaId?: string;
  canchaName: string;
  venueId?: string;
  venueName: string;
  times: number;
  lastDate?: string;
};

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "http://api-h1d7oi-a881cc-168-232-167-73.traefik.me/api/v1";
const TEAL = "#0ea5a4";

/* --- getToken multiplataforma --- */
async function getToken() {
  try {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return (
        window.localStorage.getItem("token") ||
        window.localStorage.getItem("accessToken")
      );
    }
    return (
      (await getItemAsync("token")) ||
      (await getItemAsync("accessToken"))
    );
  } catch (err) {
    console.warn("Error obteniendo token:", err);
    if (typeof window !== "undefined") {
      return (
        window.localStorage.getItem("token") ||
        window.localStorage.getItem("accessToken")
      );
    }
    return null;
  }
}

/* --- Fetch de reservas propias --- */
async function fetchMisReservas(): Promise<Reserva[]> {
  const token = await getToken();
  if (!token) {
    const err: any = new Error("No autenticado");
    err.code = 401;
    throw err;
  }

  const res = await fetch(`${API_URL}/reservas/mias`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const txt = await res.text().catch(() => "");
  if (!res.ok) {
    console.warn("GET /reservas/mias ->", res.status, txt);
    const err: any = new Error(
      `Error ${res.status}: ${
        txt || "No se pudieron cargar tus reservas"
      }`
    );
    err.code = res.status;
    throw err;
  }

  const data = txt ? JSON.parse(txt) : [];
  return Array.isArray(data) ? data : data?.data ?? [];
}

/* --- Construir lista de canchas frecuentes --- */
function buildFrecuentes(reservas: Reserva[]): FrequentCancha[] {
  const map = new Map<string, FrequentCancha>();

  for (const r of reservas) {
    const canchaId = r.cancha?.id?.toString();
    const venueId = r.venue?.id?.toString();
    const venueName = r.venue?.name ?? "Complejo";
    const canchaName = r.cancha?.name?.toString() ?? "Cancha";

    const key =
      (venueId || "") + "|" + (canchaId || canchaName || "");

    let item = map.get(key);
    if (!item) {
      item = {
        key,
        canchaId,
        canchaName,
        venueId,
        venueName,
        times: 0,
        lastDate: undefined,
      };
      map.set(key, item);
    }
    item.times += 1;
    if (r.date) {
      if (!item.lastDate || r.date > item.lastDate) {
        item.lastDate = r.date;
      }
    }
  }

  const arr = Array.from(map.values());
  arr.sort((a, b) => {
    if (b.times !== a.times) return b.times - a.times;
    return (b.lastDate || "").localeCompare(a.lastDate || "");
  });
  return arr;
}

/* --- Pill de estado de reserva (se sigue usando en detalles) --- */
function EstadoPill({ estado }: { estado: Reserva["status"] }) {
  const key = (estado ?? "").toString().toLowerCase();
  const map: Record<
    string,
    { bg: string; fg: string; label: string }
  > = {
    confirmed: {
      bg: "#dcfce7",
      fg: "#166534",
      label: "Confirmada",
    },
    pending: {
      bg: "#fef9c3",
      fg: "#713f12",
      label: "Pendiente",
    },
    cancelled: {
      bg: "#fee2e2",
      fg: "#991b1b",
      label: "Cancelada",
    },
    expired: { bg: "#e5e7eb", fg: "#374151", label: "Vencida" },
  };
  const sty =
    map[key] ??
    {
      bg: "#e5e7eb",
      fg: "#374151",
      label: estado?.toString() || "—",
    };
  return (
    <View
      style={{
        backgroundColor: sty.bg,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
      }}
    >
      <Text style={{ color: sty.fg, fontWeight: "800" }}>
        {sty.label}
      </Text>
    </View>
  );
}

/* --- Formateador de CLP (por si lo necesitas más adelante) --- */
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

/* --- Tarjeta individual de reserva (se sigue usando para navegar a detalle desde otros lados si se quiere) --- */
function ItemReserva({
  r,
  onPress,
}: {
  r: Reserva;
  onPress?: () => void;
}) {
  const titulo = `${r.venue?.name ?? "Complejo"}${
    r.cancha?.name ? ` • Cancha ${r.cancha.name}` : ""
  }`;
  const fecha = r.date ?? "—";
  const horario =
    [r.startTime, r.endTime].filter(Boolean).join(" - ") || "—";

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.card}
    >
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
          }}
          numberOfLines={1}
        >
          {titulo}
        </Text>
        <EstadoPill estado={r.status} />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 2,
        }}
      >
        <Ionicons
          name="calendar-outline"
          size={16}
          color={TEAL}
        />
        <Text style={styles.rowText}> {fecha}</Text>
        <View style={{ width: 10 }} />
        <Ionicons
          name="time-outline"
          size={16}
          color={TEAL}
        />
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

/* --- Tarjeta de cancha frecuente --- */
function FrequentCard({ f }: { f: FrequentCancha }) {
  const router = useRouter();

  const fechaLabel = f.lastDate
    ? `Última vez: ${f.lastDate}`
    : "Aún sin fecha registrada";

  const handleReservar = () => {
    if (!f.canchaId) {
      // si no tenemos id, simplemente mandamos a la lista de canchas
      router.push("/(tabs)/canchas");
      return;
    }
    // flujo directo a reservar con esa cancha (ajusta la ruta si tu archivo está en otra carpeta)
    router.push({
      pathname: "/reservar/[canchaId]",
      params: { canchaId: f.canchaId },
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.frequentHeader}>
        <Text style={styles.frequentTitle}>
          {f.venueName}
        </Text>
        <View style={styles.frequentBadge}>
          <Ionicons
            name="repeat-outline"
            size={14}
            color="#0f172a"
          />
          <Text style={styles.frequentBadgeText}>
            {f.times}× reservada
          </Text>
        </View>
      </View>

      <Text style={styles.frequentSubtitle}>
        Cancha {f.canchaName}
      </Text>

      <View style={styles.frequentRow}>
        <Ionicons
          name="calendar-outline"
          size={16}
          color={TEAL}
        />
        <Text style={styles.rowText}> {fechaLabel}</Text>
      </View>

      <TouchableOpacity
        style={[styles.btnPrimary, { marginTop: 10 }]}
        onPress={handleReservar}
      >
        <Ionicons
          name="add-circle-outline"
          size={16}
          color="#fff"
        />
        <Text style={styles.btnPrimaryText}>
          Reservar nuevamente
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* --- Pantalla principal --- */
export default function ReservasTab() {
  const router = useRouter();
  const [data, setData] = React.useState<Reserva[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [authMissing, setAuthMissing] =
    React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setError(null);
      setAuthMissing(false);
      setLoading(true);
      const d = await fetchMisReservas();
      setData(d);
    } catch (e: any) {
      if (
        e?.code === 401 ||
        e?.code === 403 ||
        /Not authenticated/i.test(e?.message)
      ) {
        setAuthMissing(true);
        setError(
          "Debes iniciar sesión para ver tus reservas."
        );
      } else {
        setError(e?.message || "Error al cargar");
      }
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
      setAuthMissing(false);
      setError(null);
    } catch (e: any) {
      if (e?.code === 401 || e?.code === 403) {
        setAuthMissing(true);
        setError(
          "Debes iniciar sesión para ver tus reservas."
        );
      } else {
        setError(e?.message || "Error al actualizar");
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      onRefresh();
    }, [onRefresh])
  );
  React.useEffect(() => {
    load();
  }, [load]);

  const frecuentes = React.useMemo(
    () => buildFrecuentes(data ?? []),
    [data]
  );
  const previewFrecuentes = frecuentes.slice(0, 3);

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reservas</Text>
      </View>

      {/* Acciones principales */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() =>
            router.push("/(reservar)/mis-reservas")
          }
        >
          <Ionicons
            name="reader-outline"
            size={16}
            color="#fff"
          />
          <Text style={styles.btnPrimaryText}>
            Mis reservas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnOutline}
          onPress={() => router.push("/(tabs)/canchas")}
        >
          <Ionicons
            name="add-circle-outline"
            size={16}
            color={TEAL}
          />
          <Text style={styles.btnOutlineText}>
            Reservar
          </Text>
        </TouchableOpacity>
      </View>

      {/* Botón Frecuentes decorativo */}
      <View
        style={{
          paddingHorizontal: 16,
          marginTop: 10,
          marginBottom: 4,
        }}
      >
        <TouchableOpacity
          style={styles.btnFrecuentes}
          disabled
        >
          <Ionicons
            name="repeat-outline"
            size={16}
            color={TEAL}
          />
          <Text style={styles.btnFrecuentesText}>
            Frecuentes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Título de sección */}
      <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
        <Text
          style={{
            fontWeight: "900",
            color: "#0f172a",
          }}
        >
          Canchas que reservas más
        </Text>
      </View>

      {/* Contenido */}
      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.centerMsg}>Cargando…</Text>
        </View>
      ) : error && (!data || data.length === 0) ? (
        <View
          style={[styles.center, { paddingHorizontal: 24 }]}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "900",
              textAlign: "center",
              marginBottom: 6,
            }}
          >
            {authMissing
              ? "Inicia sesión para continuar"
              : "No se pudieron cargar tus reservas"}
          </Text>
          <Text
            style={{
              textAlign: "center",
              color: "#6b7280",
              marginBottom: 12,
            }}
          >
            {error}
          </Text>

          {authMissing ? (
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/perfil")}
              style={styles.btnPrimary}
            >
              <Ionicons
                name="log-in-outline"
                size={16}
                color="#fff"
              />
              <Text style={styles.btnPrimaryText}>
                Ir a iniciar sesión
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={load}
              style={styles.btnPrimary}
            >
              <Ionicons
                name="refresh"
                size={16}
                color="#fff"
              />
              <Text style={styles.btnPrimaryText}>
                Reintentar
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={previewFrecuentes}
          keyExtractor={(f) => f.key}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
          contentContainerStyle={{
            paddingVertical: 8,
            paddingBottom: 16,
          }}
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
                Aún no tenemos canchas frecuentes
              </Text>
              <Text
                style={{
                  textAlign: "center",
                  color: "#6b7280",
                }}
              >
                Cuando empieces a reservar canchas, te
                recomendaremos aquí las que más utilizas.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <FrequentCard f={item} />
          )}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
  },

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
  btnPrimaryText: {
    color: "#fff",
    fontWeight: "800",
  },

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
  btnOutlineText: {
    color: TEAL,
    fontWeight: "800",
  },

  btnFrecuentes: {
    backgroundColor: "#f0fdfa",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    height: 40,
    borderRadius: 999,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  btnFrecuentesText: {
    color: TEAL,
    fontWeight: "800",
  },

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

  center: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
  },
  centerMsg: { marginTop: 8, color: "#6b7280" },

  frequentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  frequentTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
  },
  frequentSubtitle: {
    color: "#0f172a",
    fontWeight: "700",
    marginBottom: 4,
  },
  frequentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  frequentBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  frequentBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
});
