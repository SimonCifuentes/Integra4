// app/reservar/[canchaId].tsx
import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getItemAsync } from "expo-secure-store";

type QuoteResponse = {
  quoteId?: string;
  totalPrice?: number;
  currency?: string; // "CLP"
  breakdown?: Array<{ label: string; amount: number }>;
  expiresAt?: string; // ISO
};

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://api-h1d7oi-a881cc-168-232-167-73.traefik.me/api/v1";
const TEAL = "#0ea5a4";

/* --- Token multiplataforma (web + móvil) --- */
async function getToken() {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") return window.localStorage.getItem("accessToken");
      return null;
    }
    return await getItemAsync("accessToken");
  } catch {
    if (typeof window !== "undefined") return window.localStorage.getItem("accessToken");
    return null;
  }
}

/* --- API calls --- */
async function postCotizar(payload: {
  canchaId: string | string[];
  date: string;
  startTime: string;
  endTime: string;
  note?: string;
}): Promise<QuoteResponse> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/reservas/cotizar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Error ${res.status}: ${txt || "No se pudo cotizar"}`);
  }
  const data = await res.json();
  return (data?.data ?? data) as QuoteResponse;
}

async function postReservar(payload: {
  canchaId: string | string[];
  date: string;
  startTime: string;
  endTime: string;
  note?: string;
  quoteId?: string;
}): Promise<{ id: string }> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/reservas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Error ${res.status}: ${txt || "No se pudo confirmar la reserva"}`);
  }
  const data = await res.json();
  return (data?.data ?? data) as { id: string };
}

/* --- Money --- */
function CLP({ value, currency = "CLP" }: { value?: number; currency?: string }) {
  if (typeof value !== "number") return null;
  return (
    <Text style={{ fontWeight: "900" }}>
      {Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: 0 }).format(value)}
    </Text>
  );
}

/* --- Screen --- */
export default function ReservaFlow() {
  const { canchaId } = useLocalSearchParams<{ canchaId: string }>();
  const router = useRouter();

  const [date, setDate] = React.useState("");        // YYYY-MM-DD
  const [startTime, setStartTime] = React.useState(""); // HH:mm
  const [endTime, setEndTime] = React.useState("");     // HH:mm
  const [note, setNote] = React.useState("");

  const [quoting, setQuoting] = React.useState(false);
  const [quote, setQuote] = React.useState<QuoteResponse | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const canCotizar = Boolean(canchaId && date && startTime && endTime && !quoting);
  const canConfirm = Boolean(quote && !confirming);

  const handleCotizar = async () => {
    try {
      setError(null);
      setQuoting(true);
      setQuote(null);
      const q = await postCotizar({
        canchaId,
        date,
        startTime,
        endTime,
        note: note.trim() || undefined,
      });
      setQuote(q);
    } catch (e: any) {
      setError(e?.message || "No se pudo cotizar");
    } finally {
      setQuoting(false);
    }
  };

  const handleConfirmar = async () => {
    if (!quote) return;
    try {
      setError(null);
      setConfirming(true);
      const r = await postReservar({
        canchaId,
        date,
        startTime,
        endTime,
        note: note.trim() || undefined,
        ...(quote.quoteId ? { quoteId: quote.quoteId } : {}),
      });

      Alert.alert("¡Reserva confirmada!", "Tu reserva fue creada correctamente.");
      // Llevar a Mis reservas (esa pantalla se refresca al enfocarse)
      router.navigate("/(tabs)/mis-reservas");

      // Si prefieres ir directo al detalle, cambia por:
      // router.replace({ pathname: "/reservadetalle/[id]", params: { id: r.id } });
    } catch (e: any) {
      setError(e?.message || "No se pudo confirmar la reserva");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 8 }}>
          <Ionicons name="chevron-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reservar cancha</Text>
      </View>

      {/* Form */}
      <View style={styles.card}>
        <Field
          icon="calendar-outline"
          label="Fecha (YYYY-MM-DD)"
          value={date}
          placeholder="2025-10-20"
          onChangeText={setDate}
        />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field
              icon="time-outline"
              label="Inicio (HH:mm)"
              value={startTime}
              placeholder="18:00"
              onChangeText={setStartTime}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              icon="time-outline"
              label="Término (HH:mm)"
              value={endTime}
              placeholder="19:00"
              onChangeText={setEndTime}
            />
          </View>
        </View>

        <Field
          icon="document-text-outline"
          label="Nota (opcional)"
          value={note}
          placeholder="Ej: Traer pelotas n°5"
          onChangeText={setNote}
        />

        {/* Sugerencias rápidas */}
        <View style={{ marginTop: 4 }}>
          <Text style={styles.subLabel}>Sugerencias rápidas</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {["18:00-19:00", "19:00-20:00", "20:00-21:00"].map((slot) => (
              <TouchableOpacity
                key={slot}
                onPress={() => {
                  const [ini, fin] = slot.split("-");
                  setStartTime(ini);
                  setEndTime(fin);
                }}
                style={styles.chip}
              >
                <Text style={{ fontWeight: "700", color: "#0f172a" }}>{slot}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Botón Cotizar */}
        <TouchableOpacity
          onPress={handleCotizar}
          disabled={!canCotizar}
          style={[styles.btnPrimary, { opacity: canCotizar ? 1 : 0.6, marginTop: 12 }]}
        >
          {quoting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="cash-outline" size={16} color="#fff" />
              <Text style={styles.btnPrimaryText}>Cotizar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Resultado de la cotización */}
      {quote && (
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.blockTitle}>Resumen de cotización</Text>
          {quote.breakdown?.map((b, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.rowLabel}>{b.label}</Text>
              <CLP value={b.amount} currency={quote.currency || "CLP"} />
            </View>
          ))}
          <View style={styles.sep} />
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { fontWeight: "900" }]}>Total</Text>
            <CLP value={quote.totalPrice} currency={quote.currency || "CLP"} />
          </View>
          {quote.expiresAt ? (
            <Text style={{ color: "#6b7280", marginTop: 6 }}>
              Cotización válida hasta: {quote.expiresAt}
            </Text>
          ) : null}

          {/* Botón Confirmar */}
          <TouchableOpacity
            onPress={handleConfirmar}
            disabled={!canConfirm}
            style={[
              styles.btnConfirm,
              { opacity: canConfirm ? 1 : 0.6, marginTop: 12 },
            ]}
          >
            {confirming ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.btnConfirmText}>Confirmar reserva</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Errores */}
      {error ? (
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <Text style={{ color: "#991b1b", textAlign: "center" }}>{error}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

/* --- Subcomponentes --- */
function Field({
  icon,
  label,
  value,
  placeholder,
  onChangeText,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  placeholder?: string;
  onChangeText: (t: string) => void;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
        <Ionicons name={icon} size={18} color={TEAL} />
        <Text style={[styles.label, { marginLeft: 6 }]}>{label}</Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        autoCapitalize="none"
        style={styles.input}
      />
    </View>
  );
}

/* --- Estilos --- */
const styles = StyleSheet.create({
  header: {
    backgroundColor: TEAL,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "900" },

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
  subLabel: { color: "#0f172a", fontWeight: "800", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  chip: {
    backgroundColor: "#e5e7eb",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },

  blockTitle: { fontWeight: "900", color: "#0f172a", marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  rowLabel: { color: "#334155" },
  sep: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 8 },

  btnPrimary: {
    backgroundColor: "#0f172a",
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "900" },

  btnConfirm: {
    backgroundColor: "#16a34a",
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnConfirmText: { color: "#fff", fontWeight: "900" },
});
