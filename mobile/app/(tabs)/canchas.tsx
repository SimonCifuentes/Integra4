// app/(tabs)/canchas.tsx
import { useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

// ----- MOCK DATA (reemplaza con tu API) -----
type Complejo = {
  id: number;
  nombre: string;
  direccion: string;
  comuna: string;
  deportes: string[];
  rating?: number;
  canchas: number;
};

type Cancha = {
  id: number;
  complejoId: number;
  complejoNombre: string;
  deporte: string;
  tipo: "Fútbol 5" | "Fútbol 7" | "Pádel" | "Tenis" | "Básquetbol";
  superficie?: string; // pasto sintético, arcilla, etc
  precioDesde: number; // CLP/hora
  disponibleHoy: boolean;
  sector: string;
};

const MOCK_COMPLEJOS: Complejo[] = [
  { id: 1, nombre: "Complejo Ñielol", direccion: "Av. Alemania 1234", comuna: "Temuco", deportes: ["Fútbol", "Pádel"], rating: 4.6, canchas: 6 },
  { id: 2, nombre: "Estadio Germán Becker", direccion: "Av. Pablo Neruda 0110", comuna: "Temuco", deportes: ["Fútbol"], rating: 4.8, canchas: 4 },
  { id: 3, nombre: "Labranza Sport", direccion: "Ruta S-40, km 8", comuna: "Labranza", deportes: ["Pádel", "Tenis"], rating: 4.3, canchas: 5 },
];

const MOCK_CANCHAS: Cancha[] = [
  { id: 101, complejoId: 1, complejoNombre: "Complejo Ñielol", deporte: "Fútbol", tipo: "Fútbol 7", superficie: "Pasto sintético", precioDesde: 18000, disponibleHoy: true,  sector: "Centro" },
  { id: 102, complejoId: 1, complejoNombre: "Complejo Ñielol", deporte: "Pádel",  tipo: "Pádel",     superficie: "Sintética",        precioDesde: 16000, disponibleHoy: false, sector: "Centro" },
  { id: 201, complejoId: 2, complejoNombre: "Germán Becker",    deporte: "Fútbol", tipo: "Fútbol 8", superficie: "Pasto natural",   precioDesde: 22000, disponibleHoy: true,  sector: "Centro" },
  { id: 301, complejoId: 3, complejoNombre: "Labranza Sport",   deporte: "Pádel",  tipo: "Pádel",     superficie: "Sintética",        precioDesde: 15000, disponibleHoy: true,  sector: "Labranza" },
  { id: 302, complejoId: 3, complejoNombre: "Labranza Sport",   deporte: "Tenis",  tipo: "Tenis",     superficie: "Arcilla",          precioDesde: 17000, disponibleHoy: false, sector: "Labranza" },
];

// ----- UI -----
export default function CanchasScreen() {
  const [tab, setTab] = useState<"complejos" | "canchas">("complejos");
  const [q, setQ] = useState("");
  const [fDeporte, setFDeporte] = useState<string | null>(null);
  const [fSector, setFSector] = useState<string | null>(null);
  const [fFecha, setFFecha] = useState<string | null>(null); // placeholder texto

  // Opciones ficticias; puedes poblar con la API
  const deportes = ["Fútbol", "Pádel", "Tenis", "Básquetbol"];
  const sectores = ["Centro", "Ñielol", "Labranza"];

  const complejosFiltrados = useMemo(() => {
    return MOCK_COMPLEJOS.filter(c =>
      (q ? (c.nombre + " " + c.direccion + " " + c.comuna).toLowerCase().includes(q.toLowerCase()) : true) &&
      (fDeporte ? c.deportes.includes(fDeporte) : true) &&
      (fSector ? c.comuna.toLowerCase().includes(fSector.toLowerCase()) : true)
    );
  }, [q, fDeporte, fSector]);

  const canchasFiltradas = useMemo(() => {
    return MOCK_CANCHAS.filter(c =>
      (q ? (c.complejoNombre + " " + c.tipo + " " + c.deporte + " " + c.sector).toLowerCase().includes(q.toLowerCase()) : true) &&
      (fDeporte ? c.deporte === fDeporte : true) &&
      (fSector ? c.sector === fSector : true)
      // fFecha podría enviar al backend para disponibilidad por fecha/hora
    ).sort((a, b) => Number(b.disponibleHoy) - Number(a.disponibleHoy)); // disponibles primero
  }, [q, fDeporte, fSector, fFecha]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Header integrado */}
      <View style={styles.header}>
        <Text style={styles.title}>Buscar</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
          <Segment label="Complejos" active={tab === "complejos"} onPress={() => setTab("complejos")} />
          <Segment label="Canchas"   active={tab === "canchas"}   onPress={() => setTab("canchas")} />
        </View>
      </View>

      {/* Buscador */}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#64748b" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={tab === "complejos" ? "Buscar complejos por nombre, dirección..." : "Buscar canchas por deporte, sector..."}
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
            // Ejemplo simple de “ciclo” de opciones; en prod, usa un bottom sheet o picker
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
          onPress={() => {
            // TODO: abre date-time picker; por ahora set fijo
            setFFecha(fFecha ? null : "Hoy");
          }}
          active={!!fFecha}
        />
        {(fDeporte || fSector || fFecha) && (
          <TouchableOpacity onPress={() => { setFDeporte(null); setFSector(null); setFFecha(null); }}>
            <Text style={{ color: "#ef4444", fontWeight: "700" }}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Listado */}
      {tab === "complejos" ? (
        <View style={{ paddingHorizontal: 16, gap: 12, marginTop: 6 }}>
          {complejosFiltrados.map(c => (
            <View key={c.id} style={styles.card}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={styles.roundIcon}><Ionicons name="home-outline" size={16} color="#0ea5a4" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{c.nombre}</Text>
                  <Text style={styles.cardSub}>{c.direccion} · {c.comuna}</Text>
                  <Text style={styles.cardSub}>Deportes: {c.deportes.join(", ")} · Canchas: {c.canchas}</Text>
                  {!!c.rating && <Text style={styles.cardSub}>⭐ {c.rating.toFixed(1)}</Text>}
                </View>
              </View>
              <View style={styles.cardActions}>
                <OutlineBtn text="Ver complejo" onPress={() => router.push(`/(tabs)/complejos/${c.id}`)} />
                <PrimaryBtn text="Reservar" onPress={() => router.push(`/(tabs)/complejos/${c.id}`)} />
              </View>
            </View>
          ))}
          {complejosFiltrados.length === 0 && <EmptyState text="No encontramos complejos que coincidan con tu búsqueda." />}
        </View>
      ) : (
        <View style={{ paddingHorizontal: 16, gap: 12, marginTop: 6 }}>
          {canchasFiltradas.map(c => (
            <View key={c.id} style={styles.card}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={styles.roundIcon}><Ionicons name="football-outline" size={16} color="#0ea5a4" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{c.tipo} · {c.deporte}</Text>
                  <Text style={styles.cardSub}>{c.complejoNombre} · {c.sector}</Text>
                  <Text style={styles.cardSub}>
                    {c.superficie ? `${c.superficie} · ` : ""}Desde ${formatCLP(c.precioDesde)}/h
                  </Text>
                </View>
                <Badge
                  text={c.disponibleHoy ? "Hoy disponible" : "Hoy no hay"}
                  tone={c.disponibleHoy ? "success" : "muted"}
                />
              </View>
              <View style={styles.cardActions}>
                <OutlineBtn text="Ver complejo" onPress={() => router.push(`/(tabs)/complejos/${c.complejoId}`)} />
                <PrimaryBtn text="Reservar" onPress={() => router.push(`/(tabs)/reservar/${c.id}`)} />
              </View>
            </View>
          ))}
          {canchasFiltradas.length === 0 && <EmptyState text="No encontramos canchas con esos filtros." />}
        </View>
      )}
    </ScrollView>
  );
}

// ----- helpers UI -----
function Segment({ label, active, onPress }:{ label:string; active:boolean; onPress:()=>void }) {
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

function formatCLP(n: number) {
  try { return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n); }
  catch { return `$${n.toLocaleString("es-CL")}`; }
}

// ----- estilos -----
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
