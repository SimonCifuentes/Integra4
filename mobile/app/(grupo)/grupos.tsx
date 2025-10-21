// app/(tabs)/grupos.tsx
import { useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Modal, Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

// ---------- Tipos ----------
type Grupo = {
  id: number;
  nombre: string;
  deporte: string;       // Fútbol, Pádel, Tenis, etc.
  nivel: "Recreativo" | "Intermedio" | "Competitivo";
  zona: string;          // Centro, Ñielol, Labranza...
  publico: boolean;      // público/privado
  miembros: number;
  cupo?: number;         // si hay tope
  proximo?: string;      // texto próximo partido (ej: "Jue 21:00 · Ñielol")
  soyMiembro?: boolean;  // estado local
  descripcion?: string;
};

// ---------- Mock (reemplaza con API) ----------
const MOCK_GRUPOS: Grupo[] = [
  { id: 1, nombre: "Los Andes FC", deporte: "Fútbol", nivel: "Intermedio", zona: "Centro", publico: true, miembros: 12, cupo: 18, proximo: "Jue 21:00 · Estadio Becker", soyMiembro: true, descripcion: "Pick-up semanal, buena onda y compromiso." },
  { id: 2, nombre: "Pádel Temuco AM", deporte: "Pádel", nivel: "Recreativo", zona: "Ñielol", publico: true, miembros: 8, proximo: "Sáb 10:00 · Complejo Ñielol" },
  { id: 3, nombre: "Liga Labranza", deporte: "Fútbol", nivel: "Competitivo", zona: "Labranza", publico: false, miembros: 16, cupo: 20, proximo: "Dom 19:00 · Labranza Sport" },
  { id: 4, nombre: "Tenis Nocturno", deporte: "Tenis", nivel: "Intermedio", zona: "Centro", publico: true, miembros: 5, proximo: "Vie 22:00 · Plaza Tenis" },
];

// ---------- Pantalla principal ----------
export default function GruposScreen() {
  const [tab, setTab] = useState<"mis" | "descubrir">("mis");
  const [q, setQ] = useState("");
  const [fDeporte, setFDeporte] = useState<string | null>(null);
  const [fZona, setFZona] = useState<string | null>(null);
  const [fNivel, setFNivel] = useState<Grupo["nivel"] | null>(null);
  const [data, setData] = useState<Grupo[]>(MOCK_GRUPOS);

  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState<{nombre:string; deporte:string; zona:string; nivel:Grupo["nivel"]; publico:boolean; descripcion:string}>({
    nombre: "", deporte: "Fútbol", zona: "Centro", nivel: "Recreativo", publico: true, descripcion: "",
  });

  const deportes = ["Fútbol", "Pádel", "Tenis", "Básquetbol"];
  const zonas    = ["Centro", "Ñielol", "Labranza"];
  const niveles  = ["Recreativo", "Intermedio", "Competitivo"] as const;

  const listaBase = useMemo(
    () => data.filter(g => (tab === "mis" ? g.soyMiembro : true)),
    [tab, data]
  );

  const gruposFiltrados = useMemo(() => {
    return listaBase.filter(g =>
      (q ? (g.nombre + " " + g.deporte + " " + g.zona + " " + (g.descripcion ?? "")).toLowerCase().includes(q.toLowerCase()) : true) &&
      (fDeporte ? g.deporte === fDeporte : true) &&
      (fZona ? g.zona === fZona : true) &&
      (fNivel ? g.nivel === fNivel : true)
    ).sort((a, b) => Number(b.soyMiembro) - Number(a.soyMiembro)); // mis primero
  }, [listaBase, q, fDeporte, fZona, fNivel]);

  const toggleMember = (g: Grupo) => {
    // Enlaza a tu API: POST /grupos/:id/join o DELETE /grupos/:id/leave
    setData(prev => prev.map(x => x.id === g.id ? { ...x, soyMiembro: !x.soyMiembro, miembros: x.soyMiembro ? x.miembros - 1 : x.miembros + 1 } : x));
  };

  const crearGrupo = () => {
    if (form.nombre.trim().length < 3) return Alert.alert("Ups", "El nombre debe tener al menos 3 caracteres.");
    const nuevo: Grupo = {
      id: Math.max(...data.map(d=>d.id)) + 1,
      nombre: form.nombre.trim(),
      deporte: form.deporte,
      nivel: form.nivel,
      zona: form.zona,
      publico: form.publico,
      miembros: 1,
      soyMiembro: true,
      descripcion: form.descripcion.trim(),
      proximo: undefined,
    };
    // Enlaza a tu API: POST /grupos
    setData([nuevo, ...data]);
    setOpenCreate(false);
    setForm({ nombre:"", deporte:"Fútbol", zona:"Centro", nivel:"Recreativo", publico:true, descripcion:"" });
    Alert.alert("Listo", "Grupo creado.");
  };

  return (
    <View style={{ flex:1, backgroundColor:"#fff" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header + Tabs */}
        <View style={styles.header}>
          <Text style={styles.title}>Grupos</Text>
          <View style={{ flexDirection:"row", gap:8, marginTop:6 }}>
            <Segment label="Mis grupos" active={tab==="mis"} onPress={()=>setTab("mis")} />
            <Segment label="Descubrir"  active={tab==="descubrir"} onPress={()=>setTab("descubrir")} />
          </View>
        </View>

        {/* Buscador */}
        <View style={{ paddingHorizontal:16 }}>
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color="#64748b" />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={tab === "mis" ? "Buscar mis grupos..." : "Buscar grupos por nombre, deporte o zona..."}
              style={{ flex:1, fontSize:16 }}
            />
            {!!q && (
              <TouchableOpacity onPress={()=>setQ("")}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filtros rápidos */}
        <View style={styles.filtersRow}>
          <DropdownChip
            icon="football-outline"
            label={fDeporte ?? "Deporte"}
            onPress={()=>{
              const idx = deportes.indexOf(fDeporte ?? "");
              const next = idx < 0 ? deportes[0] : (idx + 1 >= deportes.length ? null : deportes[idx+1]);
              setFDeporte(next);
            }}
            active={!!fDeporte}
          />
          <DropdownChip
            icon="map-outline"
            label={fZona ?? "Zona"}
            onPress={()=>{
              const idx = zonas.indexOf(fZona ?? "");
              const next = idx < 0 ? zonas[0] : (idx + 1 >= zonas.length ? null : zonas[idx+1]);
              setFZona(next);
            }}
            active={!!fZona}
          />
          <DropdownChip
            icon="speedometer-outline"
            label={fNivel ?? "Nivel"}
            onPress={()=>{
              const idx = niveles.indexOf((fNivel as any) ?? "");
              const next = idx < 0 ? niveles[0] : (idx + 1 >= niveles.length ? null : niveles[idx+1]);
              setFNivel(next);
            }}
            active={!!fNivel}
          />
          {(fDeporte || fZona || fNivel) && (
            <TouchableOpacity onPress={()=>{ setFDeporte(null); setFZona(null); setFNivel(null); }}>
              <Text style={{ color:"#ef4444", fontWeight:"700" }}>Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Lista de grupos */}
        <View style={{ paddingHorizontal:16, gap:12 }}>
          {gruposFiltrados.map(g => (
            <View key={g.id} style={styles.card}>
              {/* Encabezado */}
              <View style={{ flexDirection:"row", alignItems:"center", gap:10 }}>
                <View style={styles.roundIcon}>
                  <Ionicons name="people-outline" size={16} color="#0ea5a4" />
                </View>
                <View style={{ flex:1 }}>
                  <Text style={styles.cardTitle}>{g.nombre}</Text>
                  <Text style={styles.cardSub}>
                    {g.deporte} · {g.nivel} · {g.zona} {typeof g.cupo === "number" ? `· ${g.miembros}/${g.cupo}` : `· ${g.miembros} miembros`}
                  </Text>
                </View>
                <Badge text={g.publico ? "Público" : "Privado"} tone={g.publico ? "success" : "muted"} />
              </View>

              {/* Próximo encuentro */}
              {!!g.proximo && (
                <View style={{ flexDirection:"row", alignItems:"center", gap:8, marginTop:8 }}>
                  <Ionicons name="calendar-outline" size={16} color="#0ea5a4" />
                  <Text style={{ color:"#374151", fontWeight:"600" }}>{g.proximo}</Text>
                </View>
              )}

              {/* Descripción */}
              {!!g.descripcion && <Text style={{ color:"#6b7280", marginTop:6 }}>{g.descripcion}</Text>}

              {/* Acciones */}
              <View style={styles.cardActions}>
                <OutlineBtn text="Ver grupo" onPress={() => router.push(`/grupos/${g.id}`)} />
                {g.soyMiembro ? (
                  <SecondaryBtn text="Salir" onPress={() => toggleMember(g)} />
                ) : (
                  <PrimaryBtn text={g.publico ? "Unirme" : "Solicitar acceso"} onPress={() => toggleMember(g)} />
                )}
              </View>
            </View>
          ))}
          {gruposFiltrados.length === 0 && (
            <View style={{ padding:24, alignItems:"center" }}>
              <Text style={{ color:"#6b7280" }}>No encontramos grupos con esos filtros.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB crear grupo */}
      <TouchableOpacity style={styles.fab} onPress={()=>setOpenCreate(true)} accessibilityLabel="Crear grupo">
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Modal crear grupo */}
      <Modal visible={openCreate} transparent animationType="slide" onRequestClose={()=>setOpenCreate(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={{ fontSize:18, fontWeight:"800", marginBottom:8 }}>Crear grupo</Text>

            <Field label="Nombre del grupo" value={form.nombre} onChangeText={(v)=>setForm({...form, nombre:v})} placeholder="Ej: Los Titanes AM" />
            <RowPicker
              label="Deporte"
              value={form.deporte}
              options={deportes}
              onNext={()=>setForm({...form, deporte: nextItem(deportes, form.deporte)})}
            />
            <RowPicker
              label="Zona"
              value={form.zona}
              options={zonas}
              onNext={()=>setForm({...form, zona: nextItem(zonas, form.zona)})}
            />
            <RowPicker
              label="Nivel"
              value={form.nivel}
              options={niveles as any}
              onNext={()=>setForm({...form, nivel: nextItem(niveles as any, form.nivel)})}
            />

            <ToggleRow
              label="Grupo público"
              value={form.publico}
              onToggle={()=>setForm({...form, publico: !form.publico})}
            />

            <Field
              label="Descripción (opcional)"
              value={form.descripcion}
              onChangeText={(v)=>setForm({...form, descripcion:v})}
              placeholder="Describe el objetivo del grupo, reglas, frecuencia…"
              multiline
            />

            <View style={{ flexDirection:"row", gap:10, marginTop:10 }}>
              <OutlineBtn text="Cancelar" onPress={()=>setOpenCreate(false)} />
              <PrimaryBtn text="Crear" onPress={crearGrupo} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ---------- Helpers UI ----------
function Segment({ label, active, onPress }:{ label:string; active:boolean; onPress:()=>void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.segment, active && styles.segmentActive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function DropdownChip({ icon, label, onPress, active }:{
  icon: keyof typeof Ionicons.glyphMap; label:string; onPress:()=>void; active?:boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Ionicons name={icon} size={14} color={active ? "#0ea5a4" : "#64748b"} />
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      <Ionicons name="chevron-down" size={14} color={active ? "#0ea5a4" : "#94a3b8"} />
    </TouchableOpacity>
  );
}

function Badge({ text, tone }:{ text:string; tone?:"success"|"muted" }) {
  const bg = tone === "success" ? "#dcfce7" : "#e5e7eb";
  const fg = tone === "success" ? "#166534" : "#374151";
  return (
    <View style={{ backgroundColor:bg, paddingHorizontal:10, paddingVertical:6, borderRadius:999 }}>
      <Text style={{ color:fg, fontWeight:"700" }}>{text}</Text>
    </View>
  );
}

function PrimaryBtn({ text, onPress }:{ text:string; onPress:()=>void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.btnPrimary}>
      <Text style={{ color: "white", fontWeight: "700" }}>{text}</Text>
    </TouchableOpacity>
  );
}
function SecondaryBtn({ text, onPress }:{ text:string; onPress:()=>void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.btnSecondary}>
      <Text style={{ color: "#0ea5a4", fontWeight: "700" }}>{text}</Text>
    </TouchableOpacity>
  );
}
function OutlineBtn({ text, onPress }:{ text:string; onPress:()=>void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.btnOutline}>
      <Text style={{ color: "#0ea5a4", fontWeight: "700" }}>{text}</Text>
    </TouchableOpacity>
  );
}

function Field({ label, value, onChangeText, placeholder, multiline }:{
  label:string; value:string; onChangeText:(t:string)=>void; placeholder?:string; multiline?:boolean;
}) {
  return (
    <View style={{ marginTop:8 }}>
      <Text style={{ fontWeight:"700", marginBottom:6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={[styles.input, multiline && { height: 90, textAlignVertical: "top" }]}
        multiline={multiline}
      />
    </View>
  );
}

function RowPicker<T extends string>({ label, value, options, onNext }:{
  label:string; value:T; options:readonly T[] | T[]; onNext:()=>void;
}) {
  return (
    <View style={styles.rowPicker}>
      <Text style={{ fontWeight:"700" }}>{label}</Text>
      <View style={{ flexDirection:"row", alignItems:"center", gap:8 }}>
        <Text style={{ color:"#0ea5a4", fontWeight:"800" }}>{value}</Text>
        <TouchableOpacity onPress={onNext}>
          <Ionicons name="chevron-forward" size={18} color="#0ea5a4" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ToggleRow({ label, value, onToggle }:{ label:string; value:boolean; onToggle:()=>void }) {
  return (
    <View style={styles.rowPicker}>
      <Text style={{ fontWeight:"700" }}>{label}</Text>
      <TouchableOpacity onPress={onToggle} style={[styles.toggle, value ? styles.toggleOn : styles.toggleOff]}>
        <View style={[styles.dot, value ? { left: 22 } : { left: 2 }]} />
      </TouchableOpacity>
    </View>
  );
}

function nextItem<T>(arr: readonly T[] | T[], curr: T): T {
  const i = arr.indexOf(curr);
  return i < 0 ? arr[0] : (i + 1 >= arr.length ? arr[0] : arr[i+1]);
}

// ---------- Estilos ----------
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
    backgroundColor: "#0d9488",
  },
  title: { color: "white", fontSize: 20, fontWeight: "800" },

  segment: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  segmentActive: { backgroundColor: "#ffffff" },
  segmentText: { color: "white", fontWeight: "700" },
  segmentTextActive: { color: "#0d9488" },

  searchWrap: {
    marginTop: 12, marginBottom: 8,
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb",
    paddingHorizontal: 12, borderRadius: 12, height: 46,
  },

  filtersRow: {
    paddingHorizontal: 16, marginTop: 4, marginBottom: 10,
    flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap",
  },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb",
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999,
  },
  chipActive: { borderColor: "#99f6e4", backgroundColor: "#ecfeff" },
  chipText: { color: "#334155", fontWeight: "600" },
  chipTextActive: { color: "#0ea5a4" },

  card: {
    borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff",
    borderRadius: 12, padding: 14,
  },
  roundIcon: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: "#ecfeff",
    alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontWeight: "800", fontSize: 16 },
  cardSub: { color: "#6b7280", marginTop: 2 },

  cardActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  btnPrimary: {
    flex: 1, height: 44, borderRadius: 10,
    backgroundColor: "#0ea5a4", alignItems: "center", justifyContent: "center",
  },
  btnSecondary: {
    flex: 1, height: 44, borderRadius: 10,
    backgroundColor: "#ecfeff", borderWidth: 1, borderColor: "#99f6e4",
    alignItems: "center", justifyContent: "center",
  },
  btnOutline: {
    flex: 1, height: 44, borderRadius: 10,
    borderWidth: 1, borderColor: "#99f6e4",
    backgroundColor: "#ecfeff", alignItems: "center", justifyContent: "center",
  },

  fab: {
    position: "absolute", right: 18, bottom: 18,
    width: 54, height: 54, borderRadius: 27, backgroundColor: "#0ea5a4",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },

  modalBg: { flex:1, backgroundColor:"rgba(0,0,0,0.3)", justifyContent:"flex-end" },
  modalCard: {
    backgroundColor:"#fff", borderTopLeftRadius:16, borderTopRightRadius:16,
    padding:16, paddingBottom: 24,
  },

  input: {
    backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb",
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },

  rowPicker: {
    marginTop: 8, paddingVertical: 8,
    flexDirection:"row", alignItems:"center", justifyContent:"space-between",
    borderBottomWidth: 1, borderColor: "#f1f5f9",
  },

  toggle: {
    width: 42, height: 26, borderRadius: 13, position: "relative",
    justifyContent:"center",
  },
  toggleOn:  { backgroundColor: "#99f6e4" },
  toggleOff: { backgroundColor: "#e5e7eb" },
  dot: { position:"absolute", width: 20, height: 20, borderRadius: 10, backgroundColor:"#fff" },
});
