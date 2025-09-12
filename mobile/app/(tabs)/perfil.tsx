<<<<<<< HEAD
// app/perfil.tsx
import { useEffect, useMemo, useState } from "react";
=======
﻿// app/perfil.tsx
import { useEffect, useMemo, useRef, useState } from "react";
>>>>>>> 241975d (fix perfil)
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Modal, Animated, Easing
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth, type Usuario } from "@/src/stores/auth";
import { useUpdateMe } from "@/src/features/features/auth/hooks"; // ← hook PUT/PATCH a /users/me

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
  const updateMe = useUpdateMe();

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

  // Sync form cuando cambie el user de store
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

  // ---------- Confirmación ----------
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Calcula cambios vs. user actual
  const cambios = useMemo(() => {
    if (!user) return [];
    const diffs: { label: string; from?: string | null; to?: string | null }[] = [];
    const push = (label:string, from:any, to:any) => {
      const a = (from ?? "")?.toString?.() ?? "";
      const b = (to ?? "")?.toString?.() ?? "";
      if (a !== b) diffs.push({ label, from: a, to: b });
    };
    push("Nombre",   user.nombre,   form.nombre);
    push("Apellido", user.apellido, form.apellido);
    push("Correo",   user.email,    form.email);
    push("Teléfono", user.telefono, form.telefono);
    // avatar_url lo puedes agregar si lo editas visualmente:
    // push("Avatar",   user.avatar_url, form.avatar_url);
    return diffs;
  }, [user, form]);

  const openConfirm = () => {
    if (!cambios.length) {
      Alert.alert("Perfil", "No hay cambios para guardar");
      return;
    }
    setConfirmOpen(true);
  };

  // ---------- Animación de éxito ----------
  const successAnim = useRef(new Animated.Value(0)).current; // 0 oculto, 1 visible
  const showSuccess = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    successAnim.setValue(0);
    Animated.sequence([
      Animated.timing(successAnim, { toValue: 1, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(1100),
      Animated.timing(successAnim, { toValue: 0, duration: 250, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start();
  };
  const toastStyle = {
    opacity: successAnim,
    transform: [{
      scale: successAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] })
    }, {
      translateY: successAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] })
    }]
  };

  // ---------- Guardado real ----------
  const confirmAndSave = async () => {
    try {
      setConfirmOpen(false);
      Haptics.selectionAsync();

      const payload = {
        nombre:     form.nombre,
        apellido:   form.apellido,
        telefono:   form.telefono ?? null,
        email:      form.email,
        avatar_url: form.avatar_url ?? null,
      };

      const updated = await updateMe.mutateAsync(payload);

      const nextUser = updated && typeof updated === "object"
        ? { ...user!, ...updated }   // conserva rol si API no lo trae
        : { ...user!, ...payload };

      await setUser(nextUser);
      showSuccess();
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        "No se pudieron guardar los cambios";
      Alert.alert("Error", msg);
    }
  };

  // Lee rol robusto desde el store: rol (es) o role (en)
  const rawRole = (user as any)?.rol ?? (user as any)?.role;
  const roleLabel = useMemo(() => getRoleLabel(rawRole), [rawRole]);

  return (
    <View style={{ flex:1, backgroundColor:"#fff" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 64 }}>
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

          <TouchableOpacity
            onPress={openConfirm}
            disabled={updateMe.isPending}
            style={[styles.btn, styles.btnPrimary, updateMe.isPending && { opacity: 0.6 }]}
          >
            {updateMe.isPending ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.btnText}>Guardar cambios</Text>
            )}
          </TouchableOpacity>
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
          <TouchableOpacity
            onPress={async ()=>{ try{ /* await AuthAPI.logout(); */ } catch{} await logout(); router.replace("/(auth)/login"); }}
            style={[styles.btn, styles.btnDanger]}
          >
            <Text style={[styles.btnText, { color:"white" }]}>Cerrar sesión</Text>
          </TouchableOpacity>
        </Section>
      </ScrollView>

      {/* TOAST de éxito */}
      <Animated.View pointerEvents="none" style={[styles.toast, toastStyle]}>
        <Ionicons name="checkmark-circle" size={22} color="#065f46" />
        <Text style={{ color:"#065f46", fontWeight:"800" }}>¡Guardado!</Text>
      </Animated.View>

      {/* MODAL de confirmación */}
      <Modal visible={confirmOpen} animationType="fade" transparent onRequestClose={() => setConfirmOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={{ fontSize:16, fontWeight:"800" }}>Confirmar cambios</Text>
            <Text style={{ color:"#6b7280", marginTop:4 }}>Revisa y confirma los datos que vas a actualizar:</Text>

            <View style={{ marginTop:12, gap:8 }}>
              {cambios.length ? cambios.map((c, i) => (
                <View key={i} style={styles.diffRow}>
                  <Text style={styles.diffLabel}>{c.label}</Text>
                  <View style={{ flexDirection:"row", alignItems:"center", gap:6 }}>
                    <Text style={styles.diffFrom}>{c.from || "—"}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#64748b" />
                    <Text style={styles.diffTo}>{c.to || "—"}</Text>
                  </View>
                </View>
              )) : (
                <Text style={{ color:"#6b7280" }}>No hay cambios</Text>
              )}
            </View>

            <View style={{ flexDirection:"row", gap:8, marginTop:14 }}>
              <TouchableOpacity onPress={() => setConfirmOpen(false)} style={[styles.btn, styles.btnNeutral, { flex:1 }]}>
                <Text style={[styles.btnText]}>Revisar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmAndSave}
                disabled={updateMe.isPending}
                style={[styles.btn, styles.btnPrimary, { flex:1 }, updateMe.isPending && { opacity: 0.6 }]}
              >
                {updateMe.isPending ? <ActivityIndicator /> : <Text style={styles.btnText}>Confirmar y guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  btnNeutral:{ backgroundColor:"#f1f5f9" },
  btnText:{ fontWeight:"700" },

  // Toast de éxito
  toast:{
    position:"absolute",
    left:16, right:16, bottom:16,
    paddingVertical:10, paddingHorizontal:12,
    borderRadius:12,
    backgroundColor:"#ecfdf5",
    borderWidth:1, borderColor:"#a7f3d0",
    flexDirection:"row", alignItems:"center", gap:8,
    shadowColor:"#000", shadowOpacity:0.08, shadowRadius:10, shadowOffset:{ width:0, height:4 },
    elevation:2,
  },

  // Modal de confirmación
  modalBackdrop:{ flex:1, backgroundColor:"rgba(0,0,0,0.32)", alignItems:"center", justifyContent:"center", padding:16 },
  modalCard:{
    width:"100%", maxWidth:420,
    backgroundColor:"#fff", borderRadius:16, padding:16,
    borderWidth:1, borderColor:"#e5e7eb"
  },
  diffRow:{ borderWidth:1, borderColor:"#e5e7eb", borderRadius:12, padding:10, backgroundColor:"#fafafa" },
  diffLabel:{ fontWeight:"700", marginBottom:4 },
  diffFrom:{ color:"#6b7280" },
  diffTo:{ fontWeight:"700" },
});
