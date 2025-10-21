// app/(tabs)/canchas-por-complejo.tsx  (o app/canchas-por-complejo.tsx)
import React, { useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity,
  RefreshControl, Linking, Image, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { http } from "@/src/services/http";

const TEAL = "#0ea5a4";

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
  nombre_complejo?: string; // por compatibilidad
  direccion?: string;
  comuna?: string;
  sector?: string;
  deportes?: string[];
  rating?: number;
  courts_count?: number;
  lat?: number;
  lng?: number;
  photos?: string[];
};

async function fetchCanchasPorComplejo(idNum: number): Promise<Cancha[]> {
  const { data } = await http.get(`/complejos/${idNum}/canchas`);
  return Array.isArray(data) ? data : [];
}

async function fetchComplejo(idNum: number): Promise<Complejo | null> {
  const { data } = await http.get(`/complejos/${idNum}`);
  // normalizamos nombre
  if (data) {
    const nombre = data.nombre ?? data.nombre_complejo ?? "";
    return { ...data, nombre };
  }
  return null;
}

export default function CanchasPorComplejoScreen() {
  const params = useLocalSearchParams();

  // Acepta distintas claves: complejoId | id | id_complejo
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
      [complejo?.nombre, complejo?.direccion, complejo?.comuna].filter(Boolean).join(", ")
    );
    const url = lat != null && lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${q}`;
    Linking.openURL(url).catch(() => {});
  }, [complejo]);

  if (!Number.isFinite(idNum)) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle" size={28} color="#ef4444" />
        <Text style={styles.error}>Falta el parámetro complejoId.</Text>
        <TouchableOpacity style={styles.retryBtnDark} onPress={() => router.back()}>
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
          {(errorComplejo as any)?.message ?? "No se pudo cargar la info del complejo."}
        </Text>
        <Text style={[styles.error, { marginTop: 6 }]}>
          {(errorCanchas as any)?.message ?? "No se pudieron cargar las canchas."}
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
          {/* Header con back + título */}
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Canchas del complejo</Text>
              <Text style={styles.subtle}>{nombreComplejo}</Text>
            </View>
          </View>

          {/* Ficha del complejo */}
          <View style={styles.venueCard}>
            {/* Fotos (si existen) o banner */}
            {Array.isArray(complejo?.photos) && complejo?.photos.length > 0 ? (
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
                <Text style={styles.bannerTxt}>
                  {nombreComplejo}
                </Text>
              </View>
            )}

            <View style={{ gap: 6 }}>
              {(complejo?.direccion || complejo?.comuna) && (
                <Text style={styles.text}>
                  <Ionicons name="location-outline" size={14} color="#6b7280" />{" "}
                  {[complejo?.direccion, complejo?.comuna].filter(Boolean).join(", ")}
                </Text>
              )}

              {/* Chips de deportes */}
              {Array.isArray(complejo?.deportes) && complejo!.deportes!.length > 0 && (
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
                    {complejo?.rating != null ? complejo.rating.toFixed(1) : "—"}
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

          {/* Título de listado */}
          <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Canchas disponibles</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="football-outline" size={20} color={TEAL} />
            <Text style={styles.cardTitle}>{item.nombre}</Text>
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.text}>🏅 Deporte: {item.deporte}</Text>
            <Text style={styles.text}>🧱 Superficie: {item.superficie}</Text>
            <Text style={styles.text}>👥 Capacidad: {item.capacidad}</Text>
            <Text style={styles.text}>💡 Iluminación: {item.iluminacion ? "Sí" : "No"}</Text>
            <Text style={styles.text}>🏠 Techada: {item.techada ? "Sí" : "No"}</Text>
            <Text style={styles.text}>🔘 Estado: {item.esta_activa ? "Activa" : "Inactiva"}</Text>
          </View>

          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() =>
              router.push({
                pathname: "/reservar",
                params: { canchaId: String(item.id_cancha), complejoId: String(item.id_complejo) },
              })
            }
          >
            <Ionicons name="calendar-outline" size={16} color="#fff" />
            <Text style={styles.btnPrimaryTxt}>Reservar cancha</Text>
          </TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.muted}>No hay canchas registradas para este complejo.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  muted: { color: "#6b7280", textAlign: "center", marginTop: 8 },
  error: { color: "#ef4444", textAlign: "center" },
  retryBtnDark: { marginTop: 10, backgroundColor: "#111827", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  retryTxt: { color: "#fff", fontWeight: "600" },

  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#efefef", marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  subtle: { color: "#6b7280" },

  venueCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: "#e5e7eb", elevation: 1 },
  banner: { backgroundColor: TEAL, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 12, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  bannerTxt: { color: "#fff", fontWeight: "800" },
  photo: { width: 160, height: 100, borderRadius: 10, backgroundColor: "#e5e7eb" },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#ecfeff", borderColor: "#a5f3fc", borderWidth: 1 },
  chipTxt: { color: TEAL, fontWeight: "700" },

  metricsRow: { flexDirection: "row", gap: 14, marginTop: 6 },
  metric: { flexDirection: "row", alignItems: "center", gap: 6 },
  metricTxt: { color: "#374151", fontWeight: "700" },

  actionsRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  btnGhost: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#f0fdfa", borderWidth: 1, borderColor: "#99f6e4" },
  btnGhostTxt: { color: TEAL, fontWeight: "800" },

  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 8 },

  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: "#e5e7eb", elevation: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  cardBody: { marginBottom: 10 },
  text: { color: "#374151", marginBottom: 4 },

  btnPrimary: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: TEAL, paddingVertical: 10, borderRadius: 10 },
  btnPrimaryTxt: { color: "#fff", fontWeight: "700", marginLeft: 6 },
});
