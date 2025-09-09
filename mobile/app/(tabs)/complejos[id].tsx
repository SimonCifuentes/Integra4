// app/(tabs)/complejos/[id].tsx
import { useEffect, useMemo, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  Image, Linking, Alert
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// ===== Tipos =====
type HorarioDia = { dia: string; abre: string; cierra: string; cerrado?: boolean };
type PrecioPorDeporte = { deporte: string; precioHora: number }; // CLP/h
type Cancha = {
  id: number;
  nombre: string;
  deporte: string;
  tipo: string; // Fútbol 5 / Pádel / etc
  superficie?: string;
  techada?: boolean;
  iluminacion?: boolean;
  precioHora?: number; // override si difiere del general
  disponibleHoy?: boolean;
};
type Complejo = {
  id: number;
  nombre: string;
  direccion: string;
  sector: string;      // comuna/barrio
  lat?: number;
  lng?: number;
  rating?: number;
  fotos: string[];     // URLs a imágenes
  horarios: HorarioDia[];
  precios: PrecioPorDeporte[];
  deportes: string[];
  amenities: string[]; // estacionamiento, camarines, duchas, cafetería, etc.
  reglas?: string[];   // reglamento / recomendaciones
  contacto?: {
    telefono?: string;
    email?: string;
    web?: string;
    instagram?: string;
  };
  infoAdicional?: string;  // texto libre del dueño
  canchas: Cancha[];
};

// ===== Mock temporal (borra cuando conectes API) =====
const MOCK: Complejo = {
  id: 1,
  nombre: "Complejo Ñielol",
  direccion: "Av. Alemania 1234",
  sector: "Temuco Centro",
  lat: -38.736, lng: -72.598,
  rating: 4.6,
  fotos: [
    "https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1599050751790-581cbf1e5a52?q=80&w=1600&auto=format&fit=crop",
  ],
  horarios: [
    { dia: "Lun", abre: "08:00", cierra: "23:00" },
    { dia: "Mar", abre: "08:00", cierra: "23:00" },
    { dia: "Mié", abre: "08:00", cierra: "23:00" },
    { dia: "Jue", abre: "08:00", cierra: "23:00" },
    { dia: "Vie", abre: "08:00", cierra: "01:00" },
    { dia: "Sáb", abre: "08:00", cierra: "01:00" },
    { dia: "Dom", abre: "09:00", cierra: "22:00" },
  ],
  precios: [
    { deporte: "Fútbol 7", precioHora: 20000 },
    { deporte: "Pádel",    precioHora: 16000 },
  ],
  deportes: ["Fútbol 7", "Pádel"],
  amenities: ["Estacionamiento", "Camarines", "Iluminación", "Cafetería"],
  reglas: ["Llegar 10 minutos antes", "Uso de calzado adecuado", "Prohibido fumar dentro del complejo"],
  contacto: {
    telefono: "+56 9 1234 5678",
    email: "contacto@nielol.cl",
    instagram: "https://instagram.com/nielolsport",
  },
  infoAdicional: "Descuentos para ligas y convenios con empresas. Pregunta por horarios valle.",
  canchas: [
    { id: 101, nombre: "Cancha 1", deporte: "Fútbol", tipo: "Fútbol 7", superficie: "Pasto sintético", iluminacion: true,  precioHora: 20000, disponibleHoy: true  },
    { id: 102, nombre: "Cancha 2", deporte: "Pádel",  tipo: "Pádel",     superficie: "Sintética",       techada: true,     precioHora: 16000, disponibleHoy: false },
  ],
};

// ===== Utils =====
function clp(n: number) {
  try { return new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(n); }
  catch { return `$${n}`; }
}

// ===== Screen =====
export default function VerComplejoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<Complejo | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const fetchComplex = async () => {
      try {
        setLoading(true);
        setErr(null);
        // TODO: conecta tu endpoint real (por ejemplo /complejos/:id)
        // const res = await http.get<Complejo>(`/complejos/${id}`);
        // setData(res.data);
        // Mock mientras tanto:
        setTimeout(() => setData({ ...MOCK, id: Number(id) || 1 }), 300);
      } catch (e: any) {
        setErr(e?.message || "No se pudo cargar el complejo.");
      } finally {
        setLoading(false);
      }
    };
    fetchComplex();
  }, [id]);

  const abrirMapa = () => {
    if (!data?.lat || !data?.lng) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${data.lat},${data.lng}`;
    Linking.openURL(url).catch(() => Alert.alert("No se pudo abrir el mapa"));
  };

  const reservarComplejo = () => {
    // Podrías abrir selector de cancha/fecha; por ahora va a la lista de canchas del complejo
    router.push(`/(tabs)/complejos/${id}#reservar`);
    Alert.alert("Reserva", "Elige una cancha y horario para continuar.");
  };

  if (loading) {
    return (
      <View style={{ flex:1, alignItems:"center", justifyContent:"center" }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (err || !data) {
    return (
      <View style={{ flex:1, alignItems:"center", justifyContent:"center", padding:16 }}>
        <Text style={{ color:"#b91c1c", textAlign:"center" }}>{err || "No se encontró el complejo."}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnOutline}>
          <Text style={{ color:"#0ea5a4", fontWeight:"700" }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex:1, backgroundColor:"#fff" }} contentContainerStyle={{ paddingBottom: 28 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{data.nombre}</Text>
        <TouchableOpacity onPress={reservarComplejo}>
          <Text style={styles.headerCta}>Reservar</Text>
        </TouchableOpacity>
      </View>

      {/* Galería */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal:16, gap:10, marginTop:12 }}
      >
        {data.fotos.map((src, i) => (
          <Image key={i} source={{ uri: src }} style={{ width: 240, height: 140, borderRadius: 12, backgroundColor:"#e5e7eb" }} />
        ))}
      </ScrollView>

      {/* Info principal */}
      <View style={{ paddingHorizontal:16, marginTop:12 }}>
        <View style={{ flexDirection:"row", alignItems:"center", gap:8 }}>
          {!!data.rating && <Text style={{ fontWeight:"700" }}>⭐ {data.rating.toFixed(1)}</Text>}
          <Text style={{ color:"#6b7280" }}>{data.deportes.join(" · ")}</Text>
        </View>

        <View style={{ marginTop:6, flexDirection:"row", alignItems:"center", gap:8 }}>
          <Ionicons name="location-outline" size={16} color="#0ea5a4" />
          <Text style={{ fontWeight:"600" }}>{data.direccion}</Text>
          <Text style={{ color:"#6b7280" }}> · {data.sector}</Text>
          {(data.lat && data.lng) && (
            <TouchableOpacity onPress={abrirMapa}>
              <Text style={{ color:"#0ea5a4", fontWeight:"700" }}>  Ver mapa</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Precios por deporte */}
      <Section title="Precio por hora">
        {data.precios.map((p, idx) => (
          <Row key={idx} left={p.deporte} right={clp(p.precioHora)} />
        ))}
      </Section>

      {/* Horarios */}
      <Section title="Horarios">
        <View style={{ flexDirection:"row", flexWrap:"wrap" }}>
          {data.horarios.map((h, idx) => (
            <View key={idx} style={styles.badge}>
              <Text style={{ fontWeight:"700" }}>{h.dia} </Text>
              <Text style={{ color:"#374151" }}>
                {h.cerrado ? "Cerrado" : `${h.abre} - ${h.cierra}`}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      {/* Amenities */}
      {data.amenities?.length ? (
        <Section title="Servicios">
          <View style={{ flexDirection:"row", flexWrap:"wrap", gap:8 }}>
            {data.amenities.map((a, i) => (
              <Tag key={i} text={a} />
            ))}
          </View>
        </Section>
      ) : null}

      {/* Reglamento */}
      {data.reglas?.length ? (
        <Section title="Reglamento">
          <View style={{ gap:6 }}>
            {data.reglas.map((r, i) => (
              <View key={i} style={{ flexDirection:"row", gap:8 }}>
                <Text>•</Text><Text style={{ flex:1 }}>{r}</Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      {/* Contacto */}
      {(data.contacto?.telefono || data.contacto?.email || data.contacto?.web || data.contacto?.instagram) && (
        <Section title="Contacto">
          {data.contacto?.telefono ? (
            <LinkRow icon="call-outline" label={data.contacto.telefono} onPress={() => Linking.openURL(`tel:${data.contacto?.telefono}`)} />
          ) : null}
          {data.contacto?.email ? (
            <LinkRow icon="mail-outline" label={data.contacto.email} onPress={() => Linking.openURL(`mailto:${data.contacto?.email}`)} />
          ) : null}
          {data.contacto?.web ? (
            <LinkRow icon="globe-outline" label={data.contacto.web} onPress={() => Linking.openURL(data.contacto!.web!)} />
          ) : null}
          {data.contacto?.instagram ? (
            <LinkRow icon="logo-instagram" label="Instagram" onPress={() => Linking.openURL(data.contacto!.instagram!)} />
          ) : null}
        </Section>
      )}

      {/* Información adicional */}
      {data.infoAdicional ? (
        <Section title="Información adicional">
          <Text style={{ color:"#374151" }}>{data.infoAdicional}</Text>
        </Section>
      ) : null}

      {/* Canchas del complejo */}
      <Section title="Canchas disponibles">
        {data.canchas.map(c => (
          <View key={c.id} style={styles.canchaCard}>
            <View style={{ flex:1 }}>
              <Text style={{ fontWeight:"800" }}>{c.nombre}</Text>
              <Text style={{ color:"#6b7280" }}>
                {c.tipo} · {c.deporte}{c.superficie ? ` · ${c.superficie}` : ""}
              </Text>
              <Text style={{ color:"#374151", marginTop:2 }}>
                {clp(c.precioHora ?? (data.precios.find(p=>p.deporte===c.tipo)?.precioHora ?? 0))} / h
              </Text>
              <Text style={{ marginTop:4, color: c.disponibleHoy ? "#166534" : "#6b7280" }}>
                {c.disponibleHoy ? "Hoy disponible" : "Consulta disponibilidad"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/reservar/${c.id}`)}
              style={styles.btnPrimary}
            >
              <Text style={{ color:"#fff", fontWeight:"700" }}>Reservar</Text>
            </TouchableOpacity>
          </View>
        ))}
      </Section>

      {/* CTA fija (opcional): reservar complejo */}
      <View style={{ height: 12 }} />
    </ScrollView>
  );
}

// ===== Subcomponentes =====
function Section({ title, children }:{ title:string; children:React.ReactNode }) {
  return (
    <View style={{ paddingHorizontal:16, marginTop:14 }}>
      <Text style={{ fontSize:16, fontWeight:"800", marginBottom:8 }}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ left, right }:{ left:string; right:string }) {
  return (
    <View style={{ flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingVertical:6 }}>
      <Text style={{ color:"#374151", fontWeight:"600" }}>{left}</Text>
      <Text style={{ color:"#111827" }}>{right}</Text>
    </View>
  );
}

function Tag({ text }:{ text:string }) {
  return (
    <View style={{ paddingHorizontal:10, paddingVertical:6, backgroundColor:"#ecfeff", borderRadius:999, borderWidth:1, borderColor:"#99f6e4" }}>
      <Text style={{ color:"#0ea5a4", fontWeight:"700" }}>{text}</Text>
    </View>
  );
}

function LinkRow({ icon, label, onPress }:{
  icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection:"row", alignItems:"center", gap:10, paddingVertical:6 }}>
      <Ionicons name={icon} size={18} color="#0ea5a4" />
      <Text style={{ color:"#0ea5a4", fontWeight:"700" }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 44, paddingHorizontal: 12, paddingBottom: 10,
    backgroundColor: "#0d9488", flexDirection:"row", alignItems:"center", gap:10,
  },
  headerTitle: { color:"#fff", fontWeight:"800", fontSize:18, flex:1 },
  headerCta: { color:"#fff", fontWeight:"800" },

  btnPrimary: {
    height: 42, borderRadius: 10, paddingHorizontal: 14,
    backgroundColor:"#0ea5a4", alignItems:"center", justifyContent:"center",
  },
  btnOutline: {
    marginTop: 12, height: 44, borderRadius: 10,
    borderWidth: 1, borderColor: "#99f6e4",
    backgroundColor: "#ecfeff", alignItems: "center", justifyContent: "center",
    paddingHorizontal: 16,
  },

  badge: {
    paddingHorizontal:10, paddingVertical:6, borderRadius:10,
    backgroundColor:"#f3f4f6", marginRight:8, marginBottom:8,
    flexDirection:"row", alignItems:"center",
  },

  canchaCard: {
    flexDirection:"row", gap:12, alignItems:"center",
    borderWidth:1, borderColor:"#e5e7eb", borderRadius:12, padding:12, marginBottom:10,
  },
});
