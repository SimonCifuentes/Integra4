import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { useAuth } from "@/src/stores/auth";
import { SafeAreaView } from "react-native-safe-area-context";
import { registerForNotifications } from "@/src/services/notifications";

function isAdminLike(role?: string) {
  const r = (role || "").toLowerCase();
  return r === "superadmin" || r === "admin_general" || r === "admin";
}

export default function TabsLayout() {
  const { user } = useAuth();
  const rol = (user as any)?.rol ?? (user as any)?.role;
  const showAdmin = isAdminLike(rol);

  useEffect(() => {
    (async () => {
      try {
        const token = await registerForNotifications();
        if (token) {
          console.log("Expo push token:", token);
          // aquí podrías enviar el token a tu backend
        } else {
          console.log("No se obtuvo token de notificaciones");
        }
      } catch (error) {
        console.log("Error registrando notificaciones:", error);
      }
    })();
  }, []);

  return (
    // Hace que todo el contenido respete el notch / Dynamic Island (solo arriba)
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#ffffff" }}
      edges={["top"]}
    >
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen
          name="index" // Home
          options={{
            title: "Inicio",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" color={color} size={size} />
            ),
          }}
        />

        <Tabs.Screen
          name="canchas"
          options={{
            title: "Canchas",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="football-outline" color={color} size={size} />
            ),
          }}
        />

        <Tabs.Screen
          name="perfil"
          options={{
            title: "Perfil",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" color={color} size={size} />
            ),
          }}
        />

        <Tabs.Screen
          name="grupos"
          options={{
            title: "Grupos",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" size={size} color={color} />
            ),
          }}
        />

        {/* NUEVO: tab de Reservas con icono de calendario */}
        <Tabs.Screen
          name="reservas"
          options={{
            title: "Reservas",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" color={color} size={size} />
            ),
          }}
        />

        {/* NUEVO: tab de Complejos con icono tipo edificio */}
        <Tabs.Screen
          name="complejos"
          options={{
            title: "Complejos",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="business-outline" color={color} size={size} />
            ),
          }}
        />

        {/* Tab Admin: solo visible si el usuario es admin/superadmin */}
        <Tabs.Screen
          name="admin"
          options={{
            title: "Admin",
            href: showAdmin ? "/(tabs)/admin" : null, // oculto si no es admin
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
