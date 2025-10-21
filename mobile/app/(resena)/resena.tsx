import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";

const TEAL = "#0ea5a4";

/**
 * Esta pantalla ahora es solo visual.
 * Permite al usuario escribir un comentario y elegir estrellas,
 * pero no guarda ni envía nada.
 */
export default function ResenasScreen() {
  const params = useLocalSearchParams<{
    reservationId?: string;
    venueId?: string;
    venueName?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
  }>();

  const venueName = params?.venueName || "Complejo deportivo";
  const date = params?.date || "";
  const startTime = params?.startTime || "";
  const endTime = params?.endTime || "";

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const handlePressSave = () => {
    const msg =
      "Gracias por tu reseña.";
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert(msg);
      router.replace("/(reservar)/mis-reservas");
    } else {
      Alert.alert("Reseña registrada", msg, [
        { text: "Aceptar", onPress: () => router.replace("/(reservar)/mis-reservas") },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(reservar)/mis-reservas")
          }
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={TEAL} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dejar reseña</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* Info de reserva */}
        <View style={styles.card}>
          <Text style={styles.complejo}>{venueName}</Text>
          <Text style={styles.fecha}>
            {date ? `${date}` : ""}{" "}
            {startTime ? `• ${startTime}` : ""}{" "}
            {endTime ? `– ${endTime}` : ""}
          </Text>
        </View>

        {/* Calificación */}
        <Text style={styles.sectionTitle}>Tu calificación</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity
              key={n}
              style={styles.starBtn}
              onPress={() => setRating(n)}
            >
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
        <TouchableOpacity style={styles.btnPrimary} onPress={handlePressSave}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
          <Text style={styles.btnPrimaryText}>Guardar reseña</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ====== Estilos ====== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    backgroundColor: "#ecfeff",
    borderColor: "#99f6e4",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  complejo: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
  },
  fecha: {
    marginTop: 4,
    color: "#475569",
    fontWeight: "500",
  },

  sectionTitle: {
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 4,
    color: "#0f172a",
    fontSize: 15,
  },
  starsRow: {
    flexDirection: "row",
    gap: 6,
    marginVertical: 8,
  },
  starBtn: {
    padding: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
    textAlignVertical: "top",
    color: "#0f172a",
    fontSize: 15,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  btnPrimary: {
    backgroundColor: TEAL,
    height: 46,
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },
});
