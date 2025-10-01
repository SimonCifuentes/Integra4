// app/(tabs)/info.tsx
import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Dimensions,
  Image as RNImage,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

// --- Mocks del complejo ---
const COMPLEJO = {
  nombre: "Complejo Deportivo La Foresta",
  direccion: "Av. Alemania 1234, Temuco",
  comuna: "Temuco",
  // Coordenadas mock (Temuco centro aprox.)
  lat: -38.7399,
  lng: -72.5984,
  fotos: [
    "https://picsum.photos/seed/cancha1/800/500",
    "https://picsum.photos/seed/cancha2/800/500",
    "https://picsum.photos/seed/cancha3/800/500",
    "https://picsum.photos/seed/cancha4/800/500",
  ],
};

function abrirComoLlegar() {
  const { lat, lng, nombre } = {
    lat: COMPLEJO.lat,
    lng: COMPLEJO.lng,
    nombre: COMPLEJO.nombre,
  };
  const label = encodeURIComponent(nombre);
  const google = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${label}`;

  // Schemes nativos (opcional)
  const ios = `maps:0,0?q=${label}@${lat},${lng}`;
  const android = `geo:0,0?q=${lat},${lng}(${label})`;

  const url = Platform.select({
    ios,
    android,
    default: google,
  }) as string;

  Linking.openURL(url).catch(() => {
    // Fallback a Google Maps web si falla el scheme
    Linking.openURL(google).catch(() => {
      Alert.alert("No se pudo abrir Mapas", "Copia la dirección y ábrela manualmente.");
    });
  });
}

export default function InfoScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Información</Text>
        <Text style={{ color: "#d1fae5" }}>Datos de ejemplo (mocks)</Text>
      </View>

      {/* Ficha */}
      <View style={styles.card}>
        <Text style={styles.nombre}>{COMPLEJO.nombre}</Text>
        <Text style={styles.sub}>{COMPLEJO.direccion} · {COMPLEJO.comuna}</Text>

        {/* Botón: Cómo llegar */}
        <TouchableOpacity style={styles.btnComoLlegar} onPress={abrirComoLlegar}>
          <Ionicons name="navigate-outline" size={18} color="#0d9488" />
          <Text style={styles.btnComoLlegarText}>Cómo llegar</Text>
        </TouchableOpacity>
      </View>

      {/* Carrusel simple de fotos dummy */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ width, height: 210 }}
      >
        {COMPLEJO.fotos.map((uri, idx) => (
          <View key={idx} style={{ width, height: 210 }}>
            <RNImage
              source={{ uri }}
              resizeMode="cover"
              style={{ width: "100%", height: "100%" }}
            />
          </View>
        ))}
      </ScrollView>

      {/* Mini-grid adicional (opcional) */}
      <View style={styles.grid}>
        {COMPLEJO.fotos.map((uri, idx) => (
          <RNImage
            key={`g-${idx}`}
            source={{ uri }}
            resizeMode="cover"
            style={styles.gridImg}
          />
        ))}
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
  nombre: { fontSize: 18, fontWeight: "900", color: "#0f172a" },
  sub: { marginTop: 4, color: "#6b7280" },

  btnComoLlegar: {
    marginTop: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#99f6e4",
    backgroundColor: "#ecfeff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnComoLlegarText: { color: "#0d9488", fontWeight: "800" },

  grid: {
    marginTop: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridImg: {
    width: (width - 16 * 2 - 8 * 2) / 3, // 3 columnas con márgenes
    height: 80,
    borderRadius: 8,
  },
});
