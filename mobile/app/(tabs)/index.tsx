﻿// app/(tabs)/index.tsx
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

/* -------------------------------------------------------------------------- */
/*                                  Tipos                                     */
/* -------------------------------------------------------------------------- */

type Slide = {
  id: number;
  title: string;
  subtitle?: string;
  description?: string;
  image?: { uri: string };
};

type RatingResumen = {
  id_cancha: number;
  promedio: number;
  total_resenas: number;
};

/* -------------------------------------------------------------------------- */
/*                                Carousel Hero                               */
/* -------------------------------------------------------------------------- */

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
          <View
            key={s.id}
            style={{
              width,
              paddingHorizontal: 16,
            }}
          >
            <View
              style={{
                flex: 1,
                borderRadius: 16,
                overflow: "hidden",
                backgroundColor: "#0ea5e9",
              }}
            >
              {s.image && (
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
              )}
              <View
                style={{
                  flex: 1,
                  backgroundColor: "rgba(0,0,0,0.25)",
                  padding: 12,
                  justifyContent: "flex-end",
                }}
              >
                {s.subtitle && (
                  <Text
                    style={{
                      color: "#e0f2fe",
                      fontSize: 12,
                      marginBottom: 2,
                    }}
                  >
                    {s.subtitle}
                  </Text>
                )}
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "700",
                    fontSize: 18,
                  }}
                >
                  {s.title}
                </Text>
                {s.description && (
                  <Text
                    style={{
                      color: "#e5e7eb",
                      fontSize: 13,
                      marginTop: 4,
                    }}
                  >
                    {s.description}
                  </Text>
                )}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* dots */}
      <View
        style={{
          position: "absolute",
          bottom: 12,
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

/* -------------------------------------------------------------------------- */
/*                                   Home                                     */
/* -------------------------------------------------------------------------- */

export default function HomeScreen() {
  const { user } = useAuth();

  const slides: Slide[] = [
    {
      id: 1,
      title: "Cerro Ñielol",
      subtitle: "Encuentra canchas por sector",
      description: "Descubre canchas cerca de ti y reserva en segundos.",
      image: {
        uri: "https://images.pexels.com/photos/399187/pexels-photo-399187.jpeg?auto=compress&cs=tinysrgb&w=800",
      },
    },
    {
      id: 2,
      title: "Organiza el partido",
      subtitle: "Reserva fácil y rápido",
      description: "Elige cancha, horario y listo. Nosotros nos encargamos.",
      image: {
        uri: "https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=800",
      },
    },
    {
      id: 3,
      title: "Descubre nuevos complejos",
      subtitle: "Explora por deporte o sector",
      description: "Pistas de fútbol, pádel, básquet y mucho más.",
      image: {
        uri: "https://images.pexels.com/photos/114296/pexels-photo-114296.jpeg?auto=compress&cs=tinysrgb&w=800",
      },
    },
  ];

  /* ---------------- DATA: canchas, complejos y ratings ---------------- */

  // Ultra defensivo: dejamos que la API use su page_size por defecto
  const { data: canchasData, isLoading: loadingCanchas } = useCanchas({
    page: 1,
  } as any);

  const canchasList: any[] = useMemo(
    () => ((canchasData as any)?.items ?? canchasData ?? []) as any[],
    [canchasData]
  );

  const { data: complejosData, isLoading: loadingComplejos } = useComplejos({
    page: 1,
  } as any);

  const complejosList: any[] = useMemo(
    () => ((complejosData as any)?.items ?? complejosData ?? []) as any[],
    [complejosData]
  );

  // 🔹 ratings promedio por cancha
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
        id_complejo: c.id_complejo != null ? Number(c.id_complejo) : null,
      })),
    [canchasList]
  );

  const ratingsPorComplejo = useMemo(
    () =>
      ratingsData && canchasMin.length
        ? calcularRatingPorComplejo(
            canchasMin,
            ratingsData as unknown as RatingCancha[]
          )
        : new Map<number, RatingCancha>(),
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
      .filter((c) => c._id_resuelto)
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

  /* ---------------------------------------------------------------------- */

  const loadingAny = loadingCanchas || loadingComplejos;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#ffffff" }}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 4,
          backgroundColor: "#0f766e",
        }}
      >
        <Text style={{ color: "#e0f2f1", fontSize: 16 }}>
          Hola, {user?.email ?? "visitante"} 👋
        </Text>
        <Text style={{ color: "#ccfbf1", fontSize: 14 }}>
          ¿Listo para reservar tu próxima cancha?
        </Text>
      </View>

      {/* Hero */}
      <Carousel slides={slides} />

      {/* Buscador */}
      <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            backgroundColor: "#f8fafc",
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <TextInput
            placeholder="Buscar canchas por deporte o ubicación..."
            placeholderTextColor="#94a3b8"
            style={{
              fontSize: 15,
              paddingVertical: 4,
            }}
          />
        </View>
      </View>

      {/* Acciones rápidas */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 16,
          marginTop: 16,
          marginBottom: 8,
          gap: 8,
        }}
      >
        <QuickButton
          label="Explorar"
          color="#dbeafe"
          textColor="#1d4ed8"
          onPress={() => router.push("/(tabs)/canchas")}
        />
        <QuickButton
          label="Reservas"
          color="#fef9c3"
          textColor="#92400e"
          onPress={() => router.push("/(reservar)/mis-reservas")}
        />
        <QuickButton
          label="Perfil"
          color="#f3e8ff"
          textColor="#6b21a8"
          onPress={() => router.push("/(tabs)/perfil")}
        />
      </View>

      {loadingAny && (
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <ActivityIndicator />
        </View>
      )}

      {/* Canchas destacadas */}
      <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 24 }}>
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
                  width: 220,
                  height: 120,
                  backgroundColor: "#f8fafc",
                  borderRadius: 12,
                  marginRight: 12,
                  justifyContent: "center",
                  paddingHorizontal: 12,
                }}
                onPress={() =>
                  router.push({
                    pathname: "/(cancha)/reserva",
                    params: {
                      canchaId: String(c.id_cancha),
                    },
                  })
                }
              >
                <Text style={{ fontWeight: "700" }}>{c.nombre}</Text>
                <Text style={{ fontSize: 12, color: "#64748b" }}>
                  {c.deporte ?? "Deporte"} · {c.superficie ?? "Superficie"}
                </Text>
                <Text style={{ marginTop: 4, fontSize: 12 }}>
                  ⭐{" "}
                  {c._rating_promedio?.toFixed
                    ? c._rating_promedio.toFixed(1)
                    : c._rating_promedio}{" "}
                  ({c._rating_total_resenas} reseñas)
                </Text>
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
                      nombre: c.nombre,
                    },
                  })
                }
              >
                <Text style={{ fontWeight: "700" }}>{c.nombre}</Text>
                {c.direccion && (
                  <Text style={{ fontSize: 12, color: "#64748b" }}>
                    {c.direccion}
                  </Text>
                )}
                <Text style={{ marginTop: 4, fontSize: 12 }}>
                  ⭐{" "}
                  {c._rating_promedio?.toFixed
                    ? c._rating_promedio.toFixed(1)
                    : c._rating_promedio}{" "}
                  ({c._rating_total_resenas} reseñas)
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      {/* Próximos eventos (placeholder) */}
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700" }}>
            Próximos eventos
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          {[1, 2].map((i) => (
            <TouchableOpacity
              key={i}
              style={{
                backgroundColor: "#f9fafb",
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 12,
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
      </View>
    </ScrollView>
  );
}

/* -------------------------------------------------------------------------- */
/*                             Componentes pequeños                            */
/* -------------------------------------------------------------------------- */

function QuickButton({
  label,
  color,
  textColor,
  onPress,
}: {
  label: string;
  color: string;
  textColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={{
        flex: 1,
        height: 60,
        borderRadius: 16,
        backgroundColor: color,
        alignItems: "center",
        justifyContent: "center",
      }}
      onPress={onPress}
    >
      <Text style={{ color: textColor, fontWeight: "700" }}>{label}</Text>
    </TouchableOpacity>
  );
}
