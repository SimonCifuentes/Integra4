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

/* --- Config --- */
const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://tu-api.com";
const TEAL = "#0d9488";

/* --- Tipos --- */
type SlotBE = {
  inicio: string; // "08:00"
  fin: string; // "09:00"
  precio?: number;
};

type QuoteResponse = {
  quoteId?: string;
  total?: number;
  moneda?: string;
};

/* --- Helpers para token --- */
async function getToken(): Promise<string | null> {
  try {
    return (await getItemAsync("token")) ?? null;
  } catch {
    return null;
  }
}

/* --- API calls (cotizar / reservar) --- */
async function postCotizar(payload: {
  canchaId: string | string[];
  date: string;
  startTime: string;
  endTime: string;
  note?: string;
  couponCode?: string;
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
  const data = await res.json().catch(() => ({}));
  return (data?.data ?? data) as QuoteResponse;
}

async function postReservar(payload: {
  canchaId: string | string[];
  date: string;
  startTime: string;
  endTime: string;
  note?: string;
  quoteId?: string;
  couponCode?: string;
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
    throw new Error(`Error ${res.status}: ${txt || "No se pudo reservar"}`);
  }
  const data = await res.json().catch(() => ({}));
  return (data?.data ?? data) as { id: string };
}

/**
 * Obtiene slots disponibles para una cancha en una fecha
 * GET /canchas/:id/disponibilidad?date=YYYY-MM-DD
 */
async function fetchSlots(
  canchaId: string,
  date: string
): Promise<SlotBE[]> {
  const token = await getToken();
  const url = `${API_URL}/canchas/${canchaId}/disponibilidad?date=${encodeURIComponent(
    date
  )}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Error ${res.status}: ${txt || "No se pudo cargar la disponibilidad"}`
    );
  }

  const raw = await res.json().catch(() => []);
  const arr = Array.isArray(raw) ? raw : raw?.data ?? raw?.items ?? [];
  return (arr || []) as SlotBE[];
}

/* --- Helpers --- */
function CLP({ value, currency = "CLP" }: { value?: number; currency?: string }) {
  if (typeof value !== "number") return null;
  return (
    <Text style={{ fontWeight: "900" }}>
      {Intl.NumberFormat("es-CL", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value)}
    </Text>
  );
}

function formatSlotLabel(slot: SlotBE) {
  return `${slot.inicio}–${slot.fin}`;
}

/**
 * Convierte "HH:MM" a { inicio, fin } en string
 * (ya viene así desde el backend, pero lo dejamos por claridad).
 */
function slotToHM(slot: SlotBE) {
  return {
    inicio: slot.inicio,
    fin: slot.fin,
  };
}

/* --- Screen --- */
export default function ReservaFlow() {
  const { canchaId } = useLocalSearchParams<{ canchaId: string }>();
  const router = useRouter();

  // Fecha manual (YYYY-MM-DD)
  const [date, setDate] = React.useState(""); // YYYY-MM-DD

  // Slots para la fecha seleccionada
  const [slots, setSlots] = React.useState<SlotBE[]>([]);
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [slotsError, setSlotsError] = React.useState<string | null>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = React.useState<number | null>(null);

  const [note, setNote] = React.useState("");
  const [coupon, setCoupon] = React.useState("");
  const [quoting, setQuoting] = React.useState(false);
  const [quote, setQuote] = React.useState<QuoteResponse | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selectedSlot =
    selectedSlotIndex != null ? slots[selectedSlotIndex] : null;

  const canCotizar = Boolean(
    canchaId && date && selectedSlot && !quoting && !slotsLoading
  );
  const canConfirm = Boolean(quote && !confirming);

  /* --- Cargar slots cuando cambie fecha --- */
  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!canchaId || !date) {
        setSlots([]);
        setSelectedSlotIndex(null);
        return;
      }
      setSlotsLoading(true);
      setSlotsError(null);
      try {
        const list = await fetchSlots(String(canchaId), date);
        if (!cancelled) {
          setSlots(list);
        }
      } catch (e: any) {
        if (!cancelled) {
          setSlots([]);
          setSlotsError(
            e?.message || "No se pudo cargar la disponibilidad."
          );
        }
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [canchaId, date]);

  /* --- Actions --- */
  const handleCotizar = async () => {
    if (!canCotizar || !selectedSlot) return;
    try {
      setError(null);
      setQuoting(true);
      setQuote(null);

      const { inicio, fin } = slotToHM(selectedSlot);

      const q = await postCotizar({
        canchaId,
        date,
        startTime: inicio,
        endTime: fin,
        note: note.trim() || undefined,
        couponCode: coupon.trim() || undefined,
      });
      setQuote(q);
    } catch (e: any) {
      setError(e?.message || "No se pudo cotizar");
    } finally {
      setQuoting(false);
    }
  };

  const handleConfirmar = async () => {
    if (!quote || !selectedSlot) return;
    try {
      setError(null);
      setConfirming(true);

      const { inicio, fin } = slotToHM(selectedSlot);

      const r = await postReservar({
        canchaId,
        date,
        startTime: inicio,
        endTime: fin,
        note: note.trim() || undefined,
        couponCode: coupon.trim() || undefined,
        ...(quote.quoteId ? { quoteId: quote.quoteId } : {}),
      });

      Alert.alert(
        "¡Reserva confirmada!",
        "Tu reserva fue creada correctamente."
      );

      // Ir a Mis reservas (ajusta la ruta según tu app)
      router.navigate("/(tabs)/mis-reservas");

      // Si prefieres ir al detalle:
      // router.replace({ pathname: "/reservadetalle/[id]", params: { id: r.id } });
    } catch (e: any) {
      setError(e?.message || "No se pudo confirmar la reserva");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 8 }}>
          <Ionicons name="chevron-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reservar cancha</Text>
      </View>

      {/* Form */}
      <View style={styles.card}>
        {/* Fecha */}
        <Field
          icon="calendar-outline"
          label="Fecha (YYYY-MM-DD)"
          value={date}
          placeholder="2025-10-20"
          onChangeText={(v) => {
            setDate(v.trim());
          }}
        />

        {/* Horarios disponibles (slots desde la API) */}
        <View style={{ marginTop: 8 }}>
          <Text style={styles.subLabel}>Horarios disponibles</Text>

          {!date ? (
            <Text style={{ color: "#6b7280" }}>
              Ingresa una fecha para ver los horarios disponibles.
            </Text>
          ) : slotsLoading ? (
            <View style={{ paddingVertical: 8 }}>
              <ActivityIndicator />
              <Text style={{ color: "#6b7280", marginTop: 4 }}>
                Cargando disponibilidad…
              </Text>
            </View>
          ) : slotsError ? (
            <Text style={{ color: "#991b1b" }}>{slotsError}</Text>
          ) : slots.length === 0 ? (
            <Text style={{ color: "#6b7280" }}>
              No hay horarios disponibles para esta fecha.
            </Text>
          ) : (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
                gap: 8,
                marginTop: 4,
              }}
            >
              {slots.map((slot, idx) => {
                const isSelected = selectedSlotIndex === idx;
                return (
                  <TouchableOpacity
                    key={`${slot.inicio}-${slot.fin}-${idx}`}
                    onPress={() => setSelectedSlotIndex(idx)}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {formatSlotLabel(slot)}
                    </Text>
                    {typeof slot.precio === "number" && (
                      <Text
                        style={[
                          styles.chipPrice,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {Intl.NumberFormat("es-CL", {
                          style: "currency",
                          currency: "CLP",
                          maximumFractionDigits: 0,
                        }).format(slot.precio)}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Cupón opcional */}
        <Field
          icon="pricetag-outline"
          label="Cupón (opcional)"
          value={coupon}
          placeholder="Ej: PLAYTEMUCO10"
          onChangeText={setCoupon}
        />

        {/* Nota opcional */}
        <Field
          icon="document-text-outline"
          label="Nota (opcional)"
          value={note}
          placeholder="Ej: Traer pelotas n°5"
          onChangeText={setNote}
        />

        {/* Botón Cotizar */}
        <TouchableOpacity
          onPress={handleCotizar}
          disabled={!canCotizar}
          style={[
            styles.btnPrimary,
            { opacity: canCotizar ? 1 : 0.6, marginTop: 12 },
          ]}
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

        {/* Resultado cotización */}
        {quote && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.blockTitle}>Resumen</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Fecha</Text>
              <Text>{date}</Text>
            </View>
            {selectedSlot && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Horario</Text>
                <Text>{formatSlotLabel(selectedSlot)}</Text>
              </View>
            )}
            <View style={styles.sep} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Total</Text>
              <CLP value={quote.total} currency={quote.moneda || "CLP"} />
            </View>

            {/* Botón Confirmar */}
            <TouchableOpacity
              onPress={handleConfirmar}
              disabled={!canConfirm}
              style={[
                styles.btnConfirm,
                { opacity: canConfirm ? 1 : 0.6, marginTop: 14 },
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

        {error && (
          <Text style={{ color: "#b91c1c", marginTop: 12 }}>{error}</Text>
        )}
      </View>
    </View>
  );
}

/* --- Field component --- */
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
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}
      >
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
  subLabel: { color: "#0f172a", fontWeight: "800", marginBottom: 4 },

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
    width: "30%",
    alignItems: "center",
    justifyContent: "center",
  },
  chipSelected: {
    backgroundColor: "#d1fae5",
    borderWidth: 1,
    borderColor: TEAL,
  },
  chipText: {
    fontWeight: "700",
    color: "#111827",
  },
  chipTextSelected: {
    color: TEAL,
  },
  chipPrice: {
    fontSize: 12,
  },

  blockTitle: {
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
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
