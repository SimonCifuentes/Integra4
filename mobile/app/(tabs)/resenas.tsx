// app/(tabs)/resenas.tsx
import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// --- Mocks de reseñas ---
type Reseña = {
  id: string;
  usuario: string;
  rating: number; // 0..5 (permite decimales)
  comentario: string;
  fecha: string; // ISO o string corto
};

const RESEÑAS: Reseña[] = [
  { id: "1", usuario: "Ana",   rating: 5,   comentario: "Excelente atención y canchas impecables.", fecha: "2025-09-05" },
  { id: "2", usuario: "Bruno", rating: 4,   comentario: "Buen lugar, faltan más horarios libres.",    fecha: "2025-09-08" },
  { id: "3", usuario: "Cata",  rating: 4.5, comentario: "Iluminación top y camarines limpios.",      fecha: "2025-09-10" },
  { id: "4", usuario: "Diego", rating: 3.5, comentario: "Todo bien, pero tardaron en confirmar.",     fecha: "2025-09-12" },
  { id: "5", usuario: "Eva",   rating: 5,   comentario: "Reservé en minutos. Volveré.",               fecha: "2025-09-15" },
  { id: "6", usuario: "Fran",  rating: 4,   comentario: "Relación precio/calidad muy buena.",         fecha: "2025-09-18" },
  { id: "7", usuario: "Gabo",  rating: 2.5, comentario: "La cancha estaba húmeda al inicio.",         fecha: "2025-09-20" },
  { id: "8", usuario: "Iris",  rating: 5,   comentario: "Staff muy amable y organizado.",             fecha: "2025-09-22" },
];

// --- Helpers ---
function Stars({ value, size = 16, color = "#f59e0b" }: { value: number; size?: number; color?: string }) {
  // Renderiza 5 estrellas con medias si corresponde
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.5;
  const empty = 5 - full - (hasHalf ? 1 : 0);
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {Array.from({ length: full }).map((_, i) => (
        <Ionicons key={`f${i}`} name="star" size={size} color={color} />
      ))}
      {hasHalf && <Ionicons name="star-half" size={size} color={color} />}
      {Array.from({ length: empty }).map((_, i) => (
        <Ionicons key={`e${i}`} name="star-outline" size={size} color={color} />
      ))}
    </View>
  );
}

export default function ResenasScreen() {
  const total = RESEÑAS.length;

  const promedio = useMemo(() => {
    if (!total) return 0;
    const sum = RESEÑAS.reduce((acc, r) => acc + r.rating, 0);
    return sum / total;
  }, [total]);

  const breakdown = useMemo(() => {
    // Conteo por estrellas “enteras” (redondeando hacia abajo)
    const map = new Map<number, number>();
    for (let s = 1; s <= 5; s++) map.set(s, 0);
    RESEÑAS.forEach(r => {
      const key = Math.floor(r.rating);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    // De 5 → 1 para la UI
    return [5, 4, 3, 2, 1].map(s => ({ stars: s, count: map.get(s) ?? 0 }));
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Reseñas</Text>
        
      </View>

      {/* Resumen */}
      <View style={styles.summaryCard}>
        <View style={{ alignItems: "center", justifyContent: "center" }}>
          <Text style={styles.avg}>{promedio.toFixed(1)}</Text>
          <Stars value={promedio} size={18} />
          <Text style={styles.subMute}>{`de 5 · ${total} reseñas`}</Text>
        </View>

        {/* Breakdown por estrellas */}
        <View style={{ marginTop: 16 }}>
          {breakdown.map(({ stars, count }) => {
            const pct = total ? count / total : 0;
            return (
              <View key={stars} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.starLabel}>{stars}</Text>
                  <Ionicons name="star" size={14} color="#f59e0b" />
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%` }]} />
                </View>
                <Text style={styles.count}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Lista de reseñas */}
      <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
        {RESEÑAS.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{r.usuario.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.user}>{r.usuario}</Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Stars value={r.rating} size={14} />
                  <Text style={styles.date}> · {new Date(r.fecha).toLocaleDateString()}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.comment}>{r.comentario}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  header: {
    backgroundColor: "#0d9488",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },

  summaryCard: {
    marginTop: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
  },
  avg: { fontSize: 40, fontWeight: "900", color: "#0f172a", lineHeight: 44 },
  subMute: { marginTop: 4, color: "#6b7280" },

  row: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  rowLeft: { width: 40, flexDirection: "row", alignItems: "center", justifyContent: "flex-start" },
  starLabel: { fontWeight: "800", marginRight: 4, color: "#0f172a" },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    marginHorizontal: 8,
  },
  barFill: {
    height: "100%",
    backgroundColor: "#10b981",
  },
  count: { width: 30, textAlign: "right", color: "#334155" },

  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#ecfeff", marginRight: 10,
  },
  avatarText: { color: "#0ea5a4", fontWeight: "900" },
  user: { fontWeight: "800", color: "#0f172a" },
  date: { color: "#6b7280", marginLeft: 6, fontSize: 12 },
  comment: { color: "#334155", marginTop: 4, lineHeight: 20 },
});
