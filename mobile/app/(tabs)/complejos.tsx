// app/(tabs)/complejos.tsx
import { useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useComplejos } from "@/src/features/features/complejos/hooks";
import { useCanchas } from "@/src/features/features/canchas/hooks";

// ⭐ IMPORTAMOS
import { hooks as resenasHooks } from "@/src/features/resenas/hooks";
import {
  calcularRatingPorComplejo,
  type CanchaWithComplejo,
  type RatingComplejo,
} from "@/src/features/resenas/utils";

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
  const { data, isLoading, isError, refetch, isRefetching } =
    useComplejos({ page: 1, page_size: 50 });

  const { data: canchasData } =
    useCanchas({ page: 1, page_size: 200 });

  const { data: ratingsCanchas } =
    resenasHooks.useRatingsPromedioCanchas();

  const [q, setQ] = useState("");
  const [fDeporte, setFDeporte] = useState<string | null>(null);
  const [fSector, setFSector] = useState<string | null>(null);

  const deportes = ["Fútbol", "Pádel", "Tenis", "Básquetbol"];
  const sectores = ["Centro", "Ñielol", "Labranza"];

  // Normalización desde backend
  const raw: ComplejoBE[] =
    ((data as any)?.items ?? data ?? []) as ComplejoBE[];

  const items = useMemo(() => {
    return raw.map((it) => {
      const id = (it.id ?? it.id_complejo) as number | string;
      const nombre = it.nombre ?? it.nombre_complejo ?? "—";
      const direccion = it.direccion ?? "";
      const comuna = it.comuna ?? it.sector ?? "";
      const deportes = Array.isArray(it.deportes) ? it.deportes : [];
      const canchas =
        typeof it.canchas === "number"
          ? it.canchas
          : typeof (it as any).num_canchas === "number"
          ? (it as any).num_canchas
          : typeof (it as any).courts_count === "number"
          ? (it as any).courts_count
          : undefined;

      return { id, nombre, direccion, comuna, deportes, canchas };
    });
  }, [raw]);

  // ⭐ PASO 1: asociar canchas a complejos
  const canchasMin: CanchaWithComplejo[] = useMemo(() => {
    if (!canchasData) return [];

    const arr = (canchasData.items ?? canchasData ?? []) as any[];

    return arr.map((c) => ({
      id_cancha: Number(c.id_cancha),
      id_complejo: c.id_complejo != null ? Number(c.id_complejo) : null,
    }));
  }, [canchasData]);

  // ⭐ PASO 2: calcular ratings por complejo
  const ratingsPorComplejo = useMemo(() => {
    if (!ratingsCanchas || !canchasMin.length) return new Map();

    return calcularRatingPorComplejo(canchasMin, ratingsCanchas);
  }, [ratingsCanchas, canchasMin]);

  // Filtros de búsqueda
  const complejos = useMemo(() => {
    return items.filter(
      (c) =>
        (q
          ? `${c.nombre} ${c.direccion} ${c.comuna}`
              .toLowerCase()
              .includes(q.toLowerCase())
          : true) &&
        (fDeporte ? c.deportes?.includes(fDeporte) : true) &&
        (fSector
          ? (c.comuna ?? "").toLowerCase().includes(fSector.toLowerCase())
          : true)
    );
  }, [items, q, fDeporte, fSector]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={
        <RefreshControl
          refreshing={!!isRefetching}
          onRefresh={() => refetch()}
        />
      }
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
              <Ionicons
                name="close-circle"
                size={18}
                color="#94a3b8"
              />
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
            const next =
              idx < 0
                ? deportes[0]
                : idx + 1 >= deportes.length
                ? null
                : deportes[idx + 1];
            setFDeporte(next);
          }}
          active={!!fDeporte}
        />
        <DropdownChip
          icon="map-outline"
          label={fSector ?? "Sector"}
          onPress={() => {
            const idx = sectores.indexOf(fSector ?? "");
            const next =
              idx < 0
                ? sectores[0]
                : idx + 1 >= sectores.length
                ? null
                : sectores[idx + 1];
            setFSector(next);
          }}
          active={!!fSector}
        />
        {(fDeporte || fSector) && (
          <TouchableOpacity
            onPress={() => {
              setFDeporte(null);
              setFSector(null);
            }}
          >
            <Text style={{ color: "#ef4444", fontWeight: "700" }}>
              Limpiar
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Loading / Error */}
      {isLoading && (
        <View style={{ paddingVertical: 24, alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      )}

      {/* Listado */}
      {!isLoading && !isError && (
        <View style={{ paddingHorizontal: 16, gap: 12, marginTop: 6 }}>
          {complejos.map((c) => {
            // ⭐ Obtener rating calculado del complejo
            const r =
              ratingsPorComplejo.get(Number(c.id)) ??
              ratingsPorComplejo.get(Number(c.id_complejo || c.id));

            return (
              <View key={String(c.id)} style={styles.card}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View style={styles.roundIcon}>
                    <Ionicons
                      name="home-outline"
                      size={16}
                      color="#0ea5a4"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{c.nombre}</Text>

                    <Text style={styles.cardSub}>
                      {(c.direccion || "Dirección desconocida")} ·{" "}
                      {c.comuna || "—"}
                    </Text>

                    {/* ⭐ Mostrar rating si existe */}
                    {r && r.total_resenas > 0 && (
                      <Text style={styles.cardSub}>
                        ⭐ {r.promedio.toFixed(1)} ({r.total_resenas})
                      </Text>
                    )}

                    {!!c.deportes?.length && (
                      <Text style={styles.cardSub}>
                        Deportes: {c.deportes.join(", ")}
                        {typeof c.canchas === "number"
                          ? ` · Canchas: ${c.canchas}`
                          : ""}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <PrimaryBtn
                    text="Ver canchas"
                    onPress={() => {
                      const complejoId = c.id ?? c.id_complejo;
                      router.push({
                        pathname:
                          "/(cancha)/canchas-por-complejo",
                        params: {
                          complejoId: String(complejoId),
                          nombre: String(c.nombre ?? ""),
                        },
                      });
                    }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

/* UI helpers */
function Segment({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.segment,
        active && styles.segmentActive,
      ]}
    >
      <Text
        style={[
          styles.segmentText,
          active && styles.segmentTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function DropdownChip({ icon, label, onPress, active }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Ionicons
        name={icon}
        size={14}
        color={active ? "#0ea5a4" : "#64748b"}
      />
      <Text
        style={[
          styles.chipText,
          active && styles.chipTextActive,
        ]}
      >
        {label}
      </Text>
      <Ionicons
        name="chevron-down"
        size={14}
        color={active ? "#0ea5a4" : "#94a3b8"}
      />
    </TouchableOpacity>
  );
}

function PrimaryBtn({ text, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.btnPrimary}>
      <Text style={{ color: "white", fontWeight: "700" }}>
        {text}
      </Text>
    </TouchableOpacity>
  );
}

/* estilos */
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: "#0d9488",
  },
  title: { color: "white", fontSize: 20, fontWeight: "800" },

  searchWrap: {
    marginTop: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 46,
  },

  filtersRow: {
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipActive: {
    borderColor: "#99f6e4",
    backgroundColor: "#ecfeff",
  },
  chipText: { color: "#334155", fontWeight: "600" },
  chipTextActive: { color: "#0ea5a4" },

  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
  },

  roundIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ecfeff",
    alignItems: "center",
    justifyContent: "center",
  },

  cardTitle: {
    fontWeight: "800",
    fontSize: 16,
  },

  cardSub: { color: "#6b7280", marginTop: 2 },

  cardActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  btnPrimary: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#0ea5a4",
    alignItems: "center",
    justifyContent: "center",
  },
});
