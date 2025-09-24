// app/(tabs)/complejos.tsx
import { useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useComplejos } from "@/src/features/features/complejos/hooks";

type ComplejoBE = {
  id?: number | string;
  id_complejo?: number | string;
  nombre?: string;
  nombre_complejo?: string;
  direccion?: string;
  comuna?: string;
  sector?: string;
  deportes?: string[];
  rating?: number;
  canchas?: number;
  num_canchas?: number;
  courts_count?: number;
};

export default function ComplejosScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useComplejos({ page: 1, page_size: 50 });

  const [q, setQ] = useState("");
  const [fDeporte, setFDeporte] = useState<string | null>(null);
  const [fSector, setFSector] = useState<string | null>(null);

  const deportes = ["Fútbol", "Pádel", "Tenis", "Básquetbol"];
  const sectores = ["Centro", "Ñielol", "Labranza"];

  // Normalización desde BE (soporta lista plana o paginada)
  const raw: ComplejoBE[] = ((data as any)?.items ?? data ?? []) as ComplejoBE[];
  const items = useMemo(() => {
    return raw.map((it) => {
      const id = (it.id ?? it.id_complejo) as number | string;
      const nombre = it.nombre ?? it.nombre_complejo ?? "—";
      const direccion = it.direccion ?? "";
      const comuna = it.comuna ?? it.sector ?? "";
      const deportes = Array.isArray(it.deportes) ? it.deportes : [];
      const rating = typeof it.rating === "number" ? it.rating : undefined;
      const canchas =
        typeof it.canchas === "number"
          ? it.canchas
          : typeof (it as any).num_canchas === "number"
          ? (it as any).num_canchas
          : typeof (it as any).courts_count === "number"
          ? (it as any).courts_count
          : undefined;
      return { id, nombre, direccion, comuna, deportes, rating, canchas };
    });
  }, [raw]);

  const complejos = useMemo(() => {
    return items.filter(c =>
      (q ? (`${c.nombre} ${c.direccion} ${c.comuna}`).toLowerCase().includes(q.toLowerCase()) : true) &&
      (fDeporte ? c.deportes?.includes(fDeporte) : true) &&
      (fSector ? (c.comuna ?? "").toLowerCase().includes(fSector.toLowerCase()) : true)
    );
  }, [items, q, fDeporte, fSector]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={!!isRefetching} onRefresh={() => refetch()} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Buscar</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
          <Segment label="Complejos" active onPress={() => {}} />
        </View>
      </View>

      {/* Buscador */}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#64748b" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Buscar complejos por nombre, dirección..."
            style={{ flex: 1, fontSize: 16 }}
          />
          {!!q && (
            <TouchableOpacity onPress={() => setQ("")}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filtros */}
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
        {(fDeporte || fSector) && (
          <TouchableOpacity onPress={() => { setFDeporte(null); setFSector(null); }}>
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
          <Text style={{ color: "#b91c1c" }}>No se pudieron cargar los complejos. Reintenta.</Text>
          <TouchableOpacity onPress={() => refetch()} style={[styles.btnOutline, { marginTop: 8 }]}>
            <Text style={{ color: "#0ea5a4", fontWeight: "700" }}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Listado */}
      {!isLoading && !isError && (
        <View style={{ paddingHorizontal: 16, gap: 12, marginTop: 6 }}>
          {complejos.map((c) => (
            <View key={String(c.id)} style={styles.card}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={styles.roundIcon}><Ionicons name="home-outline" size={16} color="#0ea5a4" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{c.nombre}</Text>
                  <Text style={styles.cardSub}>
                    {(c.direccion || "Dirección desconocida")} · {(c.comuna || "—")}
                  </Text>
                  {!!c.deportes?.length && (
                    <Text style={styles.cardSub}>
                      Deportes: {c.deportes.join(", ")}{typeof c.canchas === "number" ? ` · Canchas: ${c.canchas}` : ""}
                    </Text>
                  )}
                  {typeof c.rating === "number" && <Text style={styles.cardSub}>⭐ {c.rating.toFixed(1)}</Text>}
                </View>
              </View>
              <View style={styles.cardActions}>
                <OutlineBtn text="Ver complejo" onPress={() => router.push(`/(tabs)/canchas`)} />
                <PrimaryBtn text="Reservar" onPress={() => router.push(`/(tabs)/complejos[id]`)} />
              </View>
            </View>
          ))}
          {complejos.length === 0 && (
            <View style={{ padding: 24, alignItems: "center" }}>
              <Text style={{ color: "#6b7280" }}>No encontramos complejos que coincidan con tu búsqueda.</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

/* UI helpers */
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

/* estilos */
const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, backgroundColor: "#0d9488" },
  title: { color: "white", fontSize: 20, fontWeight: "800" },
  segment: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.2)" },
  segmentActive: { backgroundColor: "#ffffff" },
  segmentText: { color: "white", fontWeight: "700" },
  segmentTextActive: { color: "#0d9488" },

  searchWrap: {
    marginTop: 12, marginBottom: 8,
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb",
    paddingHorizontal: 12, borderRadius: 12, height: 46,
  },
  filtersRow: { paddingHorizontal: 16, marginTop: 4, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999 },
  chipActive: { borderColor: "#99f6e4", backgroundColor: "#ecfeff" },
  chipText: { color: "#334155", fontWeight: "600" },
  chipTextActive: { color: "#0ea5a4" },

  card: { borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff", borderRadius: 12, padding: 14 },
  roundIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#ecfeff", alignItems: "center", justifyContent: "center" },
  cardTitle: { fontWeight: "800", fontSize: 16 },
  cardSub: { color: "#6b7280", marginTop: 2 },
  cardActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  btnPrimary: { flex: 1, height: 44, borderRadius: 10, backgroundColor: "#0ea5a4", alignItems: "center", justifyContent: "center" },
  btnOutline: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: "#99f6e4", backgroundColor: "#ecfeff", alignItems: "center", justifyContent: "center" },
});
