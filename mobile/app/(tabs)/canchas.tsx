import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCanchas } from "@/src/features/features/canchas/hooks";
import ReservaModal from "@/src/components/ReservaModal";

const TEAL = "#0ea5a4";

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

function normalize(s?: string | number | null) {
  if (s == null) return "";
  return String(s)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

// Intenta deducir deporte desde `deporte` o desde el prefijo de `tipo` (e.g., "Fútbol 7" -> "Futbol")
function inferDeporte(item: CanchaBE): string {
  const d = item.deporte;
  if (d && normalize(d)) return d;

  const t = item.tipo ?? "";
  const firstWord = t.split(/\s+/)[0] ?? "";
  return firstWord || "";
}

function formatCLP(n?: number | null) {
  if (typeof n !== "number") return "";
  try {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
  } catch {
    return `$${(n ?? 0).toLocaleString("es-CL")}`;
  }
}

export default function CanchasScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useCanchas({ page: 1, page_size: 20 });

  // UI state (buscador + filtros)
  const [q, setQ] = useState("");
  const [fDeporte, setFDeporte] = useState<string | null>(null);
  const [fSector, setFSector] = useState<string | null>(null);
  const [fFecha, setFFecha] = useState<string | null>(null); // "Hoy" activa disponible_hoy

  // Reserva modal state
  const [selectedCancha, setSelectedCancha] = useState<CanchaBE | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Normaliza items desde el backend
  const items: CanchaBE[] = (data?.items ?? []) as CanchaBE[];

  // Catálogos dinámicos a partir de los datos
  const deportesOpciones = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      const dep = inferDeporte(it);
      const norm = normalize(dep);
      if (norm) set.add(dep); // guardamos label original
    }
    return Array.from(set).sort((a, b) => normalize(a).localeCompare(normalize(b)));
  }, [items]);

  const sectoresOpciones = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      const sec = it.sector ?? "";
      const norm = normalize(sec);
      if (norm) set.add(sec);
    }
    return Array.from(set).sort((a, b) => normalize(a).localeCompare(normalize(b)));
  }, [items]);

  // Filtros/búsqueda (cliente) — AHORA FUNCIONAN con normalización y deducción
  const canchas = useMemo(() => {
    const qn = normalize(q);
    const depN = normalize(fDeporte ?? "");
    const secN = normalize(fSector ?? "");
    const filtraHoy = fFecha === "Hoy";

    return items
      .filter((c) => {
        const texto = normalize(
          `${c.nombre_complejo ?? ""} ${c.tipo ?? ""} ${c.deporte ?? ""} ${c.sector ?? ""} ${c.nombre ?? ""}`
        );

        const deporteItem = inferDeporte(c);
        const deporteN = normalize(deporteItem);
        const sectorN = normalize(c.sector ?? "");

        const matchQ = qn ? texto.includes(qn) : true;
        const matchDeporte = depN ? deporteN === depN : true;
        const matchSector = secN ? sectorN === secN : true;
        const matchFecha = filtraHoy ? Boolean(c.disponible_hoy) : true;

        return matchQ && matchDeporte && matchSector && matchFecha;
      })
      .sort((a, b) => Number(b.disponible_hoy ?? 0) - Number(a.disponible_hoy ?? 0));
  }, [items, q, fDeporte, fSector, fFecha]);

  // --- Reserva: abrir modal
  const openReserva = (cancha: CanchaBE) => {
    setSelectedCancha(cancha);
    setModalVisible(true);
  };

  // --- Reserva: submit (conecta tu POST real aquí)
  const handleReservaSubmit = async (reservaData: {
    fecha: string;
    horaInicio: string;
    horaFin: string;
    canchaId?: string | number;
  }) => {
    const idCancha = reservaData.canchaId ?? selectedCancha?.id_cancha;

    const payload = {
      id_cancha: Number(idCancha),
      inicio: `${reservaData.fecha}T${reservaData.horaInicio}:00`,
      fin: `${reservaData.fecha}T${reservaData.horaFin}:00`,
    };

    console.log("POST /reservas payload:", payload);
    // await http.post(R.reservas.create, payload);

    setModalVisible(false);
  };

  // Header visual, buscador y filtros (estilo canchas-por-complejo)
  const listHeader = (
    <>
      <View style={styles.headerTop}>
        <Text style={styles.headerTitle}>Todas las canchas</Text>
        <Text style={styles.subtle}>Explora por deporte, complejo o sector</Text>
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

      {/* Filtros (con opciones reales del dataset) */}
      <View style={styles.filtersRow}>
        <DropdownChip
          icon="football-outline"
          label={fDeporte ?? "Deporte"}
          onPress={() => {
            // Cicla por las opciones detectadas + (limpiar)
            if (deportesOpciones.length === 0) return;
            if (!fDeporte) {
              setFDeporte(deportesOpciones[0]);
            } else {
              const idx = deportesOpciones.findIndex((d) => normalize(d) === normalize(fDeporte));
              const next = idx < 0 || idx + 1 >= deportesOpciones.length ? null : deportesOpciones[idx + 1];
              setFDeporte(next);
            }
          }}
          active={!!fDeporte}
          count={fDeporte ? canchas.filter(c => normalize(inferDeporte(c)) === normalize(fDeporte)).length : undefined}
        />
        <DropdownChip
          icon="map-outline"
          label={fSector ?? "Sector"}
          onPress={() => {
            if (sectoresOpciones.length === 0) return;
            if (!fSector) {
              setFSector(sectoresOpciones[0]);
            } else {
              const idx = sectoresOpciones.findIndex((s) => normalize(s) === normalize(fSector));
              const next = idx < 0 || idx + 1 >= sectoresOpciones.length ? null : sectoresOpciones[idx + 1];
              setFSector(next);
            }
          }}
          active={!!fSector}
          count={fSector ? canchas.filter(c => normalize(c.sector ?? "") === normalize(fSector)).length : undefined}
        />
        <DropdownChip
          icon="calendar-outline"
          label={fFecha ?? "Fecha"}
          onPress={() => setFFecha(fFecha ? null : "Hoy")}
          active={!!fFecha}
          // si está en "Hoy" muestra cuántas disponibles hoy
          count={fFecha ? canchas.filter(c => c.disponible_hoy).length : undefined}
        />

        {(fDeporte || fSector || fFecha) && (
          <TouchableOpacity
            onPress={() => {
              setFDeporte(null);
              setFSector(null);
              setFFecha(null);
            }}
          >
            <Text style={{ color: "#ef4444", fontWeight: "700" }}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Loading / Error */}
      {isLoading && (
        <View style={{ paddingVertical: 16, alignItems: "center" }}>
          <ActivityIndicator />
          <Text style={styles.muted}>Cargando canchas…</Text>
        </View>
      )}
      {isError && !isLoading && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ color: "#b91c1c" }}>No se pudieron cargar las canchas. Reintenta.</Text>
          <TouchableOpacity onPress={() => refetch()} style={[styles.btnOutline, { marginTop: 8 }]}>
            <Text style={{ color: TEAL, fontWeight: "700" }}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={[styles.sectionTitle, { marginTop: 6, paddingHorizontal: 16 }]}>Resultados</Text>
    </>
  );

  const renderItem = ({ item }: { item: CanchaBE }) => {
    const deporteUI = inferDeporte(item) || "—";
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="football-outline" size={20} color={TEAL} />
          <Text style={styles.cardTitle}>{item.nombre ?? item.tipo ?? deporteUI}</Text>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.text}>🏅 Deporte: {deporteUI}</Text>
          <Text style={styles.text}>🧱 Superficie: {item.superficie ?? "—"}</Text>
          <Text style={styles.text}>
            🏷️ Precio: {typeof item.precio_desde === "number" ? `${formatCLP(item.precio_desde)}/h` : "—"}
          </Text>
          <Text style={styles.text}>
            📍 {item.nombre_complejo ?? "Complejo"} · {item.sector ?? "—"}
          </Text>
          {typeof item.disponible_hoy === "boolean" && (
            <View style={{ marginTop: 6 }}>
              <Badge text={item.disponible_hoy ? "Hoy disponible" : "Hoy no hay"} tone={item.disponible_hoy ? "success" : "muted"} />
            </View>
          )}
        </View>

        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            style={styles.btnGhost}
            onPress={() =>
              router.push({
                pathname: "/canchas-por-complejo",
                params: { complejoId: String(item.id_complejo ?? ""), nombre: item.nombre_complejo ?? "" },
              })
            }
          >
            <Ionicons name="business-outline" size={16} color={TEAL} />
            <Text style={styles.btnGhostTxt}>Ver complejo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() =>
              router.push({
                pathname: "/(reservar)/reservar",
                params: { canchaId: String(item.id_cancha) },
              })
            }
          >
            <Ionicons name="calendar-outline" size={16} color="#fff" />
            <Text style={styles.btnPrimaryTxt}>Reservar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!isLoading && !isError && canchas.length === 0) {
    return (
      <FlatList
        data={[]}
        keyExtractor={() => "empty"}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={<EmptyState text="No encontramos canchas con esos filtros." />}
        refreshControl={<RefreshControl refreshing={!!isRefetching} onRefresh={() => refetch()} />}
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16, gap: 12 }}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <FlatList
        data={!isError ? canchas : []}
        keyExtractor={(it) => String(it.id_cancha)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={!!isRefetching} onRefresh={() => refetch()} />}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16, gap: 12 }}
      />

      <ReservaModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        cancha={selectedCancha as any}
        onSubmit={handleReservaSubmit}
      />
    </View>
  );
}

/* ---------- UI helpers ---------- */
function DropdownChip({
  icon,
  label,
  onPress,
  active,
  count,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
  count?: number;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Ionicons name={icon} size={14} color={active ? TEAL : "#64748b"} />
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      {typeof count === "number" && <Text style={styles.chipCount}>{count}</Text>}
      <Ionicons name="chevron-down" size={14} color={active ? TEAL : "#94a3b8"} />
    </TouchableOpacity>
  );
}

function Badge({ text, tone }: { text: string; tone?: "success" | "muted" }) {
  const bg = tone === "success" ? "#dcfce7" : "#e5e7eb";
  const fg = tone === "success" ? "#166534" : "#374151";
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
      <Text style={{ color: fg, fontWeight: "700" }}>{text}</Text>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={{ padding: 24, alignItems: "center" }}>
      <Text style={{ color: "#6b7280" }}>{text}</Text>
    </View>
  );
}

/* ---------- estilos ---------- */
const styles = StyleSheet.create({
  headerTop: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  subtle: { color: "#6b7280" },
  muted: { color: "#6b7280", textAlign: "center", marginTop: 8 },

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
  chipActive: { borderColor: "#99f6e4", backgroundColor: "#ecfeff" },
  chipText: { color: "#334155", fontWeight: "600" },
  chipTextActive: { color: TEAL },
  chipCount: { marginLeft: 4, fontWeight: "800", color: "#334155" },

  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 8 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    elevation: 1,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  cardBody: { marginBottom: 10 },
  text: { color: "#374151", marginBottom: 4 },

  cardActionsRow: { flexDirection: "row", gap: 10 },

  btnGhost: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#f0fdfa",
    borderWidth: 1,
    borderColor: "#99f6e4",
  },
  btnGhostTxt: { color: TEAL, fontWeight: "800" },

  btnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    backgroundColor: TEAL,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnPrimaryTxt: { color: "#fff", fontWeight: "700" },

  btnOutline: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#99f6e4",
    backgroundColor: "#ecfeff",
    alignItems: "center",
    justifyContent: "center",
  },
});
