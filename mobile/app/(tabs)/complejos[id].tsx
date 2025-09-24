// app/(tabs)/complejos/[id].tsx
import { useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useComplejos } from "@/src/features/features/complejos/hooks";
import { useCanchas } from "@/src/features/features/canchas/hooks";

type Complejo = {
  id?: number | string;
  id_complejo?: number | string;
  nombre?: string;
  nombre_complejo?: string;
  direccion?: string;
  comuna?: string;
  sector?: string;
  deportes?: string[];
  rating?: number;
};

type Cancha = {
  id_cancha: number | string;
  id_complejo?: number | string;
  nombre?: string;
  deporte?: string;
  tipo?: string;
  superficie?: string;
  precio_desde?: number;
};

function clp(n?: number | null) {
  if (typeof n !== "number") return "";
  try {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
  } catch {
    return `$${n.toLocaleString("es-CL")}`;
  }
}

export default function ComplejoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // 1) Obtenemos el complejo. Si no tienes useComplejo(id), reusamos useComplejos y filtramos.
  const complejosQ = useComplejos({ page: 1, page_size: 200 });
  const complejo: Complejo | undefined = useMemo(() => {
    const list = ((complejosQ.data as any)?.items ?? complejosQ.data ?? []) as Complejo[];
    return list.find(
      c => String(c.id ?? c.id_complejo) === String(id)
    );
  }, [complejosQ.data, id]);

  // 2) Obtenemos las canchas del complejo (tu hook ya funciona con paginado)
  //    Si tu API soporta filtrar por complejo, agrega el parámetro adecuado:
  //    - común: { id_complejo: id } o { complejo_id: id }
  const canchasQ = useCanchas({ page: 1, page_size: 200, id_complejo: id } as any);

  const isLoading = complejosQ.isLoading || canchasQ.isLoading;
  const isError = complejosQ.isError || canchasQ.isError;

  if (isLoading) {
    return (
      <View style={{ flex:1, alignItems:"center", justifyContent:"center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isError || !complejo) {
    return (
      <View style={{ flex:1, alignItems:"center", justifyContent:"center", padding:16 }}>
        <Text style={{ color:"#b91c1c", textAlign:"center" }}>
          No se pudo cargar el complejo.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnOutline}>
          <Text style={{ color:"#0ea5a4", fontWeight:"700" }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canchas: Cancha[] = useMemo(() => {
    const items = (canchasQ.data?.items ?? canchasQ.data ?? []) as Cancha[];
    // Filtro de seguridad por si el backend no filtró:
    return items.filter(c => String(c.id_complejo ?? id) === String(id));
  }, [canchasQ.data, id]);

  return (
    <ScrollView style={{ flex:1, backgroundColor:"#fff" }} contentContainerStyle={{ paddingBottom: 20 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {complejo.nombre ?? complejo.nombre_complejo ?? "Complejo"}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      {/* Info del complejo */}
      <View style={{ paddingHorizontal:16, paddingTop:12, gap:6 }}>
        {!!complejo.rating && <Text style={{ fontWeight:"700" }}>⭐ {complejo.rating.toFixed(1)}</Text>}
        <Text style={{ color:"#6b7280" }}>
          {(complejo.direccion ?? "Dirección desconocida")}
          { (complejo.comuna ?? complejo.sector) ? ` · ${(complejo.comuna ?? complejo.sector)}` : "" }
        </Text>
        {!!complejo.deportes?.length && (
          <Text style={{ color:"#374151" }}>Deportes: {complejo.deportes.join(", ")}</Text>
        )}
      </View>

      {/* Lista de canchas del complejo */}
      <View style={{ paddingHorizontal:16, marginTop:14, gap:10 }}>
        <Text style={{ fontSize:16, fontWeight:"800", marginBottom:4 }}>Canchas</Text>
        {canchas.map((c) => (
          <View key={String(c.id_cancha)} style={styles.card}>
            <View style={{ flex:1 }}>
              <Text style={{ fontWeight:"800" }}>
                {c.nombre || c.tipo || c.deporte || "Cancha"}
              </Text>
              <Text style={{ color:"#6b7280" }}>
                {(c.tipo ?? c.deporte) ?? "—"}{c.superficie ? ` · ${c.superficie}` : ""}
              </Text>
              {!!c.precio_desde && (
                <Text style={{ color:"#374151", marginTop:2 }}>
                  {clp(c.precio_desde)} / h
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/reservar/${c.id_cancha}`)}
              style={styles.btnPrimary}
            >
              <Text style={{ color:"#fff", fontWeight:"700" }}>Reservar</Text>
            </TouchableOpacity>
          </View>
        ))}

        {canchas.length === 0 && (
          <Text style={{ color:"#6b7280" }}>Este complejo aún no tiene canchas visibles.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 44, paddingHorizontal: 12, paddingBottom: 10,
    backgroundColor: "#0d9488", flexDirection:"row", alignItems:"center", gap:10,
  },
  headerTitle: { color:"#fff", fontWeight:"800", fontSize:18, flex:1 },

  btnPrimary: {
    height: 40, borderRadius: 10, paddingHorizontal: 12,
    backgroundColor:"#0ea5a4", alignItems:"center", justifyContent:"center",
  },
  btnOutline: {
    marginTop: 12, height: 44, borderRadius: 10,
    borderWidth: 1, borderColor: "#99f6e4",
    backgroundColor: "#ecfeff", alignItems: "center", justifyContent: "center",
    paddingHorizontal: 16,
  },
  card: {
    flexDirection:"row", gap:12, alignItems:"center",
    borderWidth:1, borderColor:"#e5e7eb", borderRadius:12, padding:12,
  },
});
