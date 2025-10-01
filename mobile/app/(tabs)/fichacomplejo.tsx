// app/(tabs)/fichacomplejo.tsx
import React, { useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet, Dimensions, Image as RNImage,
  TouchableOpacity, Platform, Linking
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

function Stars({ value = 4.2 }: { value?: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <View style={{ flexDirection: "row" }}>
      {Array.from({ length: full }).map((_, i) => <Ionicons key={`f${i}`} name="star" size={16} color="#f59e0b" />)}
      {half && <Ionicons name="star-half" size={16} color="#f59e0b" />}
      {Array.from({ length: empty }).map((_, i) => <Ionicons key={`e${i}`} name="star-outline" size={16} color="#f59e0b" />)}
    </View>
  );
}

export default function FichaComplejoScreen() {
  // params opcionales: id, nombre; el resto es mock
  const { id, nombre, direccion, comuna, deportes, rating, canchas } =
    useLocalSearchParams<{ id?: string; nombre?: string; direccion?: string; comuna?: string; deportes?: string; rating?: string; canchas?: string }>();

  const displayName = nombre ?? `Complejo #${id ?? "—"}`;
  const fotos = useMemo(
    () => [
      `https://picsum.photos/seed/${encodeURIComponent(String(id ?? displayName))}/1200/800`,
      `https://picsum.photos/seed/${encodeURIComponent(String(displayName))}-2/1200/800`,
      `https://picsum.photos/seed/${encodeURIComponent(String(displayName))}-3/1200/800`,
    ],
    [id, displayName]
  );

  const deportesList = useMemo(() => {
    try { return deportes ? JSON.parse(deportes) : ["Fútbol 7", "Pádel"]; }
    catch { return ["Fútbol 7", "Pádel"]; }
  }, [deportes]);

  const ratingNum = Number(rating) || 4.3;
  const canchasNum = Number(canchas) || 6;

  const dirTxt = `${direccion ?? "Av. Alemania 1234"} · ${comuna ?? "Temuco"}`;

  const abrirComoLlegar = () => {
    const q = encodeURIComponent(dirTxt || displayName);
    const urlWeb = `https://www.google.com/maps/search/?api=1&query=${q}`;
    const ios = `maps:0,0?q=${q}`;
    const android = `geo:0,0?q=${q}`;
    const url = Platform.select({ ios, android, default: urlWeb }) as string;
    Linking.openURL(url).catch(() => Linking.openURL(urlWeb));
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Top bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 8 }}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{displayName}</Text>
      </View>

      {/* Carrusel simple */}
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ width, height: 220 }}>
        {fotos.map((uri, i) => (
          <View key={i} style={{ width, height: 220 }}>
            <RNImage source={{ uri }} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
          </View>
        ))}
      </ScrollView>

      {/* Info */}
      <View style={styles.card}>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.sub}>{dirTxt}</Text>

        <View style={styles.row}>
          <Stars value={ratingNum} />
          <Text style={styles.kv}>{ratingNum.toFixed(1)} · {canchasNum} canchas</Text>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {deportesList.map((d: string, idx: number) => (
            <View key={idx} style={styles.chip}>
              <Ionicons name="football-outline" size={12} color="#0ea5a4" />
              <Text style={styles.chipText}>{d}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          <TouchableOpacity onPress={abrirComoLlegar} style={styles.btnOutline}>
            <Ionicons name="navigate-outline" size={16} color="#0ea5a4" />
            <Text style={styles.btnOutlineText}>Cómo llegar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(tabs)/reservas")} style={styles.btnPrimary}>
            <Ionicons name="calendar" size={16} color="#fff" />
            <Text style={styles.btnPrimaryText}>Reservar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: "#0d9488", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center" },
  title: { color: "#fff", fontSize: 18, fontWeight: "800", flex: 1 },
  card: {
    marginTop: 12, marginHorizontal: 16, borderWidth: 1, borderColor: "#e5e7eb",
    backgroundColor: "#fff", borderRadius: 12, padding: 16,
  },
  name: { fontSize: 18, fontWeight: "900", color: "#0f172a" },
  sub: { color: "#64748b", marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  kv: { color: "#334155" },

  chip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#99f6e4", backgroundColor: "#ecfeff", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipText: { color: "#0ea5a4", fontWeight: "700" },

  btnPrimary: { flex: 1, height: 44, borderRadius: 10, backgroundColor: "#0ea5a4", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },

  btnOutline: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: "#99f6e4", backgroundColor: "#ecfeff", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  btnOutlineText: { color: "#0ea5a4", fontWeight: "800" },
});
