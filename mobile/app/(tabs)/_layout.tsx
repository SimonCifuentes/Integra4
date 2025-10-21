import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useAuth } from "@/src/stores/auth";

function isAdminLike(role?: string) {
  const r = (role || "").toLowerCase();
  return r === "superadmin" || r === "admin_general" || r === "admin";
}

export default function TabsLayout() {
  const { user } = useAuth();
  const rol = (user as any)?.rol ?? (user as any)?.role;
  const showAdmin = isAdminLike(rol);

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index" // tu home real
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="canchas" // ajusta si tu ruta se llama distinto
        options={{
          title: "Canchas",
          tabBarIcon: ({ color, size }) => <Ionicons name="football-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />

      {/* 👇 Nuevo tab. Aparece solo si el usuario es admin/superadmin */}
      <Tabs.Screen
        name="admin"             // <-- el bridge: app/(tabs)/admin.tsx
        options={{
          title: "Admin",
          href: showAdmin ? "/(tabs)/admin" : null, // oculto si no es admin
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
