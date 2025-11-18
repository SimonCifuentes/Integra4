// app/(tabs)/index.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image as RNImage,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "@/src/stores/auth";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { useCanchas } from "@/src/features/features/canchas/hooks";
import { useComplejos } from "@/src/features/features/complejos/hooks";
import { http } from "@/src/services/http";
import {
  calcularRatingPorComplejo,
  type CanchaWithComplejo,
  type RatingCancha,
} from "@/src/features/resenas/utils";

const { width } = Dimensions.get("window");
const TEAL = "#0ea5a4";

type Slide = { id: string; title: string; subtitle?: string; image: any };

type RatingResumen = {
  id_cancha: number;
  promedio: number;
  total_resenas: number;
};

function Carousel({
  slides,
  autoMs = 4000,
}: {
  slides: Slide[];
  autoMs?: number;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!slides.length) return;
    const id = setTimeout(() => {
      const next = (index + 1) % slides.length;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setIndex(next);
    }, autoMs);
    return () => clearTimeout(id);
  }, [index, slides.length, autoMs]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(newIndex);
  };

  if (!slides.length) return null;

  return (
    <View style={{ width, height: 180, marginTop: 12 }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        style={{ width, height: 180 }}
      >
        {slides.map((s) => (
          <View key={s.id} style={{ width, height: 180, paddingHorizontal: 16 }}>
            <View
              style={{
                flex: 1,
                borderRadius: 16,
                overflow: "hidden",
                backgroundColor: "#0ea5e9",
              }}
            >
              <RNImage
                source={s.image}
                resizeMode="cover"
                style={{
                  width: "100%",
                  height: "100%",
                  position: "absolute",
                  opacity: 0.9,
                }}
              />
              <View
                style={{
                  flex: 1,
                  backgroundColor: "rgba(0,0,0,0.25)",
                  padding: 12,
                  justifyContent: "flex-end",
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "700",
                    fontSize: 18,
                  }}
                >
                  {s.title}
                </Text>
                {s.subtitle ? (
                  <Text style={{ color: "#e5e7eb", fontSize: 12 }}>
                    {s.subtitle}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View
        style={{
          position: "absolute",
          bottom: 10,
          left: 0,
          right: 0,
          flexDirection: "row",
          justifyContent: "center",
        }}
      >
        {slides.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === index ? 10 : 8,
              height: i === index ? 10 : 8,
              borderRadius: 10,
              backgroundColor: i === index ? "#fff" : "rgba(255,255,255,0.6)",
              marginHorizontal: 3,
            }}
          />
        ))}
      </View>
    </View>
  );
}

export default function Home() {
  const { user } = useAuth();

  const slides: Slide[] = [
    {
      id: "logo",
      title: "SportHub",
      subtitle: "Reserva, paga y juega en minutos",
      image: require("@/assets/images/logo_principal.png"),
    },
    {
      id: "centro",
      title: "Centro de Temuco",
      subtitle: "Canchas cercanas a tu ubicación",
      image: require("@/assets/images/logo_principal.png"),
    },
    {
      id: "becker",
      title: "Estadio Germán Becker",
      subtitle: "Zonas deportivas destacadas",
      image: require("@/assets/images/logo_principal.png"),
    },
    {
      id: "nielol",
      title: "Cerro Ñielol",
      subtitle: "Encuentra canchas por sector",
      image: require("@/assets/images/logo_principal.png"),
    },
  ];

  /* ---------------- DATA: canchas, complejos y ratings ---------------- */

  const { data: canchasData, isLoading: loadingCanchas } = useCanchas({
    page: 1,
    page_size: 200,
  });

  const canchasList: any[] = useMemo(
    () => ((canchasData as any)?.items ?? canchasData ?? []) as any[],
    [canchasData]
  );

  const { data: complejosData, isLoading: loadingComplejos } = useComplejos({
    page: 1,
    page_size: 100,
  });

  const complejosList: any[] = useMemo(
    () => ((complejosData as any)?.items ?? complejosData ?? []) as any[],
    [complejosData]
  );

  // 🔹 AQUÍ LEEMOS DIRECTO EL ENDPOINT DE RATINGS
  const { data: ratingsData } = useQuery<RatingResumen[]>({
    queryKey: ["ratings_promedio_canchas_home"],
    queryFn: async () => {
      const { data } = await http.get("/resenas/promedio/canchas");
      const arr: any[] = Array.isArray(data)
        ? data
        : data?.data ?? data?.items ?? [];
      return arr as RatingResumen[];
    },
  });

  const ratingsByCancha = useMemo(() => {
    const map = new Map<number, RatingResumen>();
    (ratingsData ?? []).forEach((r) => {
      if (typeof r.id_cancha === "number") map.set(r.id_cancha, r);
    });
    return map;
  }, [ratingsData]);

  /* ---------------- CANCHAS DESTACADAS (TOP 3) ---------------- */

  const canchasDestacadas = useMemo(() => {
    if (!canchasList.length) return [];

    const enriched = canchasList
      .map((c: any) => {
        const r = ratingsByCancha.get(Number(c.id_cancha));
        return {
          ...c,
          _rating_promedio: r?.promedio ?? 0,
          _rating_total_resenas: r?.total_resenas ?? 0,
        };
      })
      .filter((c) => c._rating_total_resenas > 0)
      .sort((a, b) => {
        if (b._rating_promedio !== a._rating_promedio) {
          return b._rating_promedio - a._rating_promedio;
        }
        return b._rating_total_resenas - a._rating_total_resenas;
      });

    // si no hay ninguna con reseñas, mostramos las primeras 3 que existan
    if (enriched.length === 0) {
      return canchasList.slice(0, 3).map((c: any) => ({
        ...c,
        _rating_promedio: 0,
        _rating_total_resenas: 0,
      }));
    }

    return enriched.slice(0, 3);
  }, [canchasList, ratingsByCancha]);

  /* ---------------- MEJORES COMPLEJOS (TOP 3) ---------------- */

  const canchasMin: CanchaWithComplejo[] = useMemo(
    () =>
      canchasList.map((c: any) => ({
        id_cancha: Number(c.id_cancha),
        id_complejo:
          c.id_complejo != null ? Number(c.id_complejo) : null,
      })),
    [canchasList]
  );

  const ratingsPorComplejo = useMemo(
    () =>
      ratingsData && canchasMin.length
        ? calcularRatingPorComplejo(
            canchasMin,
            (ratingsData as unknown as RatingCancha[]) ?? []
          )
        : new Map(),
    [ratingsData, canchasMin]
  );

  const mejoresComplejos = useMemo(() => {
    if (!complejosList.length) return [];

    const enriched = complejosList
      .map((c: any) => {
        const id =
          Number(c.id_complejo ?? c.id ?? c.id_complejo_id ?? 0) || 0;
        const r = ratingsPorComplejo.get(id);
        return {
          ...c,
          _id_resuelto: id,
          _rating_promedio: r?.promedio ?? 0,
          _rating_total_resenas: r?.total_resenas ?? 0,
        };
      })
      .filter((c) => c._id_resuelto) // que tengan id resuelto
      .sort((a, b) => {
        // primero los que tienen reseñas
        const aHas = a._rating_total_resenas > 0;
        const bHas = b._rating_total_resenas > 0;
        if (aHas !== bHas) return Number(bHas) - Number(aHas);

        if (b._rating_promedio !== a._rating_promedio) {
          return b._rating_promedio - a._rating_promedio;
        }
        return b._rating_total_resenas - a._rating_total_resenas;
      });

    // si ninguno tiene reseñas, mostramos simplemente los primeros 3
    if (!enriched.some((e: any) => e._rating_total_resenas > 0)) {
      return complejosList.slice(0, 3).map((c: any) => ({
        ...c,
        _id_resuelto: Number(c.id_complejo ?? c.id ?? 0) || 0,
        _rating_promedio: 0,
        _rating_total_resenas: 0,
      }));
    }

    return enriched.slice(0, 3);
  }, [complejosList, ratingsPorComplejo]);

  const isLoading = loadingCanchas || loadingComplejos;

  /* ---------------- RENDER ---------------- */

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header + Carrusel */}
      <View style={{ padding: 16, backgroundColor: "#0d9488" }}>
        <Text style={{ fontSize: 20, fontWeight: "600", color: "#fff" }}>
          Hola, {user?.name ?? user?.email ?? "Jugador"} 👋
        </Text>
        <Text style={{ fontSize: 14, color: "#e0f2f1" }}>
          ¿Listo para reservar tu próxima cancha?
        </Text>
        <Carousel slides={slides} />
      </View>

      {/* Buscador */}
      <View style={{ padding: 16 }}>
        <TextInput
          placeholder="Buscar canchas por deporte o ubicación..."
          style={{
            backgroundColor: "#f1f5f9",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: "#cbd5e1",
          }}
        />
      </View>

      {/* Acceso rápido */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          marginBottom: 20,
        }}
      >
        <TouchableOpacity
          style={{
            backgroundColor: "#e0f2fe",
            padding: 20,
            borderRadius: 16,
            alignItems: "center",
            width: "28%",
          }}
          onPress={() => router.push("/(tabs)/canchas")}
        >
          <Text style={{ fontWeight: "600", color: "#0369a1" }}>
            Explorar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: "#fef9c3",
            padding: 20,
            borderRadius: 16,
            alignItems: "center",
            width: "28%",
          }}
          onPress={() => router.push("/(reservar)/mis-reservas")}
        >
          <Text style={{ fontWeight: "600", color: "#854d0e" }}>
            Reservas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: "#ede9fe",
            padding: 20,
            borderRadius: 16,
            alignItems: "center",
            width: "28%",
          }}
          onPress={() => router.push("/perfil")}
        >
          <Text style={{ fontWeight: "600", color: "#6d28d9" }}>
            Perfil
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={{ paddingVertical: 8 }}>
          <ActivityIndicator />
        </View>
      )}

      {/* Canchas destacadas */}
      <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700" }}>
            Canchas destacadas
          </Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/canchas")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ color: TEAL, fontWeight: "700" }}>Ver más</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {canchasDestacadas.length === 0 ? (
            <View
              style={{
                width: 220,
                height: 120,
                backgroundColor: "#f1f5f9",
                borderRadius: 12,
                marginRight: 12,
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ fontSize: 12, color: "#64748b" }}>
                No hay canchas disponibles aún.
              </Text>
            </View>
          ) : (
            canchasDestacadas.map((c: any) => (
              <TouchableOpacity
                key={c.id_cancha}
                style={{
                  width: 180,
                  height: 120,
                  backgroundColor: "#f1f5f9",
                  borderRadius: 12,
                  marginRight: 12,
                  justifyContent: "center",
                  paddingHorizontal: 12,
                }}
                onPress={() =>
                  router.push({
                    pathname: "/(cancha)/canchas-por-complejo",
                    params: {
                      complejoId: String(c.id_complejo),
                      nombre: String(c.nombre_complejo ?? ""),
                    },
                  })
                }
              >
                <Text style={{ fontWeight: "600" }}>
                  {c.nombre ?? c.tipo ?? "Cancha"}
                </Text>
                <Text style={{ fontSize: 12, color: "#64748b" }}>
                  {c.deporte ?? "Deporte"} / {c.sector ?? "—"}
                </Text>
                {c._rating_total_resenas > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      marginTop: 4,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 12, color: "#0f172a" }}>
                      ⭐ {c._rating_promedio.toFixed(1)} (
                      {c._rating_total_resenas})
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      {/* Mejores complejos */}
      <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700" }}>
            Mejores complejos
          </Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/complejos")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ color: TEAL, fontWeight: "700" }}>Ver más</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {mejoresComplejos.length === 0 ? (
            <View
              style={{
                width: 220,
                height: 120,
                backgroundColor: "#f1f5f9",
                borderRadius: 12,
                marginRight: 12,
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ fontSize: 12, color: "#64748b" }}>
                No hay complejos disponibles aún.
              </Text>
            </View>
          ) : (
            mejoresComplejos.map((c: any) => (
              <TouchableOpacity
                key={c._id_resuelto}
                style={{
                  width: 180,
                  height: 120,
                  backgroundColor: "#f8fafc",
                  borderRadius: 12,
                  marginRight: 12,
                  justifyContent: "center",
                  paddingHorizontal: 12,
                }}
                onPress={() =>
                  router.push({
                    pathname: "/(cancha)/canchas-por-complejo",
                    params: {
                      complejoId: String(c._id_resuelto),
                      nombre: String(c.nombre ?? c.nombre_complejo ?? ""),
                    },
                  })
                }
              >
                <Text style={{ fontWeight: "600" }}>
                  {c.nombre ?? c.nombre_complejo ?? "Complejo"}
                </Text>
                <Text style={{ fontSize: 12, color: "#64748b" }}>
                  {c.direccion ?? "Dirección desconocida"}
                </Text>
                {c._rating_total_resenas > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      marginTop: 4,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 12, color: "#0f172a" }}>
                      ⭐ {c._rating_promedio.toFixed(1)} (
                      {c._rating_total_resenas})
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      {/* Próximos eventos (placeholder) */}
      <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 12 }}>
          Próximos eventos
        </Text>
        {[1, 2].map((i) => (
          <TouchableOpacity
            key={i}
            style={{
              backgroundColor: "#f8fafc",
              borderWidth: 1,
              borderColor: "#e2e8f0",
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontWeight: "600" }}>
              Evento deportivo {i}
            </Text>
            <Text style={{ fontSize: 12, color: "#64748b" }}>
              Domingo 18:00 · Cancha {i}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
