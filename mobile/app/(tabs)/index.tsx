// app/(tabs)/index.tsx
import { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useAuth } from "@/src/stores/auth";
import { router } from "expo-router";

const { width } = Dimensions.get("window");

type Slide = { id: string; title: string; subtitle?: string; image: any };

function Carousel({ slides, autoMs = 4000 }: { slides: Slide[]; autoMs?: number }) {
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      const next = (index + 1) % slides.length;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setIndex(next);
    }, autoMs);
    return () => clearInterval(id);
  }, [index, slides.length, autoMs]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(newIndex);
  };

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
            <View style={{ flex: 1, borderRadius: 16, overflow: "hidden", backgroundColor: "#0ea5e9" }}>
              <Image
                source={s.image}
                resizeMode="cover"
                style={{ width: "100%", height: "100%", position: "absolute", opacity: 0.9 }}
              />
              <View
                style={{
                  flex: 1,
                  backgroundColor: "rgba(0,0,0,0.25)",
                  padding: 12,
                  justifyContent: "flex-end",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 18 }}>{s.title}</Text>
                {s.subtitle ? <Text style={{ color: "#e5e7eb", fontSize: 12 }}>{s.subtitle}</Text> : null}
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
          gap: 6,
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
      title: "PlayTemuco",
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header + Carrusel */}
      <View style={{ padding: 16, backgroundColor: "#0d9488" }}>
        <Text style={{ fontSize: 20, fontWeight: "600", color: "#fff" }}>
          Hola, {user?.name ?? user?.email ?? "Jugador"} 👋
        </Text>
        <Text style={{ fontSize: 14, color: "#e0f2f1" }}>¿Listo para reservar tu próxima cancha?</Text>
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
      <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 20 }}>
        <TouchableOpacity
          style={{ backgroundColor: "#e0f2fe", padding: 20, borderRadius: 16, alignItems: "center", width: "28%" }}
          onPress={() => router.push("/(tabs)/explorar")}
        >
          <Text style={{ fontWeight: "600", color: "#0369a1" }}>Explorar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: "#fef9c3", padding: 20, borderRadius: 16, alignItems: "center", width: "28%" }}
          onPress={() => router.push("/(tabs)/reservas")}
        >
          <Text style={{ fontWeight: "600", color: "#854d0e" }}>Reservas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: "#ede9fe", padding: 20, borderRadius: 16, alignItems: "center", width: "28%" }}
          onPress={() => router.push("/(tabs)/perfil")}
        >
          <Text style={{ fontWeight: "600", color: "#6d28d9" }}>Perfil</Text>
        </TouchableOpacity>
      </View>

      {/* Canchas destacadas + VER MÁS */}
      <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: "700" }}>Canchas destacadas</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/canchas")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ color: "#0ea5a4", fontWeight: "700" }}>Ver más</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[1, 2, 3].map((i) => (
            <TouchableOpacity
              key={i}
              style={{
                width: 180,
                height: 120,
                backgroundColor: "#f1f5f9",
                borderRadius: 12,
                marginRight: 12,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "600" }}>Cancha {i}</Text>
              <Text style={{ fontSize: 12, color: "#64748b" }}>Fútbol / Temuco</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Próximos eventos */}
      <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 12 }}>Próximos eventos</Text>
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
            <Text style={{ fontWeight: "600" }}>Evento deportivo {i}</Text>
            <Text style={{ fontSize: 12, color: "#64748b" }}>Domingo 18:00 · Cancha {i}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
