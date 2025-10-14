// app/(tabs)/reservadetalle.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type Estado = "confirmada" | "pendiente" | "cancelada";

function Badge({ estado }: { estado: Estado | string | undefined }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    confirmada: { bg: "#dcfce7", fg: "#166534", label: "Confirmada" },
    pendiente:  { bg: "#fef9c3", fg: "#713f12", label: "Pendiente"  },
    cancelada:  { bg: "#fee2e2", fg: "#991b1b", label: "Cancelada"  },
  };
  const sty = map[(estado ?? "").toLowerCase()] ?? { bg: "#e5e7eb", fg: "#374151", label: estado ?? "—" };
  return (
    <View style={{ backgroundColor: sty.bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
      <Text style={{ color: sty.fg, fontWeight: "800" }}>{sty.label}</Text>
    </View>
  );
}

export default function ReservaDetalleScreen() {
  // Recibe params desde la lista de "Mis reservas"
  const { id, cancha, complejo, fecha, hora, estado } = useLocalSearchParams<{
    id?: string; cancha?: string; complejo?: string; fecha?: string; hora?: string; estado?: Estado;
  }>();

  // Formateo de fecha/hora tolerante
  const fechaHoraFmt = useMemo(() => {
    if (!fecha && !hora) return "—";
    try {
      // Si viene ISO completo en "fecha", úsalo; si no, combina fecha + hora
      const iso = fecha?.includes("T") ? fecha : `${fecha ?? ""}T${(hora ?? "00:00").padStart(5, "0")}:00`;
      const d = new Date(iso);
      if (isNaN(d.getTime())) throw new Error("Invalid");
      const opts: Intl.DateTimeFormatOptions = { weekday: "short", year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" };
      return new Intl.DateTimeFormat(undefined, opts).format(d);
    } catch {
      return `${fecha ?? ""} ${hora ?? ""}`.trim();
    }
  }, [fecha, hora]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 8 }}>
          <Ionicons name="chevron-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Detalle de reserva</Text>
      </View>

      {/* Card principal */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <Ionicons name="calendar-outline" size={18} color="#0ea5a4" />
          <Text style={[styles.label, { marginLeft: 6 }]}>Fecha y hora</Text>
        </View>
        <Text style={styles.value}>{fechaHoraFmt}</Text>

        <View style={styles.sep} />

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <Ionicons name="business-outline" size={18} color="#0ea5a4" />
          <Text style={[styles.label, { marginLeft: 6 }]}>Complejo</Text>
        </View>
        <Text style={styles.value}>{complejo ?? "—"}</Text>

        <View style={styles.sep} />

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <Ionicons name="football-outline" size={18} color="#0ea5a4" />
          <Text style={[styles.label, { marginLeft: 6 }]}>Cancha</Text>
        </View>
        <Text style={styles.value}>{cancha ?? "—"}</Text>

        <View style={styles.sep} />

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="information-circle-outline" size={18} color="#0ea5a4" />
            <Text style={[styles.label, { marginLeft: 6 }]}>Estado</Text>
          </View>
          <Badge estado={(estado as Estado) ?? "pendiente"} />
        </View>
      </View>

      {/* Acciones mock (no funcionales todavía) */}
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => { /* TODO: agregar a calendario */ }}>
          <Ionicons name="calendar" color="#fff" size={16} />
          <Text style={styles.btnPrimaryText}>Agregar al calendario</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnOutline} onPress={() => { /* TODO: cancelar */ }}>
          <Ionicons name="close-circle-outline" color="#0ea5a4" size={16} />
          <Text style={styles.btnOutlineText}>Cancelar reserva</Text>
        </TouchableOpacity>
      </View>

      {/* Info secundaria mock */}
      <View style={[styles.card, { marginTop: 12 }]}>
        <Text style={[styles.label, { marginBottom: 6 }]}>Notas</Text>
        <Text style={{ color: "#475569" }}>
          Esta pantalla muestra datos de ejemplo recibidos por parámetros. Más adelante puedes
          reemplazarlos con un fetch por <Text style={{ fontWeight: "700" }}>id: {id ?? "—"}</Text>.
        </Text>
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
  btnOutlineText: { color: "#0ea5a4", fontWeight: "800" },
});
