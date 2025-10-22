// app/(resenas)/resenas.tsx
import React, { useMemo, useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Platform, Alert, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "http://api-h1d7oi-a881cc-168-232-167-73.traefik.me/api/v1";
const TEAL = "#0ea5a4";

/* ================== Token + User ================== */
async function getToken(): Promise<string | null> {
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

function b64UrlDecode(str: string) {
  try {
    const pad = "=".repeat((4 - (str.length % 4)) % 4);
    const base64 = (str.replace(/-/g, "+").replace(/_/g, "/")) + pad;
    if (typeof (globalThis as any).atob === "function") {
      return (globalThis as any).atob(base64);
    }
    // @ts-ignore (para RN)
    return Buffer ? Buffer.from(base64, "base64").toString("binary") : null;
  } catch {
    return null;
  }
}
function parseJwt(token?: string | null): any | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const json = b64UrlDecode(parts[1]);
    if (!json) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}
async function getMyUserIdFromToken(): Promise<number | null> {
  const t = await getToken();
  const p = parseJwt(t);
  const id =
    p?.id_usuario ?? p?.user_id ?? p?.sub_id ?? // variantes típicas
    (typeof p?.sub === "number" ? p.sub : Number(p?.sub));
  return typeof id === "number" && !Number.isNaN(id) ? id : null;
}

/* ================== Fetch helpers ================== */
async function safeRead(res: Response) {
  try {
    const data = await res.json();
    return { text: data?.detail || data?.message || JSON.stringify(data), status: res.status };
  } catch {
    try {
      const t = await res.text();
      return { text: t, status: res.status };
    } catch {
      return { text: "", status: res.status };
    }
  }
}

async function postReview(input: {
  token: string;
  id_reserva: number;
  id_cancha?: number;
  id_complejo?: number;
  calificacion: number;
  comentario?: string;
}) {
  const res = await fetch(`${API_URL}/resenas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.token}`,
    },
    body: JSON.stringify({
      id_reserva: input.id_reserva,
      id_cancha: input.id_cancha,
      id_complejo: input.id_complejo,
      calificacion: input.calificacion,
      comentario: input.comentario || "",
    }),
  });
  if (!res.ok) {
    const { text, status } = await safeRead(res);
    const err: any = new Error(text || `Error ${status}`);
    err.status = status;
    throw err;
  }
  return res.json();
}

async function patchReview(input: {
  token: string;
  id_resena: number;
  calificacion: number;
  comentario?: string;
}) {
  const res = await fetch(`${API_URL}/resenas/${input.id_resena}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.token}`,
    },
    body: JSON.stringify({
      calificacion: input.calificacion,
      comentario: input.comentario || "",
    }),
  });
  if (!res.ok) {
    const { text, status } = await safeRead(res);
    const err: any = new Error(text || `Error ${status}`);
    err.status = status;
    throw err;
  }
  return res.json();
}

/** Lista reseñas por cancha/complejo y devuelve la que sea del usuario actual (si existe). */
async function getMyExistingReview(params: {
  token: string;
  id_cancha?: number;
  id_complejo?: number;
}): Promise<{ id_resena: number } | null> {
  const qs: string[] = [];
  if (params.id_cancha) qs.push(`id_cancha=${encodeURIComponent(params.id_cancha)}`);
  if (params.id_complejo) qs.push(`id_complejo=${encodeURIComponent(params.id_complejo)}`);
  const url = `${API_URL}/resenas${qs.length ? `?${qs.join("&")}` : ""}`;

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${params.token}` },
  });
  if (!res.ok) return null;

  const meId = await getMyUserIdFromToken();
  const data = await res.json();
  const arr: any[] = Array.isArray(data) ? data : data?.data ?? data?.items ?? [];

  // Buscamos la que sea del usuario actual
  const mine =
    arr.find((x) => Number(x?.id_usuario ?? x?.usuario_id ?? x?.user?.id) === meId) ??
    null;

  if (!mine) return null;

  const idR = Number(mine?.id ?? mine?.id_resena ?? mine?.resena_id);
  return Number.isFinite(idR) ? { id_resena: idR } : null;
}

/* ================== Pantalla ================== */
export default function ResenasScreen() {
  const params = useLocalSearchParams<{
    reservationId?: string;
    venueId?: string;    // id_complejo
    canchaId?: string;   // id_cancha
    venueName?: string;
    date?: string;
    startTime?: string;
    endTime?: string;

    // edición (opcional, si vienes desde Mis reseñas con una existente)
    id_resena?: string;
    current_rating?: string;
    current_comment?: string;
  }>();

  const reservationId = params?.reservationId || "";
  const venueId = params?.venueId || "";
  const canchaId = params?.canchaId || "";
  const venueName = params?.venueName || "Complejo";
  const date = params?.date || "";
  const startTime = params?.startTime || "";
  const endTime = params?.endTime || "";

  const isEditing = !!params?.id_resena;
  const initialRating = params?.current_rating ? Number(params.current_rating) : 5;
  const initialComment = params?.current_comment || "";

  const [rating, setRating] = useState(Math.min(Math.max(initialRating || 5, 1), 5));
  const [comment, setComment] = useState(initialComment);
  const [token, setToken] = useState<string>("");

  useEffect(() => { getToken().then((t) => setToken(t || "")); }, []);
  const queryClient = useQueryClient();

  const canSubmit = useMemo(() => {
    const idReservaNum = Number(reservationId);
    const idCanchaNum = Number(canchaId);
    const idComplejoNum = Number(venueId);
    const hasContext = (!isNaN(idCanchaNum) && idCanchaNum > 0) || (!isNaN(idComplejoNum) && idComplejoNum > 0);
    return !!token && idReservaNum > 0 && rating >= 1 && rating <= 5 && hasContext;
  }, [token, reservationId, rating, canchaId, venueId]);

  const mCreate = useMutation({ mutationFn: postReview });
  const mUpdate = useMutation({ mutationFn: patchReview });

  const handleSubmit = async () => {
    if (!canSubmit) {
      const m = !token ? "Debes iniciar sesión." : "Faltan datos para enviar la reseña.";
      if (Platform.OS === "web") window.alert(m); else Alert.alert("Aviso", m);
      return;
    }

    try {
      if (isEditing) {
        // ya venimos con id_resena -> actualizar
        await mUpdate.mutateAsync({
          token,
          id_resena: Number(params.id_resena),
          calificacion: rating,
          comentario: comment.trim(),
        });
      } else {
        // intentar crear
        await mCreate.mutateAsync({
          token,
          id_reserva: Number(reservationId),
          id_cancha: Number(canchaId) || undefined,
          id_complejo: Number(venueId) || undefined,
          calificacion: rating,
          comentario: comment.trim(),
        });
      }

      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["mis-reservas"] }),
        queryClient.invalidateQueries({ queryKey: ["resenas"] }),
      ]);

      const okMsg = isEditing ? "Tu reseña fue actualizada." : "¡Gracias! Tu reseña fue enviada.";
      if (Platform.OS === "web") window.alert(okMsg); else Alert.alert("Listo", okMsg);
      router.canGoBack() ? router.back() : router.replace("/(perfil)/mis-resenas");
    } catch (e: any) {
      const text = String(e?.message || "");
      const status = Number(e?.status || 0);
      const looksLikeDuplicate =
        status === 409 ||
        /duplicate key|already exists|unique constraint/i.test(text);

      // 🔁 Upsert automático: si ya existe, buscamos la del usuario y hacemos PATCH
      if (!isEditing && looksLikeDuplicate) {
        try {
          const existing = await getMyExistingReview({
            token,
            id_cancha: Number(canchaId) || undefined,
            id_complejo: Number(venueId) || undefined,
          });
          if (existing?.id_resena) {
            await mUpdate.mutateAsync({
              token,
              id_resena: existing.id_resena,
              calificacion: rating,
              comentario: comment.trim(),
            });

            await Promise.allSettled([
              queryClient.invalidateQueries({ queryKey: ["mis-reservas"] }),
              queryClient.invalidateQueries({ queryKey: ["resenas"] }),
            ]);
            const okMsg = "Ya tenías una reseña para esta cancha; se actualizó con tu nuevo contenido.";
            if (Platform.OS === "web") window.alert(okMsg); else Alert.alert("Listo", okMsg);
            router.canGoBack() ? router.back() : router.replace("/(perfil)/mis-resenas");
            return;
          }
        } catch {
          // si falla el fallback, seguimos al flujo de error normal abajo
        }
      }

      const m =
        text ||
        (isEditing ? "No se pudo actualizar la reseña." : "No se pudo enviar la reseña.");
      if (Platform.OS === "web") window.alert(m); else Alert.alert("Error", m);
    }
  };

  const isPending = mCreate.isPending || mUpdate.isPending;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(perfil)/mis-resenas"))}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={TEAL} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? "Editar reseña" : "Dejar reseña"}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Info de reserva */}
        <View style={styles.card}>
          <Text style={styles.complejo}>{venueName}</Text>
          <Text style={styles.fecha}>
            {date ? `${date}` : ""} {startTime ? `• ${startTime}` : ""} {endTime ? `– ${endTime}` : ""}
          </Text>
        </View>

        {/* Calificación */}
        <Text style={styles.sectionTitle}>Tu calificación</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity key={n} style={styles.starBtn} onPress={() => setRating(n)}>
              <Ionicons
                name={n <= rating ? "star" : "star-outline"}
                size={36}
                color={n <= rating ? "#facc15" : "#94a3b8"}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Comentario */}
        <Text style={styles.sectionTitle}>Comentario (opcional)</Text>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="¿Qué te pareció la cancha, la iluminación, la atención...?"
          placeholderTextColor="#94a3b8"
          multiline
          style={styles.input}
          maxLength={600}
        />
      </ScrollView>

      {/* Botón guardar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btnPrimary, isPending && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={isPending}
        >
          {isPending ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>{isEditing ? "Guardar cambios" : "Guardar reseña"}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ================== Estilos ================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
    paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", backgroundColor: "#ffffff",
  },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "900", color: "#0f172a" },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  card: { backgroundColor: "#ecfeff", borderColor: "#99f6e4", borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  complejo: { fontSize: 18, fontWeight: "900", color: "#0f172a" },
  fecha: { marginTop: 4, color: "#475569", fontWeight: "500" },
  sectionTitle: { fontWeight: "800", marginTop: 10, marginBottom: 4, color: "#0f172a", fontSize: 15 },
  starsRow: { flexDirection: "row", gap: 6, marginVertical: 8 },
  starBtn: { padding: 4 },
  input: {
    borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb",
    borderRadius: 12, padding: 12, minHeight: 120, textAlignVertical: "top", color: "#0f172a", fontSize: 15,
  },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: "#e5e7eb", backgroundColor: "#fff" },
  btnPrimary: {
    backgroundColor: TEAL, height: 46, borderRadius: 10, paddingHorizontal: 16,
    alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },
});
