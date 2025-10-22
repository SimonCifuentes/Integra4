// app/(tabs)/reservar.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
  TextInput,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { useMutation } from "@tanstack/react-query";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "http://api-h1d7oi-a881cc-168-232-167-73.traefik.me/api/v1";
const TEAL = "#0ea5a4";

/* ============== Auth & fetch helpers ============== */
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
      (await SecureStore.getItemAsync("token")) ||
      (await SecureStore.getItemAsync("accessToken")) ||
      (await SecureStore.getItemAsync("jwt")) ||
      (await SecureStore.getItemAsync("access_token"))
    );
  } catch {
    return null;
  }
}

async function postJSON<T>(path: string, body: any): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const txt = await res.text();
  if (!res.ok) {
    console.warn("POST", path, "payload:", body, "->", txt);
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return txt ? JSON.parse(txt) : ({} as T);
}

/* ====== Quotes storage (web/local & SecureStore) ====== */
type QuotesMap = Record<string, { total: number; at: number }>;

async function loadQuotes(): Promise<QuotesMap> {
  try {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const raw = window.localStorage.getItem("quotesMap");
      return raw ? (JSON.parse(raw) as QuotesMap) : {};
    }
    const raw = await SecureStore.getItemAsync("quotesMap");
    return raw ? (JSON.parse(raw) as QuotesMap) : {};
  } catch {
    return {};
  }
}
async function saveQuotes(next: QuotesMap) {
  const raw = JSON.stringify(next);
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.localStorage.setItem("quotesMap", raw);
  } else {
    await SecureStore.setItemAsync("quotesMap", raw);
  }
}

function quoteKey(id_cancha: number | string, fecha: string, inicio: string, fin: string) {
  return `quote:${id_cancha}:${fecha}:${inicio}-${fin}`;
}

/* ============== Inputs (web fallback) ============== */
function DateField({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  if (Platform.OS !== "web") {
    return <DateTimePicker mode="date" value={value} onChange={(_, d) => d && onChange(d)} />;
  }
  // @ts-ignore
  return (
    <input
      type="date"
      // @ts-ignore
      style={htmlInputStyle}
      value={toYMD(value)}
      onChange={(e: any) => {
        const [y, m, d] = String(e.target.value ?? "").split("-");
        if (y && m && d) onChange(new Date(Number(y), Number(m) - 1, Number(d)));
      }}
    />
  );
}

function TimeField({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  if (Platform.OS !== "web") {
    return <DateTimePicker mode="time" value={value} onChange={(_, d) => d && onChange(d)} />;
  }
  // @ts-ignore
  return (
    <input
      type="time"
      // @ts-ignore
      style={htmlInputStyle}
      value={toHM(value)}
      onChange={(e: any) => {
        const [hh, mm] = String(e.target.value ?? "").split(":");
        const d = new Date(value);
        d.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0);
        onChange(d);
      }}
    />
  );
}

const htmlInputStyle: any = {
  width: "100%",
  height: 46,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  padding: "0 12px",
  fontSize: 16,
  outline: "none",
};

/* ============== Pantalla ============== */
type Cotizacion = {
  precio_por_hora: number;
  horas: number;
  subtotal: number;
  descuento?: number;
  total: number;
  promo_aplicada?: string | null;
};

export default function ReservarTab() {
  // /(tabs)/reservar?canchaId=123 (+ opcional date/start/end para prellenar)
  const { canchaId, date: dateParam, start: startParam, end: endParam } =
    useLocalSearchParams<{ canchaId?: string; date?: string; start?: string; end?: string }>();

  const seedDate = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date();
  const seedStart = startParam ? strToTodayTime(startParam) : new Date();
  const seedEnd = endParam ? strToTodayTime(endParam) : new Date(Date.now() + 60 * 60 * 1000);

  const [date, setDate] = useState(seedDate);
  const [startTime, setStartTime] = useState(seedStart);
  const [endTime, setEndTime] = useState(seedEnd);
  const [notes, setNotes] = useState<string>("");
  const [cupon, setCupon] = useState<string>("");
  const [quote, setQuote] = useState<Cotizacion | null>(null);

  /* === Mutations === */
  const crear = useMutation({
    mutationFn: (payload: {
      fecha: string;
      inicio: string;
      fin: string;
      id_cancha: number;
      notas?: string | null;
    }) => postJSON("/reservas", payload),

    onSuccess: (_created: any, vars) => {
      const msg = `Reserva creada para el ${vars.fecha} de ${vars.inicio} a ${vars.fin}.`;
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(msg);
        router.replace("/(reservar)/mis-reservas");
      } else {
        Alert.alert("¡Reserva creada!", msg, [
          { text: "Ver mis reservas", onPress: () => router.replace("/(reservar)/mis-reservas") },
        ]);
      }
    },

    onError: (e: any) => {
      let errMsg = e?.message ?? "Intenta de nuevo.";
      try {
        const parsed = JSON.parse(errMsg);
        errMsg = parsed?.detail || parsed?.message || errMsg;
      } catch {
        errMsg = errMsg.replace(/^"|"$/g, "");
      }
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(`No se pudo crear la reserva.\n${errMsg}`);
      } else {
        Alert.alert("No se pudo crear la reserva", errMsg);
      }
    },
  });

  const cotizar = useMutation({
    mutationFn: (payload: {
      fecha: string;
      inicio: string;
      fin: string;
      id_cancha: number;
      cupon?: string | null;
    }) => postJSON<Cotizacion>("/reservas/cotizar", payload),
    onSuccess: async (resp, vars) => {
      setQuote(resp);
      // persistimos para que mis-reservas pueda mostrar el valor estimado si el backend aún no lo calcula
      const key = quoteKey(vars.id_cancha, vars.fecha, vars.inicio, vars.fin);
      const current = await loadQuotes();
      current[key] = { total: resp.total, at: Date.now() };
      await saveQuotes(current);
    },
    onError: (e: any) => {
      let errMsg = e?.message ?? "Intenta nuevamente.";
      try {
        const parsed = JSON.parse(errMsg);
        errMsg = parsed?.detail || parsed?.message || errMsg;
      } catch {
        errMsg = errMsg.replace(/^"|"$/g, "");
      }
      if (Platform.OS === "web") window.alert(errMsg);
      else Alert.alert("No se pudo cotizar", errMsg);
    },
  });

  /* === Actions === */
  const doConfirmar = () => {
    if (!canchaId) {
      const msg = "Falta información: no viene el id de la cancha.";
      if (Platform.OS === "web" && typeof window !== "undefined") window.alert(msg);
      else Alert.alert("Falta información", msg);
      return;
    }

    const fecha = toYMD(date);
    const inicio = toHM(startTime);
    const fin = toHM(endTime);

    // Validación simple: fin > inicio
    const startMillis = hmToMillis(inicio);
    const endMillis = hmToMillis(fin);
    if (endMillis <= startMillis) {
      const msg = "La hora de término debe ser posterior a la hora de inicio.";
      if (Platform.OS === "web") window.alert(msg); else Alert.alert("Horario inválido", msg);
      return;
    }

    const confirmMsg = `¿Deseas confirmar la reserva para el ${fecha} entre ${inicio} y ${fin}?`;

    const doPost = () =>
      crear.mutate({
        fecha,
        inicio,
        fin,
        id_cancha: Number(canchaId),
        notas: notes?.trim() ? notes.trim() : null,
      });

    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(confirmMsg)) doPost();
    } else {
      Alert.alert("Confirmar reserva", confirmMsg, [
        { text: "Cancelar", style: "cancel" },
        { text: "Confirmar", onPress: doPost },
      ]);
    }
  };

  const doCotizar = () => {
    if (!canchaId) {
      const msg = "Falta el id de la cancha.";
      if (Platform.OS === "web") window.alert(msg); else Alert.alert("Falta información", msg);
      return;
    }
    const fecha = toYMD(date);
    const inicio = toHM(startTime);
    const fin = toHM(endTime);

    // Validación simple igual que en confirmar
    const startMillis = hmToMillis(inicio);
    const endMillis = hmToMillis(fin);
    if (endMillis <= startMillis) {
      const msg = "La hora de término debe ser posterior a la hora de inicio.";
      if (Platform.OS === "web") window.alert(msg); else Alert.alert("Horario inválido", msg);
      return;
    }
    cotizar.mutate({
      fecha,
      inicio,
      fin,
      id_cancha: Number(canchaId),
      cupon: cupon?.trim() ? cupon.trim() : null,
    });
  };

  const loading = crear.isPending;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nueva reserva</Text>
        {!!canchaId && (
          <Text style={styles.subtle}>
            Cancha ID: <Text style={styles.bold}>{canchaId}</Text>
          </Text>
        )}
      </View>

      {/* Formulario */}
      <View style={styles.body}>
        <Text style={styles.label}>Fecha</Text>
        <DateField value={date} onChange={setDate} />

        <Text style={styles.label}>Hora inicio</Text>
        <TimeField value={startTime} onChange={setStartTime} />

        <Text style={styles.label}>Hora término</Text>
        <TimeField value={endTime} onChange={setEndTime} />

        <Text style={styles.label}>Cupón (opcional)</Text>
        <TextInput
          value={cupon}
          onChangeText={setCupon}
          placeholder="Ej: CYBER-10"
          style={styles.input}
        />

        <Text style={styles.label}>Notas (opcional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Ej: Partido amistoso"
          style={styles.textarea}
          multiline
          numberOfLines={3}
        />

        {/* Cotizar */}
        <TouchableOpacity
          style={[styles.btnOutline, cotizar.isPending && { opacity: 0.6 }]}
          onPress={doCotizar}
          disabled={cotizar.isPending}
        >
          {cotizar.isPending ? (
            <ActivityIndicator />
          ) : (
            <>
              <Ionicons name="pricetag-outline" size={18} color={TEAL} />
              <Text style={styles.btnOutlineText}>Cotizar</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Resultado de la cotización */}
        {quote && (
          <View style={styles.quoteCard}>
            <Text style={styles.quoteTitle}>Cotización</Text>
            <Row label="Precio por hora" value={toCLP(quote.precio_por_hora)} />
            <Row label="Horas" value={`${quote.horas}`} />
            <Row label="Subtotal" value={toCLP(quote.subtotal)} />
            {"descuento" in quote && typeof quote.descuento === "number" ? (
              <Row label="Descuento" value={`- ${toCLP(quote.descuento)}`} />
            ) : null}
            <Row label="Total" value={toCLP(quote.total)} strong />
            {quote.promo_aplicada ? (
              <Text style={{ marginTop: 6, color: "#64748b" }}>
                Promo aplicada: {quote.promo_aplicada}
              </Text>
            ) : null}
          </View>
        )}

        {/* Confirmar (crear reserva) */}
        <TouchableOpacity
          style={[styles.btnPrimary, loading && { opacity: 0.6 }]}
          onPress={doConfirmar}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>Confirmar reserva</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
      <Text style={{ color: "#334155" }}>{label}</Text>
      <Text style={{ fontWeight: strong ? "900" : "800" }}>{value}</Text>
    </View>
  );
}

/* ============== helpers fecha/hora/moneda ============== */
function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function toHM(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function strToTodayTime(hm: string) {
  const [h, m] = hm.split(":").map((x) => parseInt(x, 10));
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}
function hmToMillis(hm: string) {
  const [h, m] = hm.split(":").map((x) => parseInt(x, 10));
  return (h * 60 + m) * 60 * 1000;
}
function toCLP(n: number) {
  return Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}

/* ============== estilos ============== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#0f172a" },
  subtle: { color: "#64748b", marginTop: 2 },
  bold: { fontWeight: "900", color: "#0f172a" },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 12, gap: 6 },
  label: { fontWeight: "800", marginTop: 10, marginBottom: 6, color: "#0f172a" },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  textarea: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
    minHeight: 90,
    textAlignVertical: "top",
  },
  btnOutline: {
    backgroundColor: "#ecfeff",
    borderColor: "#99f6e4",
    borderWidth: 1,
    height: 46,
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  btnOutlineText: { color: TEAL, fontWeight: "800" },
  btnPrimary: {
    backgroundColor: TEAL,
    height: 46,
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },
  quoteCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
  },
  quoteTitle: { fontWeight: "900", color: "#0f172a", marginBottom: 4, fontSize: 16 },
});
