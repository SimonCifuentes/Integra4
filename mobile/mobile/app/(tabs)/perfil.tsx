// app/perfil.tsx
import { useEffect, useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth, type Usuario } from "@/src/stores/auth";

// ------- Tipos (mock solo para reservas/grupos visual) -------
type Reserva = { id:number; cancha:string; fecha:string; estado:"confirmada"|"pendiente"|"cancelada" };
type Grupo   = { id:number; nombre:string; rol:"miembro"|"admin" };

// ------- Datos mock (quítalos cuando conectes tus endpoints reales) -------
const MOCK_RESERVAS: Reserva[] = [
  { id:1, cancha:"Cancha 1 - Temuco",   fecha:"Dom 18:00, 22 Sep", estado:"confirmada" },
  { id:2, cancha:"Cancha 2 - Labranza", fecha:"Mié 21:00, 25 Sep", estado:"pendiente"  },
];

const MOCK_GRUPOS: Grupo[] = [
  { id:1, nombre:"Equipo Los Andes", rol:"miembro" },
  { id:2, nombre:"Pádel Temuco",    rol:"admin"   },
];

// ------- Helpers de Rol -------
function getRoleLabel(rol?: string) {
  const r = (rol || "").toLowerCase();
  if (r === "superadmin") return "Superadmin";
  if (r === "owner" || r === "dueño" || r === "dueno") return "Dueño de complejos";
  if (r === "admin" || r === "admin_general") return "Admin general";
  if (r === "admin_grupos" || r === "admin:grupos" || r === "groups_admin") return "Admin de grupos";
  return "Usuario";
}

function getRoleColors(rol?: string) {
  const r = (rol || "").toLowerCase();
  if (r === "superadmin") return { bg: "#ffe4e6", fg: "#9f1239" }; // rosa/rojo para superadmin
  if (r.startsWith("admin") || r === "admin") return { bg: "#fee2e2", fg: "#991b1b" }; // rojo suave
  if (r === "owner" || r === "dueño" || r === "dueno") return { bg: "#dbeafe", fg: "#1e40af" }; // azul
  return { bg: "#dcfce7", fg: "#166534" }; // verde (usuario)
}

function RoleBadge({ rol }: { rol?: string }) {
  const label = getRoleLabel(rol);
  const { bg, fg } = getRoleColors(rol);
  return (
    <View style={{ backgroundColor:bg, paddingHorizontal:10, paddingVertical:6, borderRadius:999, alignSelf:"flex-start" }}>
      <Text style={{ color:fg, fontWeight:"800" }}>{label}</Text>
    </View>
  );
}

export default function PerfilScreen() {
  const { user, setUser, logout, loadSession } = useAuth();

  // Refresca desde la API al montar (hará /auth/me si tu store lo implementa)
  useEffect(() => {
    if (typeof loadSession === "function") {
      loadSession().catch(() => {});
    }
  }, [loadSession]);

  // Estado local editable (SIN rol aquí)
  type FormUsuario = Omit<Usuario, "rol">;
  const [form, setForm] = useState<FormUsuario>(() => ({
    id_usuario:  user?.id_usuario ?? 0,
    nombre:      user?.nombre ?? "",
    apellido:    user?.apellido ?? "",
    email:       user?.email ?? "",
    telefono:    (user?.telefono as any) ?? "",
    avatar_url:  user?.avatar_url ?? null,
  }));

  // Si el usuario cambia en el store (por ejemplo tras loadSession), sincroniza el form (sin tocar rol)
  useEffect(() => {
    if (user) {
      setForm({
        id_usuario: user.id_usuario,
        nombre:     user.nombre ?? "",
        apellido:   user.apellido ?? "",
        email:      user.email ?? "",
        telefono:   (user.telefono as any) ?? "",
        avatar_url: user.avatar_url ?? null,
      });
    }
  }, [user]);

  const onChange = (k: keyof FormUsuario, v: string | null) =>
    setForm(prev => ({ ...prev, [k]: v as any }));

  const save = async () => {
    try {
      // Cuando conectes backend:
      // const updated = await AuthAPI.updateMe({ nombre: form.nombre, apellido: form.apellido, telefono: form.telefono, email: form.email });
      // await setUser({ ...user!, ...updated }); // conserva rol del backend

      // Temporal: conserva el rol actual del store y solo actualiza campos editables
      await setUser({ ...user!, ...form }); // 👈 no pisamos user.rol
      Alert.alert("Perfil", "Datos guardados correctamente");
    } catch {
      Alert.alert("Error", "No se pudieron guardar los cambios");
    }
  };

  // Lee rol robusto desde el store: rol (es) o role (en)
  const rawRole = (user as any)?.rol ?? (user as any)?.role;
  const roleLabel = useMemo(() => getRoleLabel(rawRole), [rawRole]);

  return (
    <ScrollView style={{ flex:1, backgroundColor:"#fff" }} contentContainerStyle={{ paddingBottom: 28 }}>
      {/* Header integrado */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
          <Ionicons name="chevron-back" size={26} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil</Text>
        <View style={{ width:26 }} />
      </View>

      {/* Sección: Rol (solo lectura, desde API/Store) */}
      <Section title="Rol">
        <View style={{ flexDirection:"row", alignItems:"center", justifyContent:"space-between" }}>
          <View>
            <Text style={{ fontWeight:"700" }}>Rol actual</Text>
            <Text style={{ color:"#6b7280", marginTop:2 }}>{roleLabel}</Text>
          </View>
          <RoleBadge rol={rawRole} />
        </View>
        <Text style={{ color:"#6b7280" }}>
          Los permisos en la app dependen de tu rol. Si necesitas cambiarlo, contáctate con un administrador.
        </Text>
      </Section>

      {/* Formulario de usuario (sin campo rol) */}
      <Section title="Datos personales">
        <Field label="Nombre"   value={form.nombre}   onChangeText={(v)=>onChange("nombre", v)} />
        <Field label="Apellido" value={form.apellido} onChangeText={(v)=>onChange("apellido", v)} />
        <Field label="Correo"   value={form.email ?? ""} keyboardType="email-address" autoCapitalize="none" onChangeText={(v)=>onChange("email", v)} />
        <Field label="Teléfono" value={(form.telefono ?? "") as string} keyboardType="phone-pad" onChangeText={(v)=>onChange("telefono", v)} />
        <PrimaryButton text="Guardar cambios" onPress={save} />
      </Section>

      {/* Reservas del usuario (mock visual por ahora) */}
      <Section title="Mis reservas">
        {MOCK_RESERVAS.map(r => (
          <View key={r.id} style={styles.itemRow}>
            <View>
              <Text style={styles.itemTitle}>{r.cancha}</Text>
              <Text style={styles.itemSub}>{r.fecha}</Text>
            </View>
            <Badge text={r.estado} />
          </View>
        ))}
      </Section>

      {/* Grupos del usuario (mock visual) */}
      <Section title="Mis grupos">
        {MOCK_GRUPOS.map(g => (
          <View key={g.id} style={styles.itemRow}>
            <View>
              <Text style={styles.itemTitle}>{g.nombre}</Text>
              <Text style={styles.itemSub}>Rol: {g.rol}</Text>
            </View>
            <TouchableOpacity onPress={()=>{ /* router.push(`/grupos/${g.id}`) */ }}>
              <Ionicons name="chevron-forward" size={20} />
            </TouchableOpacity>
          </View>
        ))}
      </Section>

      {/* Cerrar sesión */}
      <Section title="Sesión">
        <PrimaryButton
          text="Cerrar sesión"
          variant="danger"
          onPress={async ()=>{ try{ /* await AuthAPI.logout(); */ } catch{} await logout(); router.replace("/(auth)/login"); }}
        />
      </Section>
    </ScrollView>
  );
}

// --------- UI helpers ----------
function Section({ title, children }:{ title:string; children:React.ReactNode }) {
  return (
    <View style={{ paddingHorizontal:16, marginTop:14 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ gap:12, marginTop:8 }}>{children}</View>
    </View>
  );
}

function Field({
  label, value, onChangeText, keyboardType, autoCapitalize
}:{
  label:string; value:string; onChangeText:(t:string)=>void;
  keyboardType?:"default"|"email-address"|"phone-pad"; autoCapitalize?:"none"|"sentences"|"words"|"characters";
}) {
  return (
    <View style={{ gap:6 }}>
      <Text style={{ fontWeight:"600" }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? "none"}
        style={styles.input}
      />
    </View>
  );
}

function PrimaryButton({ text, onPress, variant }:{ text:string; onPress:()=>void; variant?:"danger"|"primary" }) {
  const isDanger = variant === "danger";
  return (
    <TouchableOpacity onPress={onPress} style={[styles.btn, isDanger ? styles.btnDanger : styles.btnPrimary]}>
      <Text style={[styles.btnText, isDanger && { color:"white" }]}>{text}</Text>
    </TouchableOpacity>
  );
}

function Badge({ text }:{ text:Reserva["estado"] }) {
  const bg = text === "confirmada" ? "#dcfce7" : text === "pendiente" ? "#fef9c3" : "#fee2e2";
  const fg = text === "confirmada" ? "#166534" : text === "pendiente" ? "#854d0e" : "#991b1b";
  return (
    <View style={{ backgroundColor:bg, paddingHorizontal:10, paddingVertical:6, borderRadius:999 }}>
      <Text style={{ color:fg, fontWeight:"700", textTransform:"capitalize" }}>{text}</Text>
    </View>
  );
}

// --------- estilos ----------
const styles = StyleSheet.create({
  header:{ paddingHorizontal:16, paddingTop:16, paddingBottom:6, flexDirection:"row", alignItems:"center", gap:12 },
  headerTitle:{ fontSize:20, fontWeight:"800", flex:1, textAlign:"center" },

  sectionTitle:{ fontSize:16, fontWeight:"700" },
  input:{ height:44, borderWidth:1, borderColor:"#e5e7eb", borderRadius:12, paddingHorizontal:14, backgroundColor:"#f9fafb" },

  itemRow:{ flexDirection:"row", alignItems:"center", justifyContent:"space-between", borderWidth:1, borderColor:"#e5e7eb", backgroundColor:"#fff", borderRadius:12, padding:14 },
  itemTitle:{ fontWeight:"700" },
  itemSub:{ color:"#6b7280" },

  btn:{ height:46, borderRadius:12, alignItems:"center", justifyContent:"center", marginTop:6 },
  btnPrimary:{ backgroundColor:"#e0f2fe" },
  btnDanger:{ backgroundColor:"#ef4444" },
  btnText:{ fontWeight:"700" },
});
