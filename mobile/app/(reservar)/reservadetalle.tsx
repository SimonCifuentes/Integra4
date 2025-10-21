// app/(tabs)/reservadetalle.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://api-h1d7oi-a881cc-168-232-167-73.traefik.me/api/v1";
const TEAL = "#0ea5a4";

type Estado = "confirmada" | "pendiente" | "cancelada" | string;

type ReservaBE = {
  id?: string | number;
  id_reserva?: string | number;
  estado?: string;
  status?: string;
  fecha?: string;
  fecha_reserva?: string;
  inicio?: string;
  hora_inicio?: string;
  fin?: string;
  hora_fin?: string;
  notas?: string;
  cancha?: { id?: string | number; nombre?: string };
  cancha_id?: string | number;
  cancha_nombre?: string;
  complejo?: { id?: string | number; nombre?: string; direccion?: string };
  complejo_id?: string | number;
  complejo_nombre?: string;
  venue?: { id?: string; name?: string; address?: string };
};

async function getToken() {
  try {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return window.localStorage.getItem("token") || window.localStorage.getItem("accessToken");
    }
    return (await SecureStore.getItemAsync("token")) || (await SecureStore.getItemAsync("accessToken"));
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

async function apiPost<T>(path: string, body?: any): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(txt || `HTTP ${res.status}`);
  return txt ? JSON.parse(txt) : ({} as T);
}

function Badge({ estado }: { estado: Estado | undefined }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    confirmada: { bg: "#dcfce7", fg: "#166534", label: "Confirmada" },
    pendiente: { bg: "#fef9c3", fg: "#713f12", label: "Pendiente" },
    cancelada: { bg: "#fee2e2", fg: "#991b1b", label: "Cancelada" },
  };
  const sty = map[(estado ?? "").toLowerCase()] ?? { bg: "#e5e7eb", fg: "#374151", label: estado ?? "—" };
  return (
    <View style={{ backgroundColor: sty.bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
      <Text style={{ color: sty.fg, fontWeight: "800" }}>{sty.label}</Text>
    </View>
  );
}

export default function ReservaDetalleScreen() {
  // Params que vienen desde la lista (pueden venir vacíos)
  const params = useLocalSearchParams<{
    id?: string;
    cancha?: string;
    complejo?: string;
    fecha?: string;
    hora?: string;   // "HH:mm - HH:mm" (legacy)
    inicio?: string; // "HH:mm"
    fin?: string;    // "HH:mm"
    estado?: string;
    notas?: string;
  }>();

  const [loading, setLoading] = useState(false);
  const [reserva, setReserva] = useState<{
    id?: string;
    fecha?: string;
    inicio?: string;
    fin?: string;
    estado?: string;
    cancha?: string;
    complejo?: string;
    direccion?: string;
    notas?: string;
  }>({
    id: params.id,
    fecha: params.fecha,
    inicio: params.inicio,
    fin: params.fin,
    estado: params.estado,
    cancha: params.cancha,
    complejo: params.complejo,
    notas: params.notas,
  });

  // Si vino "hora" con el formato "HH:mm - HH:mm", separa
  useEffect(() => {
    if (!reserva.inicio && !reserva.fin && params.hora) {
      const [h1, h2] = String(params.hora).split("-").map((s) => s.trim());
      setReserva((prev) => ({ ...prev, inicio: h1, fin: h2 }));
    }
  }, [params.hora]);

  // Si faltan datos clave pero hay id, los pedimos al backend
  useEffect(() => {
    const needFetch =
      !!params.id &&
      (!reserva.fecha || !reserva.inicio || !reserva.fin || !reserva.cancha || !reserva.complejo);

    if (!needFetch) return;

    (async () => {
      try {
        setLoading(true);
        const be = await apiGet<ReservaBE>(`/reservas/${params.id}`);
        const id = be.id ?? be.id_reserva ?? params.id;
        const fecha = be.fecha ?? be.fecha_reserva ?? reserva.fecha;
        const inicio = be.inicio ?? be.hora_inicio ?? reserva.inicio;
        const fin = be.fin ?? be.hora_fin ?? reserva.fin;
        const estado = be.estado ?? be.status ?? reserva.estado;

        const canchaNombre = be?.cancha?.nombre ?? be.cancha_nombre ?? reserva.cancha;
        const complejoNombre =
          be?.complejo?.nombre ?? be.complejo_nombre ?? be?.venue?.name ?? reserva.complejo;
        const direccion = be?.complejo?.direccion ?? be?.venue?.address ?? undefined;

        setReserva({
          id: String(id ?? ""),
          fecha: fecha,
          inicio,
          fin,
          estado,
          cancha: canchaNombre,
          complejo: complejoNombre,
          direccion,
          notas: be.notas ?? reserva.notas,
        });
      } catch (err: any) {
        if (Platform.OS === "web") window.alert("No se pudo cargar la reserva: " + (err?.message || ""));
        else Alert.alert("Error", "No se pudo cargar la reserva.");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  const fechaHoraFmt = useMemo(() => {
    const { fecha, inicio, fin } = reserva;
    if (!fecha && !inicio && !fin) return "—";
    // Render: "mar., 22 oct 2025 • 19:00–20:30"
    try {
      const dateLabel = fecha
        ? new Intl.DateTimeFormat(undefined, {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "2-digit",
          }).format(new Date(`${fecha}T00:00:00`))
        : "";
      const range = [inicio, fin].filter(Boolean).join("–");
      return [dateLabel, range].filter(Boolean).join(" • ");
    } catch {
      return [fecha ?? "", [inicio, fin].filter(Boolean).join("–")].filter(Boolean).join(" • ");
    }
  }, [reserva]);

  const cancelar = async () => {
    if (!reserva.id) return;
    const msg = `¿Cancelar la reserva del ${reserva.fecha ?? "—"} entre ${reserva.inicio ?? "—"} y ${reserva.fin ?? "—"}?`;
    const go = async () => {
      try {
        await apiPost(`/reservas/${reserva.id}/cancelar`);
        if (Platform.OS === "web") window.alert("Reserva cancelada correctamente.");
        else Alert.alert("Listo", "Reserva cancelada correctamente.");
        router.replace("/(reservar)/mis-reservas");
      } catch (e: any) {
        const em = e?.message ?? "No se pudo cancelar la reserva.";
        if (Platform.OS === "web") window.alert(em); else Alert.alert("Error", em);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(msg)) go();
    } else {
      Alert.alert("Cancelar reserva", msg, [
        { text: "No", style: "cancel" },
        { text: "Sí, cancelar", style: "destructive", onPress: go },
      ]);
    }
  };

  const estadoLower = (reserva.estado ?? "").toLowerCase();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 8 }}>
          <Ionicons name="chevron-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Detalle de reserva</Text>
      </View>

      {/* Cargando */}
      {loading ? (
        <View style={{ padding: 16 }}>
          <ActivityIndicator />
        </View>
      ) : null}

      {/* Card principal */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <Ionicons name="calendar-outline" size={18} color={TEAL} />
          <Text style={[styles.label, { marginLeft: 6 }]}>Fecha y hora</Text>
        </View>
        <Text style={styles.value}>{fechaHoraFmt}</Text>

        <View style={styles.sep} />

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <Ionicons name="business-outline" size={18} color={TEAL} />
          <Text style={[styles.label, { marginLeft: 6 }]}>Complejo</Text>
        </View>
        <Text style={styles.value}>{reserva.complejo ?? "—"}</Text>
        {!!reserva.direccion && <Text style={[styles.value, { color: "#64748b" }]}>{reserva.direccion}</Text>}

        <View style={styles.sep} />

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <Ionicons name="football-outline" size={18} color={TEAL} />
          <Text style={[styles.label, { marginLeft: 6 }]}>Cancha</Text>
        </View>
        <Text style={styles.value}>{reserva.cancha ?? "—"}</Text>

        <View style={styles.sep} />

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="information-circle-outline" size={18} color={TEAL} />
            <Text style={[styles.label, { marginLeft: 6 }]}>Estado</Text>
          </View>
          <Badge estado={(estadoLower as Estado) || "pendiente"} />
        </View>
      </View>

      {/* Acciones */}
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => { /* TODO: agregar a calendario */ }}>
          <Ionicons name="calendar" color="#fff" size={16} />
          <Text style={styles.btnPrimaryText}>Agregar al calendario</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnOutline, (estadoLower === "cancelada") && { opacity: 0.55 }]}
          onPress={cancelar}
          disabled={estadoLower === "cancelada"}
        >
          <Ionicons name="close-circle-outline" color={TEAL} size={16} />
          <Text style={styles.btnOutlineText}>Cancelar reserva</Text>
        </TouchableOpacity>
      </View>

      {/* Notas */}
      <View style={[styles.card, { marginTop: 12 }]}>
        <Text style={[styles.label, { marginBottom: 6 }]}>Notas</Text>
        <Text style={{ color: "#475569" }}>
          {reserva.notas?.trim() ? reserva.notas : "—"}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#0d9488",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },

  card: {
    marginTop: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
  },
  label: { color: "#0f172a", fontWeight: "800" },
  value: { color: "#334155", marginTop: 2, fontSize: 16 },
  sep: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 12 },

  btnPrimary: {
    height: 46,
    borderRadius: 10,
    backgroundColor: "#0ea5a4",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },

  btnOutline: {
    height: 46,
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
});
