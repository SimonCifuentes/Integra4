import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Inicio" }} />
      <Tabs.Screen name="reservas" options={{ title: "Reservas" }} />
      <Tabs.Screen name="perfil" options={{ title: "Perfil" }} />
      {/* 👇 NO pongas href:null en la base */}
      <Tabs.Screen name="complejos" options={{ title: "Complejos" }} />
      {/* Solo oculta el detalle dinámico si lo tienes */}
      {/* <Tabs.Screen name="complejos/[id]" options={{ href: null }} /> */}
    </Tabs>
  );
}
