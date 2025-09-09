import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { useAuth } from '@/src/stores/auth';
import { AuthAPI } from '@/src/features/features/auth/api';
import { Link } from 'expo-router';

// ------- Tipos (mock) -------
type Reserva = { id:number; cancha:string; fecha:string; estado:"confirmada"|"pendiente"|"cancelada" };
type Grupo   = { id:number; nombre:string; rol:"miembro"|"admin" };

// ------- Datos mock (quítalos cuando conectes tu API) -------
const MOCK_RESERVAS: Reserva[] = [
  { id:1, cancha:"Cancha 1 - Temuco",   fecha:"Dom 18:00, 22 Sep", estado:"confirmada" },
  { id:2, cancha:"Cancha 2 - Labranza", fecha:"Mié 21:00, 25 Sep", estado:"pendiente"  },
];

const MOCK_GRUPOS: Grupo[] = [
  { id:1, nombre:"Equipo Los Andes", rol:"miembro" },
  { id:2, nombre:"Pádel Temuco",    rol:"admin"   },
];

export default function PerfilScreen() {
  const { user, setUser, logout } = useAuth();

  // Estado local editable
  const [form, setForm] = useState<Usuario>(() => ({
    id_usuario:  user?.id_usuario ?? 1,
    nombre:      user?.nombre ?? "Demo",
    apellido:    user?.apellido ?? "Local",
    email:       user?.email ?? "demo@demo.cl",
    telefono:    user?.telefono ?? "",
    avatar_url:  user?.avatar_url ?? null,
    rol:         user?.rol ?? "user",
  }));

  const onChange = (k: keyof Usuario, v: string | null) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    try {
      // Cuando conectes backend:
      // const updated = await AuthAPI.updateMe({ nombre: form.nombre, apellido: form.apellido, telefono: form.telefono, email: form.email });
      // await setUser(updated);

      // Por ahora, persistimos en el store (mock)
      await setUser(form);
      Alert.alert("Perfil", "Datos guardados correctamente");
    } catch (e) {
      Alert.alert("Error", "No se pudieron guardar los cambios");
    }
  };

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

      {/* Formulario de usuario */}
      <Section title="Datos personales">
        <Field label="Nombre"   value={form.nombre}   onChangeText={(v)=>onChange("nombre", v)} />
        <Field label="Apellido" value={form.apellido} onChangeText={(v)=>onChange("apellido", v)} />
        <Field label="Correo"   value={form.email ?? ""} keyboardType="email-address" autoCapitalize="none" onChangeText={(v)=>onChange("email", v)} />
        <Field label="Teléfono" value={(form.telefono ?? "") as string} keyboardType="phone-pad" onChangeText={(v)=>onChange("telefono", v)} />
        <PrimaryButton text="Guardar cambios" onPress={save} />
      </Section>

      {/* Reservas del usuario */}
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

      {/* Grupos del usuario */}
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
