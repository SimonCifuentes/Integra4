// app/(tabs)/canchas.tsx
import { useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useComplejos } from "@/src/features/features/complejos/hooks";
import { useCanchas } from "@/src/features/features/canchas/hooks";
import type { Complejo } from "@/src/features/features/complejos/api";
import type { Cancha } from "@/src/features/features/canchas/api";

export default function CanchasScreen() {
  const [tab, setTab] = useState<"complejos" | "canchas">("complejos");
  const [q, setQ] = useState("");
  const [fDeporte, setFDeporte] = useState<string | null>(null);
  const [fSector, setFSector] = useState<string | null>(null);
  const [fFecha, setFFecha] = useState<string | null>(null);

  // Opciones básicas; si tu API devuelve catálogos, puedes cargarlos allí
  const deportes = ["Fútbol", "Pádel", "Tenis", "Básquetbol"];
  const sectores = ["Centro", "Ñielol", "Labranza"];

  // Llamadas a API (paso filtros; si tu backend no soporta alguno, igual filtramos client-side)
  const complejosQ = useComplejos({ q: q || undefined, deporte: fDeporte || undefined, sector: fSector || undefined });
  const canchasQ   = useCanchas  ({ q: q || undefined, deporte: fDeporte || undefined, sector: fSector || undefined, fecha: fFecha || undefined });

  const isLoading = (tab === "complejos" ? complejosQ.isLoading : canchasQ.isLoading);
  const isError   = (tab === "complejos" ? complejosQ.isError   : canchasQ.isError);
  const refetch   = (tab === "complejos" ? complejosQ.refetch   : canchasQ.refetch);
  const refreshing = (tab === "complejos" ? complejosQ.isRefetching : canchasQ.isRefetching);

  // Fallback: filtrado en cliente (si la API no filtra todo)
  const complejos: Complejo[] = useMemo(() => {
    const list = complejosQ.data ?? [];
    return list.filter(c =>
      (q ? ((c.nombre ?? "") + " " + (c.direccion ?? "") + " " + (c.comuna ?? "")).toLowerCase().includes(q.toLowerCase()) : true) &&
      (fDeporte ? (c.deportes ?? []).includes(fDeporte) : true) &&
      (fSector ? (c.comuna ?? "").toLowerCase().includes(fSector.toLowerCase()) : true)
    );
  }, [complejosQ.data, q, fDeporte, fSector]);

  const canchas: Cancha[] = useMemo(() => {
    const list = canchasQ.data ?? [];
    return list.filter(c =>
      (q ? ((c.complejoNombre ?? "") + " " + (c.tipo ?? "") + " " + (c.deporte ?? "") + " " + (c.sector ?? "")).toLowerCase().includes(q.toLowerCase()) : true) &&
      (fDeporte ? c.deporte === fDeporte : true) &&
      (fSector ? c.sector === fSector : true)
      // fFecha: idealmente lo filtra el backend por disponibilidad
    ).sort((a, b) => Number(b.disponibleHoy ?? 0) - Number(a.disponibleHoy ?? 0));
  }, [canchasQ.data, q, fDeporte, fSector, fFecha]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={
        <RefreshControl refreshing={!!refreshing} onRefresh={() => refetch()} />
      }
    >
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

      {/* Loading / error */}
      {isLoading && (
        <View style={{ paddingVertical: 24, alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      )}
      {isError && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ color: "#b91c1c" }}>No se pudieron cargar los datos. Reintenta.</Text>
          <TouchableOpacity onPress={() => refetch()} style={[styles.btnOutline, { marginTop: 8 }]}>
            <Text style={{ color: "#0ea5a4", fontWeight: "700" }}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Listado */}
      {!isLoading && !isError && (
        tab === "complejos" ? (
          <View style={{ paddingHorizontal: 16, gap: 12, marginTop: 6 }}>
            {complejos.map(c => (
              <View key={c.id} style={styles.card}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={styles.roundIcon}><Ionicons name="home-outline" size={16} color="#0ea5a4" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{c.nombre}</Text>
                    <Text style={styles.cardSub}>
                      {(c.direccion ?? "Dirección desconocida")} · {(c.comuna ?? "—")}
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
                  <OutlineBtn text="Ver complejo" onPress={() => router.push(`/(tabs)/complejos/${c.id}`)} />
                  <PrimaryBtn text="Reservar" onPress={() => router.push(`/(tabs)/complejos/${c.id}`)} />
                </View>
              </View>
            ))}
            {complejos.length === 0 && <EmptyState text="No encontramos complejos que coincidan con tu búsqueda." />}
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 12, marginTop: 6 }}>
            {canchas.map(c => (
              <View key={c.id} style={styles.card}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={styles.roundIcon}><Ionicons name="football-outline" size={16} color="#0ea5a4" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{(c.tipo ?? c.deporte) || "—"} · {c.deporte ?? "—"}</Text>
                    <Text style={styles.cardSub}>{c.complejoNombre ?? "Complejo"} · {c.sector ?? "—"}</Text>
                    <Text style={styles.cardSub}>
                      {c.superficie ? `${c.superficie} · ` : ""}{typeof c.precioDesde === "number" ? `Desde ${formatCLP(c.precioDesde)}/h` : ""}
                    </Text>
                  </View>
                  {typeof c.disponibleHoy === "boolean" && (
                    <Badge text={c.disponibleHoy ? "Hoy disponible" : "Hoy no hay"} tone={c.disponibleHoy ? "success" : "muted"} />
                  )}
                </View>
                <View style={styles.cardActions}>
                  <OutlineBtn text="Ver complejo" onPress={() => router.push(`/(tabs)/complejos/${c.complejoId}`)} />
                  <PrimaryBtn text="Reservar" onPress={() => router.push(`/(tabs)/reservar/${c.id}`)} />
                </View>
              </View>
            ))}
            {canchas.length === 0 && <EmptyState text="No encontramos canchas con esos filtros." />}
          </View>
        )
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

function formatCLP(n?: number | null) {
  if (typeof n !== "number") return "";
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
