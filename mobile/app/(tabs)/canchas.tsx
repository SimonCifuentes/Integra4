<<<<<<< HEAD
﻿import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { useCanchas } from '../../src/features/features/canchas/hooks';
// filepath: c:\Users\nachi\OneDrive\Documentos\GitHub\Integra4\mobile\app\(tabs)\canchas.tsx
export default function Canchas(){
  const { data, isLoading } = useCanchas({ page:1, page_size:20 });
  if (isLoading) return <ActivityIndicator style={{marginTop:32}} />;
=======
﻿// app/(tabs)/canchas.tsx
import { useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCanchas } from "@/src/features/features/canchas/hooks";

type CanchaBE = {
  id_cancha: number;
  nombre: string;
  deporte?: string;
  tipo?: string;               // ej: "Fútbol 7", "Pádel"
  superficie?: string;         // ej: "Pasto sintético"
  precio_desde?: number;       // CLP/hora
  disponible_hoy?: boolean;
  id_complejo?: number;
  nombre_complejo?: string;
  sector?: string;             // o comuna/barrio
};

export default function CanchasScreen() {
  // ✅ misma llamada funcional que tu code base
  const { data, isLoading, isError, refetch, isRefetching } = useCanchas({ page: 1, page_size: 20 });

  // UI state
  const [q, setQ] = useState("");
  const [fDeporte, setFDeporte] = useState<string | null>(null);
  const [fSector, setFSector] = useState<string | null>(null);
  const [fFecha, setFFecha] = useState<string | null>(null); // decorativo

  // Opciones rápidas (si tu API trae catálogos, reemplaza aquí)
  const deportes = ["Fútbol", "Pádel", "Tenis", "Básquetbol"];
  const sectores = ["Centro", "Ñielol", "Labranza"];

  // Normaliza items desde el backend (exactamente como tu code)
  const items: CanchaBE[] = (data?.items ?? []) as CanchaBE[];

  // Filtros/búsqueda en cliente (no toca la request)
  const canchas = useMemo(() => {
    return items
      .filter(c =>
        (q
          ? ((c.nombre_complejo ?? "") + " " + (c.tipo ?? "") + " " + (c.deporte ?? "") + " " + (c.sector ?? "") + " " + (c.nombre ?? ""))
              .toLowerCase()
              .includes(q.toLowerCase())
          : true) &&
        (fDeporte ? (c.deporte === fDeporte) : true) &&
        (fSector ? (c.sector === fSector) : true)
      )
      .sort((a, b) => Number(b.disponible_hoy ?? 0) - Number(a.disponible_hoy ?? 0));
  }, [items, q, fDeporte, fSector]);

>>>>>>> 241975d (fix perfil)
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={!!isRefetching} onRefresh={() => refetch()} />}
    >
      {/* Header integrado */}
      <View style={styles.header}>
        <Text style={styles.title}>Buscar</Text>
        {/* Tabs visuales simplificados: solo “Canchas” activa (puedes reactivar Complejos más adelante) */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
          <Segment label="Canchas" active onPress={() => {}} />
        </View>
      </View>

      {/* Buscador */}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#64748b" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Buscar canchas por deporte, complejo, sector..."
            style={{ flex: 1, fontSize: 16 }}
          />
          {!!q && (
            <TouchableOpacity onPress={() => setQ("")}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filtros rápidos */}
      <View style={styles.filtersRow}>
        <DropdownChip
          icon="football-outline"
          label={fDeporte ?? "Deporte"}
          onPress={() => {
            const idx = deportes.indexOf(fDeporte ?? "");
            const next = idx < 0 ? deportes[0] : (idx + 1 >= deportes.length ? null : deportes[idx + 1]);
            setFDeporte(next);
          }}
          active={!!fDeporte}
        />
        <DropdownChip
          icon="map-outline"
          label={fSector ?? "Sector"}
          onPress={() => {
            const idx = sectores.indexOf(fSector ?? "");
            const next = idx < 0 ? sectores[0] : (idx + 1 >= sectores.length ? null : sectores[idx + 1]);
            setFSector(next);
          }}
          active={!!fSector}
        />
        <DropdownChip
          icon="calendar-outline"
          label={fFecha ?? "Fecha"}
          onPress={() => setFFecha(fFecha ? null : "Hoy")}
          active={!!fFecha}
        />
        {(fDeporte || fSector || fFecha) && (
          <TouchableOpacity onPress={() => { setFDeporte(null); setFSector(null); setFFecha(null); }}>
            <Text style={{ color: "#ef4444", fontWeight: "700" }}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Loading / Error */}
      {isLoading && (
        <View style={{ paddingVertical: 24, alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      )}
      {isError && !isLoading && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ color: "#b91c1c" }}>No se pudieron cargar las canchas. Reintenta.</Text>
          <TouchableOpacity onPress={() => refetch()} style={[styles.btnOutline, { marginTop: 8 }]}>
            <Text style={{ color: "#0ea5a4", fontWeight: "700" }}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Listado Cards bonitas (datos reales de la API) */}
      {!isLoading && !isError && (
        <View style={{ paddingHorizontal: 16, gap: 12, marginTop: 6 }}>
          {canchas.map((c) => (
            <View key={c.id_cancha} style={styles.card}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={styles.roundIcon}><Ionicons name="football-outline" size={16} color="#0ea5a4" /></View>
                <View style={{ flex: 1 }}>
                  {/* 🔹 Aquí cambiamos el título para mostrar el nombre de la cancha */}
                  <Text style={styles.cardTitle}>{c.nombre ?? c.tipo ?? c.deporte ?? "—"}</Text>
                  <Text style={styles.cardSub}>{c.nombre_complejo ?? "Complejo"} · {c.sector ?? "—"}</Text>
                  <Text style={styles.cardSub}>
                    {c.superficie ? `${c.superficie} · ` : ""}{typeof c.precio_desde === "number" ? `Desde ${formatCLP(c.precio_desde)}/h` : ""}
                  </Text>
                </View>
                {typeof c.disponible_hoy === "boolean" && (
                  <Badge text={c.disponible_hoy ? "Hoy disponible" : "Hoy no hay"} tone={c.disponible_hoy ? "success" : "muted"} />
                )}
              </View>
              <View style={styles.cardActions}>
                <OutlineBtn text="Ver complejo" onPress={() => router.push(`/(tabs)/complejos/${c.id_complejo}`)} />
                <PrimaryBtn text="Reservar" onPress={() => router.push(`/(tabs)/reservar/${c.id_cancha}`)} />
              </View>
            </View>
          ))}
          {canchas.length === 0 && <EmptyState text="No encontramos canchas con esos filtros." />}
        </View>
      )}
    </ScrollView>
  );
}

/* ---------- UI helpers ---------- */
function Segment({ label, active, onPress }:{ label:string; active?:boolean; onPress:()=>void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.segment, active && styles.segmentActive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function DropdownChip({ icon, label, onPress, active }:{
  icon: keyof typeof Ionicons.glyphMap; label:string; onPress:()=>void; active?:boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Ionicons name={icon} size={14} color={active ? "#0ea5a4" : "#64748b"} />
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      <Ionicons name="chevron-down" size={14} color={active ? "#0ea5a4" : "#94a3b8"} />
    </TouchableOpacity>
  );
}

function PrimaryBtn({ text, onPress }:{ text:string; onPress:()=>void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.btnPrimary}>
      <Text style={{ color: "white", fontWeight: "700" }}>{text}</Text>
    </TouchableOpacity>
  );
}

function OutlineBtn({ text, onPress }:{ text:string; onPress:()=>void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.btnOutline}>
      <Text style={{ color: "#0ea5a4", fontWeight: "700" }}>{text}</Text>
    </TouchableOpacity>
  );
}

function Badge({ text, tone }:{ text:string; tone?: "success" | "muted" }) {
  const bg = tone === "success" ? "#dcfce7" : "#e5e7eb";
  const fg = tone === "success" ? "#166534" : "#374151";
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
      <Text style={{ color: fg, fontWeight: "700" }}>{text}</Text>
    </View>
  );
}

function EmptyState({ text }:{ text:string }) {
  return (
    <View style={{ padding: 24, alignItems: "center" }}>
      <Text style={{ color: "#6b7280" }}>{text}</Text>
    </View>
  );
}

function formatCLP(n?: number | null) {
  if (typeof n !== "number") return "";
  try { return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n); }
  catch { return `$${(n ?? 0).toLocaleString("es-CL")}`; }
}

/* ---------- estilos ---------- */
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
    backgroundColor: "#0d9488",
  },
  title: { color: "white", fontSize: 20, fontWeight: "800" },

  segment: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  segmentActive: { backgroundColor: "#ffffff" },
  segmentText: { color: "white", fontWeight: "700" },
  segmentTextActive: { color: "#0d9488" },

  searchWrap: {
    marginTop: 12, marginBottom: 8,
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb",
    paddingHorizontal: 12, borderRadius: 12, height: 46,
  },

  filtersRow: {
    paddingHorizontal: 16, marginTop: 4, marginBottom: 8,
    flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap",
  },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb",
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999,
  },
  chipActive: { borderColor: "#99f6e4", backgroundColor: "#ecfeff" },
  chipText: { color: "#334155", fontWeight: "600" },
  chipTextActive: { color: "#0ea5a4" },

  card: {
    borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff",
    borderRadius: 12, padding: 14,
  },
  roundIcon: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: "#ecfeff",
    alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontWeight: "800", fontSize: 16 },
  cardSub: { color: "#6b7280", marginTop: 2 },

  cardActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  btnPrimary: {
    flex: 1, height: 44, borderRadius: 10,
    backgroundColor: "#0ea5a4", alignItems: "center", justifyContent: "center",
  },
  btnOutline: {
    flex: 1, height: 44, borderRadius: 10,
    borderWidth: 1, borderColor: "#99f6e4",
    backgroundColor: "#ecfeff", alignItems: "center", justifyContent: "center",
  },
});
