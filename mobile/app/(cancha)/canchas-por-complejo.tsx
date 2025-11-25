// app/(tabs)/canchas-por-complejo.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { http } from "@/src/services/http";

// ⭐ NUEVO: hooks de reseñas (ratings)
import { hooks as resenasHooks } from "@/src/features/resenas/hooks";

const TEAL = "#0ea5a4";
// ⭐ Fotos estáticas para canchas (no dependen del backend)
const CANCHA_PHOTOS = [
  "https://mx.habcdn.com/photos/project/medium/canchas-deportivas-pasto-sintetico-183506.jpg",
  "data:image/jpeg;base64,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",
  "https://www.rubberandgrass.cl/wp-content/uploads/2024/06/pintura-se-usa-para-pintar-canchas-deportivas-en-Chile.png",
  "https://www.rubberandgrass.cl/wp-content/uploads/2024/06/pintura-se-usa-para-pintar-canchas-deportivas-en-Chile.png",
  "https://mx.habcdn.com/photos/project/medium/canchas-deportivas-pasto-sintetico-183506.jpg",
];

type Cancha = {
  id_cancha: number;
  id_complejo: number;
  nombre: string;
  deporte: string;
  superficie: string;
  capacidad: number;
  iluminacion: boolean;
  techada: boolean;
  esta_activa: boolean;
};

type Complejo = {
  id?: number | string;
  nombre?: string;
  nombre_complejo?: string;
  direccion?: string;
  comuna?: string;
  sector?: string;
  deportes?: string[];
  rating?: number;
  courts_count?: number;
  lat?: number;
  lng?: number;
  photos?: string[];
  descripcion?: string | null;
};

type SlotBE = {
  inicio: string; // "YYYY-MM-DDTHH:mm:ss"
  fin: string;
  etiqueta?: string;
  precio?: number | null;
};

// ⭐ NUEVO: tipado rating por cancha
type RatingCancha = {
  id_cancha: number;
  promedio: number;
  total_resenas: number;
};

async function fetchCanchasPorComplejo(idNum: number): Promise<Cancha[]> {
  const { data } = await http.get(`/complejos/${idNum}/canchas`);
  return Array.isArray(data) ? data : [];
}

async function fetchComplejo(idNum: number): Promise<Complejo | null> {
  const { data } = await http.get(`/complejos/${idNum}`);
  if (data) {
    const nombre = data.nombre ?? data.nombre_complejo ?? "";
    return { ...data, nombre };
  }
  return null;
}

function toYMD(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function formatSlotLabel(s: SlotBE) {
  if (s.etiqueta) return s.etiqueta;
  const a = s.inicio.slice(11, 16);
  const b = s.fin.slice(11, 16);
  return `${a} - ${b}`;
}
function formatCLP(n?: number | null) {
  if (typeof n !== "number") return "";
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${(n ?? 0).toLocaleString("es-CL")}`;
  }
}

function useSlots(id_cancha?: number, fecha?: string, slot_minutos = 60) {
  return useQuery({
    queryKey: ["slots", id_cancha, fecha, slot_minutos],
    enabled: Number.isFinite(id_cancha) && !!fecha,
    queryFn: async () => {
      const { data } = await http.get("/disponibilidad", {
        params: { id_cancha, fecha, slot_minutos },
      });
      const arr: SlotBE[] = Array.isArray(data)
        ? data
        : data?.data ?? data?.items ?? [];
      return arr;
    },
  });
}

export default function CanchasPorComplejoScreen() {
  const params = useLocalSearchParams();

  const idStr =
    (params.complejoId as string) ??
    (params.id as string) ??
    (params.id_complejo as string);

  const nombreParam = (params.nombre as string) ?? "";
  const idNum = Number(idStr);

  const {
    data: canchas,
    isLoading: isLoadingCanchas,
    isError: isErrorCanchas,
    error: errorCanchas,
    refetch: refetchCanchas,
    isRefetching: isRefetchingCanchas,
  } = useQuery({
    queryKey: ["canchas-por-complejo", idNum],
    queryFn: () => fetchCanchasPorComplejo(idNum),
    enabled: Number.isFinite(idNum),
    retry: 1,
  });

  const {
    data: complejo,
    isLoading: isLoadingComplejo,
    isError: isErrorComplejo,
    error: errorComplejo,
    refetch: refetchComplejo,
    isRefetching: isRefetchingComplejo,
  } = useQuery({
    queryKey: ["complejo", idNum],
    queryFn: () => fetchComplejo(idNum),
    enabled: Number.isFinite(idNum),
    retry: 1,
  });

  // ⭐ NUEVO: ratings promedio por cancha (todas las canchas)
  const { useRatingsPromedioCanchas } = resenasHooks as any;
  const { data: ratingsCanchas } = useRatingsPromedioCanchas?.() ?? {
    data: undefined,
  };

  // ⭐ map de rating por id_cancha
  const ratingsByCancha = useMemo(() => {
    const map = new Map<number, RatingCancha>();
    (ratingsCanchas ?? []).forEach((r: RatingCancha) => {
      if (typeof r.id_cancha === "number") {
        map.set(r.id_cancha, r);
      }
    });
    return map;
  }, [ratingsCanchas]);

  // ⭐ rating promedio del complejo (promedio ponderado de sus canchas)
  const ratingComplejo = useMemo(() => {
    if (!canchas || !ratingsByCancha.size) return null;

    let suma = 0;
    let total = 0;

    canchas.forEach((c) => {
      const r = ratingsByCancha.get(c.id_cancha);
      if (!r || !r.total_resenas) return;
      suma += r.promedio * r.total_resenas;
      total += r.total_resenas;
    });

    if (!total) return null;

    return {
      promedio: suma / total,
      total_resenas: total,
    };
  }, [canchas, ratingsByCancha]);

  const isFirstLoad = isLoadingCanchas || isLoadingComplejo;
  const isRefetching = isRefetchingCanchas || isRefetchingComplejo;

  const nombreComplejo = useMemo(
    () => complejo?.nombre || nombreParam || "Complejo",
    [complejo?.nombre, nombreParam]
  );

  const onRefresh = useCallback(() => {
    refetchCanchas();
    refetchComplejo();
  }, [refetchCanchas, refetchComplejo]);

  const openMaps = useCallback(() => {
    const lat = complejo?.lat;
    const lng = complejo?.lng;
    const q = encodeURIComponent(
      [complejo?.nombre, complejo?.direccion, complejo?.comuna]
        .filter(Boolean)
        .join(", ")
    );
    const url =
      lat != null && lng != null
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${q}`;
    Linking.openURL(url).catch(() => {});
  }, [complejo]);

  const [openSlotsId, setOpenSlotsId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const fechaYMD = toYMD(selectedDate);

  const {
    data: slots,
    isLoading: slotsLoading,
    refetch: refetchSlots,
    isFetching: slotsFetching,
  } = useSlots(openSlotsId ?? undefined, fechaYMD, 60);

  const toggleSlots = (id: number) => {
    setOpenSlotsId((prev) => (prev === id ? null : id));
  };

  const gotoDay = (delta: number) => {
    setSelectedDate((d) => addDays(d, delta));
    if (openSlotsId) refetchSlots();
  };

  if (!Number.isFinite(idNum)) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle" size={28} color="#ef4444" />
        <Text style={styles.error}>Falta el parámetro complejoId.</Text>
        <TouchableOpacity
          style={styles.retryBtnDark}
          onPress={() => router.back()}
        >
          <Text style={styles.retryTxt}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isFirstLoad) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Cargando complejo y canchas…</Text>
      </View>
    );
  }

  if (isErrorCanchas && isErrorComplejo) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle" size={28} color="#ef4444" />
        <Text style={styles.error}>
          {(errorComplejo as any)?.message ??
            "No se pudo cargar la info del complejo."}
        </Text>
        <Text style={[styles.error, { marginTop: 6 }]}>
          {(errorCanchas as any)?.message ??
            "No se pudieron cargar las canchas."}
        </Text>
        <TouchableOpacity style={styles.retryBtnDark} onPress={onRefresh}>
          <Text style={styles.retryTxt}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={canchas ?? []}
      keyExtractor={(item) => String(item.id_cancha)}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
      }
      contentContainerStyle={{ padding: 16 }}
      ListHeaderComponent={
        <View>
          {/* Header */}
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={22} />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Canchas del complejo</Text>
              <Text style={styles.subtle}>{nombreComplejo}</Text>
            </View>
          </View>

          {/* Ficha del complejo */}
          <View style={styles.venueCard}>
            {/* Fotos o banner */}
            {Array.isArray(complejo?.photos) &&
            complejo?.photos.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 10 }}
                contentContainerStyle={{ gap: 8 }}
              >
                {complejo!.photos!.slice(0, 5).map((uri, idx) => (
                  <Image
                    key={idx}
                    source={{ uri }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.banner}>
                <Ionicons name="business-outline" size={22} color="#fff" />
                <Text style={styles.bannerTxt}>{nombreComplejo}</Text>
              </View>
            )}

            <View style={{ gap: 6 }}>
              {(complejo?.direccion || complejo?.comuna) && (
                <Text style={styles.text}>
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color="#6b7280"
                  />{" "}
                  {[complejo?.direccion, complejo?.comuna]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              )}

              {/* Descripción */}
              {typeof complejo?.descripcion === "string" &&
              complejo.descripcion.trim().length > 0 ? (
                <Text style={styles.descripcion}>{complejo.descripcion}</Text>
              ) : (
                <Text style={styles.descripcionVacia}>Sin descripción</Text>
              )}

              {/* Chips deportes */}
              {Array.isArray(complejo?.deportes) &&
                complejo!.deportes!.length > 0 && (
                  <View style={styles.chipsRow}>
                    {complejo!.deportes!.map((dep, i) => (
                      <View key={i} style={styles.chip}>
                        <Text style={styles.chipTxt}>{dep}</Text>
                      </View>
                    ))}
                  </View>
                )}

              {/* Métricas rápidas */}
              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <Ionicons name="star" size={16} color="#f59e0b" />
                  <Text style={styles.metricTxt}>
                    {ratingComplejo && ratingComplejo.total_resenas > 0
                      ? `${ratingComplejo.promedio.toFixed(1)} (${
                          ratingComplejo.total_resenas
                        })`
                      : "—"}
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Ionicons name="grid-outline" size={16} color="#6b7280" />
                  <Text style={styles.metricTxt}>
                    {(complejo?.courts_count ?? canchas?.length ?? 0)} canchas
                  </Text>
                </View>
              </View>

              {/* Acciones */}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.btnGhost} onPress={openMaps}>
                  <Ionicons name="map-outline" size={16} color={TEAL} />
                  <Text style={styles.btnGhostTxt}>Cómo llegar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 10 }]}>
            Canchas
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const isOpen = openSlotsId === item.id_cancha;
        const rating = ratingsByCancha.get(item.id_cancha); // ⭐ rating por cancha

        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="football-outline" size={20} color={TEAL} />
              <Text style={styles.cardTitle}>{item.nombre}</Text>
            </View>

            {/* ⭐ CONTENEDOR CON FOTO + INFO */}
            <View style={styles.canchaRow}>

              {/* Foto estática (1 por cancha) */}
              <Image
                source={{ uri: CANCHA_PHOTOS[item.id_cancha % CANCHA_PHOTOS.length] }}
                style={styles.canchaPhoto}
                resizeMode="cover"
              />

              {/* Info de la cancha */}
              <View style={{ flex: 1 }}>
                {rating && rating.total_resenas > 0 && (
                  <Text style={[styles.text, { marginBottom: 6 }]}>
                    ⭐ {rating.promedio.toFixed(1)} ({rating.total_resenas} reseñas)
                  </Text>
                )}

                <Text style={styles.text}>🏅 Deporte: {item.deporte}</Text>
                <Text style={styles.text}>🧱 Superficie: {item.superficie}</Text>
                <Text style={styles.text}>👥 Capacidad: {item.capacidad}</Text>
                <Text style={styles.text}>
                  💡 Iluminación: {item.iluminacion ? "Sí" : "No"}
                </Text>
                <Text style={styles.text}>
                  🏠 Techada: {item.techada ? "Sí" : "No"}
                </Text>
                <Text style={styles.text}>
                  🔘 Estado: {item.esta_activa ? "Activa" : "Inactiva"}
                </Text>
              </View>

            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              

              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() =>
                  setOpenSlotsId((prev) =>
                    prev === item.id_cancha ? null : item.id_cancha
                  )
                }
              >
                <Ionicons name="time-outline" size={16} color="#fff" />
                <Text style={styles.btnPrimaryTxt}>
                  {isOpen ? "Ocultar horarios" : "Ver horarios"}
                </Text>
              </TouchableOpacity>
            </View>

            {isOpen && <SlotsPanel canchaId={item.id_cancha} />}
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.muted}>
            No hay canchas registradas para este complejo.
          </Text>
        </View>
      }
    />
  );
}

/** Panel de slots */
function SlotsPanel({ canchaId }: { canchaId: number }) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const fechaYMD = toYMD(selectedDate);

  const { data: slots, isLoading, isFetching, refetch } = useSlots(
    canchaId,
    fechaYMD,
    60
  );

  const gotoDay = (delta: number) => {
    setSelectedDate((d) => addDays(d, delta));
    refetch();
  };

  return (
    <View style={styles.slotsCard}>
      <View style={styles.dayRow}>
        <TouchableOpacity onPress={() => gotoDay(-1)} style={styles.dayBtn}>
          <Ionicons name="chevron-back" size={18} color={TEAL} />
        </TouchableOpacity>
        <Text style={styles.dayLabel}>{fechaYMD}</Text>
        <TouchableOpacity onPress={() => gotoDay(1)} style={styles.dayBtn}>
          <Ionicons name="chevron-forward" size={18} color={TEAL} />
        </TouchableOpacity>
      </View>

      {isLoading || isFetching ? (
        <View style={{ paddingVertical: 8 }}>
          <ActivityIndicator />
        </View>
      ) : !slots || slots.length === 0 ? (
        <Text style={styles.muted}>
          No hay horarios disponibles para este día.
        </Text>
      ) : (
        <View style={styles.slotChipsRow}>
          {slots.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={styles.slotChip}
              onPress={() =>
                router.push({
                  pathname: "/(reservar)/reservar",
                  params: {
                    canchaId: String(canchaId),
                    date: fechaYMD,
                    start: s.inicio.slice(11, 16),
                    end: s.fin.slice(11, 16),
                  },
                })
              }
            >
              <Text style={styles.slotChipTxt}>
                {formatSlotLabel(s)}
              </Text>
              {typeof s.precio === "number" && (
                <Text style={styles.slotChipPrice}>
                  {formatCLP(s.precio)}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  muted: { color: "#6b7280", textAlign: "center", marginTop: 8 },
  error: { color: "#ef4444", textAlign: "center" },
  retryBtnDark: {
    marginTop: 10,
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryTxt: { color: "#fff", fontWeight: "600" },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#efefef",
    marginRight: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  subtle: { color: "#6b7280" },

  venueCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    elevation: 1,
  },
  banner: {
    backgroundColor: TEAL,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bannerTxt: { color: "#fff", fontWeight: "800" },
  photo: {
    width: 160,
    height: 100,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
  },

  descripcion: { marginTop: 6, color: "#334155", lineHeight: 20 },
  descripcionVacia: {
    marginTop: 6,
    color: "#94a3b8",
    fontStyle: "italic",
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#ecfeff",
    borderColor: "#a5f3fc",
    borderWidth: 1,
  },
  chipTxt: { color: TEAL, fontWeight: "700" },

  metricsRow: { flexDirection: "row", gap: 14, marginTop: 6 },
  metric: { flexDirection: "row", alignItems: "center", gap: 6 },
  metricTxt: { color: "#374151", fontWeight: "700" },

  actionsRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  btnGhost: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#f0fdfa",
    borderWidth: 1,
    borderColor: "#99f6e4",
  },
  btnGhostTxt: { color: TEAL, fontWeight: "800" },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  cardBody: { marginBottom: 10 },
  text: { color: "#374151", marginBottom: 4 },

  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: TEAL,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    flex: 1,
  },
  btnPrimaryTxt: { color: "#fff", fontWeight: "700" },

  slotsCard: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
    gap: 8,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ecfeff",
    borderWidth: 1,
    borderColor: "#99f6e4",
  },
  dayLabel: { fontWeight: "800", color: "#0f172a" },

  slotChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  slotChipTxt: { fontWeight: "700", color: "#0f172a" },
  slotChipPrice: {
    color: "#16a34a",
    marginTop: 2,
    fontWeight: "700",
    textAlign: "center",
  },
    canchaRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  canchaPhoto: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
  },

});
