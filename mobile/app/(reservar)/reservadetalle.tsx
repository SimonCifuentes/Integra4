// app/(tabs)/reservadetalle.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "http://api-h1d7oi-a881cc-168-232-167-73.traefik.me/api/v1";
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

  id_cancha?: number | string;
  id_complejo?: number | string;

  cancha?: { id?: string | number; nombre?: string };
  cancha_id?: string | number;
  cancha_nombre?: string;

  complejo?: { id?: string | number; nombre?: string; direccion?: string };
  complejo_id?: string | number;
  complejo_nombre?: string;

  venue?: { id?: string; name?: string; address?: string };
};

type ReservaState = {
  id?: string;
  fecha?: string;
  inicio?: string;
  fin?: string;
  estado?: string;
  cancha?: string;
  complejo?: string;
  direccion?: string;
  notas?: string;
  id_cancha?: number;
  id_complejo?: number;
};

type Resena = {
  id_resena: number;
  id_cancha: number | null;
  id_complejo?: number | null;
  calificacion: number;
  comentario: string | null;
};

async function getToken() {
  try {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return (
        window.localStorage.getItem("token") ||
        window.localStorage.getItem("accessToken")
      );
    }
    return (
      (await SecureStore.getItemAsync("token")) ||
      (await SecureStore.getItemAsync("accessToken"))
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

async function apiPatch<T>(path: string, body?: any): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
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
  const sty =
    map[(estado ?? "").toLowerCase()] ?? {
      bg: "#e5e7eb",
      fg: "#374151",
      label: estado ?? "—",
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
      <Text style={{ color: sty.fg, fontWeight: "800" }}>{sty.label}</Text>
    </View>
  );
}

export default function ReservaDetalleScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    cancha?: string;
    complejo?: string;
    fecha?: string;
    hora?: string;
    inicio?: string;
    fin?: string;
    estado?: string;
    notas?: string;
  }>();

  const [loading, setLoading] = useState(false);
  const [reserva, setReserva] = useState<ReservaState>({
    id: params.id,
    fecha: params.fecha,
    inicio: params.inicio,
    fin: params.fin,
    estado: params.estado,
    cancha: params.cancha,
    complejo: params.complejo,
    notas: params.notas,
    id_cancha: undefined,
    id_complejo: undefined,
  });

  // --- reseña existente ---
  const [loadingReview, setLoadingReview] = useState(false);
  const [existingReview, setExistingReview] = useState<Resena | null>(null);

  // --- modal reseña ---
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [sendingReview, setSendingReview] = useState(false);

  // --- modal reprogramar ---
  const [reprogramModalVisible, setReprogramModalVisible] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [savingReprogram, setSavingReprogram] = useState(false);

  useEffect(() => {
    if (!reserva.inicio && !reserva.fin && params.hora) {
      const [h1, h2] = String(params.hora).split("-").map((s) => s.trim());
      setReserva((prev) => ({ ...prev, inicio: h1, fin: h2 }));
    }
  }, [params.hora]);

  // Cargar detalle de reserva si faltan datos
  useEffect(() => {
    const needFetch =
      !!params.id &&
      (!reserva.fecha ||
        !reserva.inicio ||
        !reserva.fin ||
        !reserva.cancha ||
        !reserva.complejo ||
        reserva.id_cancha == null ||
        reserva.id_complejo == null);

    if (!needFetch) {
      // sincronizar campos de reprogramación con lo que ya tenemos
      setNewDate(reserva.fecha ?? "");
      setNewStart(reserva.inicio ?? "");
      setNewEnd(reserva.fin ?? "");
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const be = await apiGet<ReservaBE>(`/reservas/${params.id}`);

        const id = be.id ?? be.id_reserva ?? params.id;
        const fecha = be.fecha ?? be.fecha_reserva ?? reserva.fecha;
        const inicio = be.inicio ?? be.hora_inicio ?? reserva.inicio;
        const fin = be.fin ?? be.hora_fin ?? reserva.fin;
        const estado = be.estado ?? be.status ?? reserva.estado;

        const canchaNombre =
          be?.cancha?.nombre ?? be.cancha_nombre ?? reserva.cancha;
        const complejoNombre =
          be?.complejo?.nombre ??
          be.complejo_nombre ??
          be?.venue?.name ??
          reserva.complejo;
        const direccion =
          be?.complejo?.direccion ?? be?.venue?.address ?? undefined;

        const idCancha =
          be?.cancha?.id ?? be.id_cancha ?? be.cancha_id ?? undefined;
        const idComplejo =
          be?.complejo?.id ?? be.id_complejo ?? be.complejo_id ?? undefined;

        const next: ReservaState = {
          id: String(id ?? ""),
          fecha,
          inicio,
          fin,
          estado,
          cancha: canchaNombre,
          complejo: complejoNombre,
          direccion,
          notas: be.notas ?? reserva.notas,
          id_cancha: idCancha != null ? Number(idCancha) : undefined,
          id_complejo: idComplejo != null ? Number(idComplejo) : undefined,
        };

        setReserva(next);
        setNewDate(next.fecha ?? "");
        setNewStart(next.inicio ?? "");
        setNewEnd(next.fin ?? "");
      } catch (err: any) {
        const msg =
          err?.message && typeof err.message === "string"
            ? err.message
            : "No se pudo cargar la reserva.";
        if (Platform.OS === "web") window.alert(msg);
        else Alert.alert("Error", msg);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // Cargar reseña propia si ya existe para esta cancha
  useEffect(() => {
    if (!reserva.id_cancha) {
      setExistingReview(null);
      return;
    }

    (async () => {
      try {
        setLoadingReview(true);
        const data = await apiGet<any>(
          `/resenas/mias?id_cancha=${reserva.id_cancha}`
        );
        const list: any[] = Array.isArray(data)
          ? data
          : data?.data ?? data?.items ?? [];
        const r = list[0] as Resena | undefined;
        setExistingReview(r ?? null);

        if (r) {
          setReviewRating(r.calificacion ?? 5);
          setReviewComment(r.comentario ?? "");
        }
      } catch (e) {
        // silencioso; no es crítico si falla
      } finally {
        setLoadingReview(false);
      }
    })();
  }, [reserva.id_cancha]);

  const fechaHoraFmt = useMemo(() => {
    const { fecha, inicio, fin } = reserva;
    if (!fecha && !inicio && !fin) return "—";
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
      return [fecha ?? "", [inicio, fin].filter(Boolean).join("–")]
        .filter(Boolean)
        .join(" • ");
    }
  }, [reserva]);

  const cancelar = async () => {
    if (!reserva.id) return;
    const msg = `¿Cancelar la reserva del ${
      reserva.fecha ?? "—"
    } entre ${reserva.inicio ?? "—"} y ${reserva.fin ?? "—"}?`;
    const go = async () => {
      try {
        await apiPost(`/reservas/${reserva.id}/cancelar`);
        const okMsg = "Reserva cancelada correctamente.";
        if (Platform.OS === "web") window.alert(okMsg);
        else Alert.alert("Listo", okMsg);
        router.replace("/(reservar)/mis-reservas");
      } catch (e: any) {
        const em = e?.message ?? "No se pudo cancelar la reserva.";
        if (Platform.OS === "web") window.alert(em);
        else Alert.alert("Error", em);
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

  const reservaPasada = useMemo(() => {
    if (!reserva.fecha || !reserva.fin) return false;
    try {
      const dt = new Date(`${reserva.fecha}T${reserva.fin}:00`);
      return dt.getTime() <= Date.now();
    } catch {
      return false;
    }
  }, [reserva.fecha, reserva.fin]);

  const puedeModificar = useMemo(() => {
    if (estadoLower === "cancelada") return false;
    return !reservaPasada;
  }, [estadoLower, reservaPasada]);

  const puedeCancelar = puedeModificar;

  const puedeReseniar = useMemo(() => {
    const confirmed =
      estadoLower === "confirmada" ||
      estadoLower === "confirmed" ||
      estadoLower === "finalizada" ||
      estadoLower === "completed";
    return (
      confirmed &&
      reservaPasada &&
      (!!reserva.id_cancha || !!reserva.id_complejo)
    );
  }, [estadoLower, reservaPasada, reserva.id_cancha, reserva.id_complejo]);

  const enviarResena = async () => {
    if (!reserva.id_cancha && !reserva.id_complejo) {
      const msg = "Falta id_cancha o id_complejo en la reserva.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Error", msg);
      return;
    }

    try {
      setSendingReview(true);

      const body: any = {
        calificacion: reviewRating,
        comentario: reviewComment,
      };

      if (reserva.id_cancha) {
        body.id_cancha = reserva.id_cancha;
      }
      if (reserva.id_complejo) {
        body.id_complejo = reserva.id_complejo;
      }

      if (existingReview) {
        await apiPatch(`/resenas/${existingReview.id_resena}`, body);
        const okMsg = "Tu reseña se actualizó correctamente.";
        if (Platform.OS === "web") window.alert(okMsg);
        else Alert.alert("Listo", okMsg);
      } else {
        await apiPost("/resenas", body);
        const okMsg = "¡Gracias! Tu reseña se envió correctamente.";
        if (Platform.OS === "web") window.alert(okMsg);
        else Alert.alert("Gracias", okMsg);
      }

      setReviewModalVisible(false);

      if (reserva.id_cancha) {
        try {
          const data = await apiGet<any>(
            `/resenas/mias?id_cancha=${reserva.id_cancha}`
          );
          const list: any[] = Array.isArray(data)
            ? data
            : data?.data ?? data?.items ?? [];
          const r = list[0] as Resena | undefined;
          setExistingReview(r ?? null);
        } catch {
          // silencioso
        }
      }
    } catch (e: any) {
      const raw = e?.message || "";
      let msg = raw || "No se pudo enviar la reseña. Inténtalo nuevamente.";
      if (typeof raw === "string" && raw.includes("uq_resena_user_cancha")) {
        msg =
          "Ya tienes una reseña para esta cancha. Vamos a cargarla para que puedas editarla.";
        if (reserva.id_cancha) {
          try {
            const data = await apiGet<any>(
              `/resenas/mias?id_cancha=${reserva.id_cancha}`
            );
            const list: any[] = Array.isArray(data)
              ? data
              : data?.data ?? data?.items ?? [];
            const r = list[0] as Resena | undefined;
            setExistingReview(r ?? null);
            if (r) {
              setReviewRating(r.calificacion ?? 5);
              setReviewComment(r.comentario ?? "");
            }
          } catch {
            /* ignore */
          }
        }
      }
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Error", msg);
    } finally {
      setSendingReview(false);
    }
  };

  const openReprogramModal = () => {
    setNewDate(reserva.fecha ?? "");
    setNewStart(reserva.inicio ?? "");
    setNewEnd(reserva.fin ?? "");
    setReprogramModalVisible(true);
  };

  const reprogramar = async () => {
    if (!reserva.id) return;

    if (!newDate || !newStart || !newEnd) {
      const msg = "Completa fecha, hora de inicio y fin para reprogramar.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Faltan datos", msg);
      return;
    }

    try {
      setSavingReprogram(true);
      await apiPatch(`/reservas/${reserva.id}`, {
        fecha: newDate,
        hora_inicio: newStart,
        hora_fin: newEnd,
      });

      setReserva((prev) => ({
        ...prev,
        fecha: newDate,
        inicio: newStart,
        fin: newEnd,
      }));

      const msg = "Reserva reprogramada correctamente.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Listo", msg);

      setReprogramModalVisible(false);
    } catch (e: any) {
      const em = e?.message ?? "No se pudo reprogramar la reserva.";
      if (Platform.OS === "web") window.alert(em);
      else Alert.alert("Error", em);
    } finally {
      setSavingReprogram(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 4, marginRight: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Detalle de reserva</Text>
      </View>

      {loading ? (
        <View style={{ padding: 16 }}>
          <ActivityIndicator />
        </View>
      ) : null}

      <View style={styles.card}>
        <View
          style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
        >
          <Ionicons name="calendar-outline" size={18} color={TEAL} />
          <Text style={[styles.label, { marginLeft: 6 }]}>Fecha y hora</Text>
        </View>
        <Text style={styles.value}>{fechaHoraFmt}</Text>

        <View style={styles.sep} />

        <View
          style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
        >
          <Ionicons name="business-outline" size={18} color={TEAL} />
          <Text style={[styles.label, { marginLeft: 6 }]}>Complejo</Text>
        </View>
        <Text style={styles.value}>{reserva.complejo ?? "—"}</Text>
        {!!reserva.direccion && (
          <Text style={[styles.value, { color: "#64748b" }]}>
            {reserva.direccion}
          </Text>
        )}

        <View style={styles.sep} />

        <View
          style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
        >
          <Ionicons name="football-outline" size={18} color={TEAL} />
          <Text style={[styles.label, { marginLeft: 6 }]}>Cancha</Text>
        </View>
        <Text style={styles.value}>
          {reserva.cancha ?? "—"}
          {reserva.id_cancha != null ? ` (ID: ${reserva.id_cancha})` : ""}
        </Text>

        <View style={styles.sep} />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={TEAL}
            />
            <Text style={[styles.label, { marginLeft: 6 }]}>Estado</Text>
          </View>
          <Badge estado={(estadoLower as Estado) || "pendiente"} />
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => {
            // TODO: agregar a calendario si corresponde
          }}
        >
          <Ionicons name="calendar" color="#fff" size={16} />
          <Text style={styles.btnPrimaryText}>Agregar al calendario</Text>
        </TouchableOpacity>

        {puedeModificar && (
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={openReprogramModal}
          >
            <Ionicons name="swap-horizontal-outline" color={TEAL} size={16} />
            <Text style={styles.btnSecondaryText}>Reprogramar reserva</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.btnOutline,
            !puedeCancelar && { opacity: 0.55 },
          ]}
          onPress={cancelar}
          disabled={!puedeCancelar}
        >
          <Ionicons name="close-circle-outline" color={TEAL} size={16} />
          <Text style={styles.btnOutlineText}>Cancelar reserva</Text>
        </TouchableOpacity>

        {puedeReseniar && (
          <TouchableOpacity
            style={styles.btnReview}
            onPress={() => {
              setReviewRating(existingReview?.calificacion ?? 5);
              setReviewComment(existingReview?.comentario ?? "");
              setReviewModalVisible(true);
            }}
          >
            <Ionicons
              name={existingReview ? "create-outline" : "star-outline"}
              size={16}
              color="#f59e0b"
            />
            <Text style={styles.btnReviewText}>
              {existingReview ? "Editar reseña" : "Dejar reseña"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.card, { marginTop: 12 }]}>
        <Text style={[styles.label, { marginBottom: 6 }]}>Notas</Text>
        <Text style={{ color: "#475569" }}>
          {reserva.notas?.trim() ? reserva.notas : "—"}
        </Text>
      </View>

      {/* Política de cancelación */}
      <View style={[styles.card, { marginTop: 12 }]}>
        <Text style={[styles.label, { marginBottom: 6 }]}>
          Política de cancelación
        </Text>
        <Text style={{ color: "#475569", marginBottom: 4 }}>
          • Puedes cancelar o reprogramar la reserva desde la app mientras la
          hora de inicio aún no haya pasado.
        </Text>
        <Text style={{ color: "#475569", marginBottom: 4 }}>
          • Una vez iniciada la reserva, las modificaciones y devoluciones
          quedan sujetas a las condiciones del complejo.
        </Text>
        <Text style={{ color: "#94a3b8", fontSize: 12 }}>
          Esta política es referencial y puede variar según el complejo o
          promociones vigentes.
        </Text>
      </View>

      {/* Reseña existente */}
      {loadingReview && (
        <View style={{ marginTop: 12, paddingHorizontal: 16 }}>
          <ActivityIndicator />
        </View>
      )}

      {existingReview && !loadingReview && (
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={[styles.label, { marginBottom: 6 }]}>Tu reseña</Text>
          <View style={styles.existingStarsRow}>
            {Array.from({ length: 5 }).map((_, i) => {
              const filled = i + 1 <= existingReview.calificacion;
              return (
                <Ionicons
                  key={i}
                  name={filled ? "star" : "star-outline"}
                  size={20}
                  color={filled ? "#f59e0b" : "#d1d5db"}
                  style={{ marginRight: 4 }}
                />
              );
            })}
          </View>
          <Text style={{ color: "#475569", marginTop: 4 }}>
            {existingReview.comentario?.trim()
              ? existingReview.comentario
              : "Sin comentario."}
          </Text>
        </View>
      )}

      {/* Modal reprogramar */}
      <Modal
        visible={reprogramModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReprogramModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reprogramar reserva</Text>
            <Text style={styles.modalSubtitle}>
              {reserva.cancha}
              {reserva.complejo ? ` · ${reserva.complejo}` : ""}
            </Text>

            <Text style={styles.modalLabel}>Fecha (YYYY-MM-DD)</Text>
            <TextInput
              value={newDate}
              onChangeText={setNewDate}
              placeholder="Ej: 2025-10-20"
              style={styles.textareaSmall}
            />

            <Text style={styles.modalLabel}>Hora inicio (HH:MM)</Text>
            <TextInput
              value={newStart}
              onChangeText={setNewStart}
              placeholder="Ej: 19:00"
              style={styles.textareaSmall}
            />

            <Text style={styles.modalLabel}>Hora término (HH:MM)</Text>
            <TextInput
              value={newEnd}
              onChangeText={setNewEnd}
              placeholder="Ej: 20:00"
              style={styles.textareaSmall}
            />

            <Text
              style={{
                color: "#6b7280",
                fontSize: 12,
                marginTop: 6,
              }}
            >
              La reprogramación mantiene el mismo complejo y cancha. El horario
              queda sujeto a disponibilidad real del complejo.
            </Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.btnSmall, styles.btnNeutral]}
                onPress={() => setReprogramModalVisible(false)}
                disabled={savingReprogram}
              >
                <Text style={styles.btnSmallText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.btnSmall,
                  styles.btnPrimary,
                  savingReprogram && { opacity: 0.7 },
                ]}
                onPress={reprogramar}
                disabled={savingReprogram}
              >
                {savingReprogram ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.btnSmallText, { color: "#fff" }]}>
                    Guardar cambios
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal reseña */}
      <Modal
        visible={reviewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Califica tu experiencia</Text>
            <Text style={styles.modalSubtitle}>
              {reserva.cancha}
              {reserva.complejo ? ` · ${reserva.complejo}` : ""}
            </Text>

            <View style={styles.starsRow}>
              {Array.from({ length: 5 }).map((_, i) => {
                const filled = i < reviewRating;
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setReviewRating(i + 1)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={filled ? "star" : "star-outline"}
                      size={28}
                      color="#f59e0b"
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.modalLabel}>Comentario (opcional)</Text>
            <TextInput
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="¿Cómo estuvo la cancha, la atención, el lugar...?"
              multiline
              style={styles.textarea}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.btnSmall, styles.btnNeutral]}
                onPress={() => setReviewModalVisible(false)}
                disabled={sendingReview}
              >
                <Text style={styles.btnSmallText}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.btnSmall,
                  styles.btnPrimary,
                  sendingReview && { opacity: 0.7 },
                ]}
                onPress={enviarResena}
                disabled={sendingReview}
              >
                {sendingReview ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.btnSmallText, { color: "#fff" }]}>
                    {existingReview ? "Actualizar reseña" : "Enviar reseña"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  btnSecondary: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c4b5fd",
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnSecondaryText: {
    color: "#4c1d95",
    fontWeight: "800",
  },

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

  btnReview: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnReviewText: { color: "#92400e", fontWeight: "800" },

  existingStarsRow: {
    flexDirection: "row",
    marginTop: 4,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  modalSubtitle: {
    color: "#6b7280",
    marginTop: 4,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    marginBottom: 10,
  },
  modalLabel: {
    fontWeight: "600",
    marginTop: 6,
    marginBottom: 4,
  },
  textarea: {
    minHeight: 80,
    maxHeight: 140,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 8,
    textAlignVertical: "top",
    backgroundColor: "#f9fafb",
  },
  textareaSmall: {
    height: 42,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 8,
    backgroundColor: "#f9fafb",
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
  },
  btnSmall: {
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnNeutral: {
    backgroundColor: "#f1f5f9",
  },
  btnSmallText: {
    fontWeight: "700",
    color: "#0f172a",
  },
});
