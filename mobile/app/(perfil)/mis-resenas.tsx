// app/(perfil)/mis-resenas.tsx
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "@/src/stores/auth";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "http://api-h1d7oi-a881cc-168-232-167-73.traefik.me/api/v1";

/* ========= helpers token / api ========= */

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

async function apiGet<T>(path: string): Promise<T> {
  const token = await getToken();

  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const text = await res.text();

  if (!res.ok) {
    console.error("Error GET", path, res.status, text);
    const err = new Error(text || `HTTP ${res.status}`) as any;
    (err as any).status = res.status;
    throw err;
  }

  return text ? JSON.parse(text) : ({} as T);
}

/* ========= tipos ========= */

type ResenaUI = {
  id_resena: number;
  id_usuario: number;
  id_cancha: number;
  id_complejo: number;
  calificacion: number;
  comentario: string;
  esta_activa: boolean;
  created_at: string;
  updated_at: string;
  promedio_rating: number;
  total_resenas: number;
};

/* ========= fetch de reseñas ========= */

// llamamos a /resenas y filtramos por usuario en el front
async function fetchMisResenas(idUsuario: number): Promise<ResenaUI[]> {
  const raw = await apiGet<any>("/resenas?limit=50&offset=0");

  const list: any[] = Array.isArray(raw)
    ? raw
    : raw?.data ?? raw?.items ?? [];

  const soloUsuario = list.filter(
    (r) => Number(r.id_usuario) === Number(idUsuario)
  );

  return soloUsuario.map((r) => ({
    id_resena: r.id_resena,
    id_usuario: r.id_usuario,
    id_cancha: r.id_cancha,
    id_complejo: r.id_complejo,
    calificacion: r.calificacion,
    comentario: r.comentario,
    esta_activa: r.esta_activa,
    created_at: r.created_at,
    updated_at: r.updated_at,
    promedio_rating: r.promedio_rating,
    total_resenas: r.total_resenas,
  }));
}

/* ========= pantalla ========= */

export default function MisResenasScreen() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [resenas, setResenas] = useState<ResenaUI[]>([]);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id_usuario) {
        setError("Debes iniciar sesión para ver tus reseñas.");
        setResenas([]);
        return;
      }

      const data = await fetchMisResenas(user.id_usuario);
      setResenas(data);
    } catch (e: any) {
      const status = e?.status;
      let msg: string;

      if (typeof e?.message === "string" && e.message.trim().length) {
        msg = e.message;
      } else if (e && typeof e === "object") {
        try {
          msg = JSON.stringify(e);
        } catch {
          msg = "Ocurrió un error al cargar tus reseñas.";
        }
      } else {
        msg = "Ocurrió un error al cargar tus reseñas.";
      }

      if (status === 401) {
        await logout();
        router.replace("/(auth)/login");
        return;
      }

      setError(msg);
      setResenas([]);
    } finally {
      setLoading(false);
    }
  }, [user, logout]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const renderItem = ({ item }: { item: ResenaUI }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Reseña #{item.id_resena}</Text>
          <Text style={styles.cardSubtitle}>
            Cancha #{item.id_cancha} · Complejo #{item.id_complejo}
          </Text>
        </View>
        <View style={styles.ratingRow}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Ionicons
              key={i}
              name={i < item.calificacion ? "star" : "star-outline"}
              size={18}
              color="#f59e0b"
            />
          ))}
        </View>
      </View>

      {item.comentario ? (
        <Text style={styles.comment}>{item.comentario}</Text>
      ) : (
        <Text
          style={[
            styles.comment,
            { fontStyle: "italic", color: "#9ca3af" },
          ]}
        >
          Sin comentario escrito.
        </Text>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>{formatFecha(item.created_at)}</Text>
        {!item.esta_activa && (
          <Text style={styles.inactiveBadge}>Inactiva</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis reseñas</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text
            style={{
              color: "#b91c1c",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.btn, styles.btnNeutral]}
            onPress={cargar}
          >
            <Text style={styles.btnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : resenas.length === 0 ? (
        <View style={styles.center}>
          <Text
            style={{ fontSize: 16, fontWeight: "600", marginBottom: 4 }}
          >
            Todavía no has dejado reseñas
          </Text>
          <Text
            style={{
              color: "#6b7280",
              textAlign: "center",
              paddingHorizontal: 24,
            }}
          >
            Cuando califiques un complejo o una cancha, tus reseñas
            aparecerán aquí.
          </Text>
        </View>
      ) : (
        <FlatList
          data={resenas}
          keyExtractor={(item) => String(item.id_resena)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        />
      )}
    </View>
  );
}

/* ========= helpers UI ========= */

function formatFecha(dateStr?: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;

    const fecha = new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);

    const hora = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);

    return `${fecha} · ${hora}`;
  } catch {
    return dateStr;
  }
}

/* ========= estilos ========= */

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    flex: 1,
    textAlign: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#ffffff",
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontWeight: "700",
    fontSize: 15,
  },
  cardSubtitle: {
    color: "#6b7280",
    marginTop: 2,
    fontSize: 13,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  comment: {
    fontSize: 14,
    color: "#111827",
    marginTop: 4,
  },
  cardFooter: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateText: {
    color: "#6b7280",
    fontSize: 12,
  },
  inactiveBadge: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "700",
  },
  btn: {
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingHorizontal: 16,
  },
  btnNeutral: {
    backgroundColor: "#f1f5f9",
  },
  btnText: {
    fontWeight: "700",
  },
});
