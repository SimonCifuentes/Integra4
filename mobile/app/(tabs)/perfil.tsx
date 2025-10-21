// app/perfil.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Modal, Animated, Easing, Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { useAuth, type Usuario } from "@/src/stores/auth";
import { AuthAPI } from "@/src/features/features/auth/api";

/* ========= Config API ========= */
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "http://api-h1d7oi-a881cc-168-232-167-73.traefik.me/api/v1";

/* ========= Tipos ========= */
type ReservaUI = {
  id: string;
  status: string;
  date?: string;       // YYYY-MM-DD
  startTime?: string;  // HH:mm
  endTime?: string;    // HH:mm
  cancha?: { id: string; name?: string | number };
  venue?: { id: string; name: string; address?: string };
  notas?: string | null;
};

/* ========= Auth helpers ========= */
async function getToken() {
  try {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return window.localStorage.getItem("token") || window.localStorage.getItem("accessToken");
    }
    return (await SecureStore.getItemAsync("token")) || (await SecureStore.getItemAsync("accessToken"));
  } catch {
    return null;
  }
}

async function apiGet<T>(path: string): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(txt || `HTTP ${res.status}`);
  return txt ? JSON.parse(txt) : ({} as T);
}

/* ========= Reservas: fetch + normalización ========= */
async function fetchMisReservas(): Promise<ReservaUI[]> {
  const raw = await apiGet<any>("/reservas/mias");
  const list: any[] = Array.isArray(raw) ? raw : raw?.data ?? raw?.items ?? [];

  return list.map((r) => {
    const id = r.id ?? r.id_reserva ?? r.reserva_id;
    const estado = r.estado ?? r.status ?? "CONFIRMED";
    const fecha = r.fecha ?? r.fecha_reserva;
    const inicio = r.inicio ?? r.hora_inicio;
    const fin = r.fin ?? r.hora_fin;

    const canchaId = r?.cancha?.id ?? r.cancha_id ?? r.id_cancha ?? "";
    const canchaNombre = r?.cancha?.nombre ?? r.cancha_nombre ?? r.cancha ?? canchaId ?? "";

    const complejoId = r?.complejo?.id ?? r.complejo_id ?? r?.venue?.id ?? "";
    const complejoNombre = r?.complejo?.nombre ?? r.complejo_nombre ?? r?.venue?.name ?? "Complejo";
    const complejoDireccion = r?.complejo?.direccion ?? r?.venue?.address ?? undefined;

    return {
      id: String(id),
      status: String(estado),
      date: fecha,
      startTime: inicio,
      endTime: fin,
      cancha: { id: String(canchaId || ""), name: canchaNombre },
      venue: { id: String(complejoId || ""), name: complejoNombre, address: complejoDireccion },
      notas: r.notas ?? null,
    } as ReservaUI;
  });
}

/* ========= Helpers de Rol ========= */
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
  if (r === "superadmin") return { bg: "#ffe4e6", fg: "#9f1239" };
  if (r.startsWith("admin") || r === "admin") return { bg: "#fee2e2", fg: "#991b1b" };
  if (r === "owner" || r === "dueño" || r === "dueno") return { bg: "#dbeafe", fg: "#1e40af" };
  return { bg: "#dcfce7", fg: "#166534" };
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

/* ========= Componente ========= */
export default function PerfilScreen() {
  const { user, setUser, logout } = useAuth();

  /* --- Me --- */
  const [loadingMe, setLoadingMe] = useState(true);
  const [errorMe, setErrorMe] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoadingMe(true);
        setErrorMe(null);
        const me = await AuthAPI.me();
        await setUser(me);
      } catch (e: any) {
        setErrorMe(e?.response?.data?.detail ?? "No se pudo cargar tu perfil.");
      } finally {
        setLoadingMe(false);
      }
    })();
  }, [setUser]);

  /* --- Form usuario --- */
  type FormUsuario = Omit<Usuario, "rol">;
  const [form, setForm] = useState<FormUsuario>(() => ({
    id_usuario:  user?.id_usuario ?? 0,
    nombre:      user?.nombre ?? "",
    apellido:    user?.apellido ?? "",
    email:       user?.email ?? "",
    telefono:    (user?.telefono as any) ?? "",
    avatar_url:  user?.avatar_url ?? null,
  }));
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

  /* --- Confirmación guardar --- */
  const [confirmOpen, setConfirmOpen] = useState(false);
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
    return diffs;
  }, [user, form]);
  const openConfirm = () => {
    if (!cambios.length) { Alert.alert("Perfil", "No hay cambios para guardar"); return; }
    setConfirmOpen(true);
  };

  /* --- Guardar perfil --- */
  const successAnim = useRef(new Animated.Value(0)).current;
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
  const [saving, setSaving] = useState(false);
  const confirmAndSave = async () => {
    try {
      setConfirmOpen(false);
      Haptics.selectionAsync();
      setSaving(true);
      const payload = {
        nombre:     form.nombre,
        apellido:   form.apellido,
        telefono:   form.telefono ?? null,
        email:      form.email,
        avatar_url: form.avatar_url ?? null,
      };
      const updated = await AuthAPI.updateMe(payload);
      const nextUser = updated && typeof updated === "object" ? { ...user!, ...updated } : { ...user!, ...payload };
      await setUser(nextUser);
      showSuccess();
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.response?.data?.message || "No se pudieron guardar los cambios";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  /* --- Mis reservas (reales) --- */
  const [resLoading, setResLoading] = useState(true);
  const [resError, setResError] = useState<string | null>(null);
  const [reservas, setReservas] = useState<ReservaUI[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setResLoading(true);
        setResError(null);
        const items = await fetchMisReservas();
        setReservas(items);
      } catch (e: any) {
        setResError(e?.message || "No se pudieron cargar tus reservas.");
        setReservas([]);
      } finally {
        setResLoading(false);
      }
    })();
  }, []);

  const rawRole = (user as any)?.rol ?? (user as any)?.role;
  const roleLabel = useMemo(() => getRoleLabel(rawRole), [rawRole]);

  if (loadingMe) {
    return (
      <View style={{ flex:1, alignItems:"center", justifyContent:"center" }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (errorMe) {
    return (
      <View style={{ flex:1, alignItems:"center", justifyContent:"center", padding:16 }}>
        <Text style={{ color:"#b91c1c", textAlign:"center" }}>{errorMe}</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.btn, styles.btnNeutral, { marginTop:12, paddingHorizontal:16 }]}>
          <Text style={styles.btnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex:1, backgroundColor:"#fff" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 64 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
            <Ionicons name="chevron-back" size={26} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Perfil</Text>
          <View style={{ width:26 }} />
        </View>

        {/* Rol */}
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

        {/* Datos personales */}
        <Section title="Datos personales">
          <Field label="Nombre"   value={form.nombre}   onChangeText={(v)=>onChange("nombre", v)} />
          <Field label="Apellido" value={form.apellido} onChangeText={(v)=>onChange("apellido", v)} />
          <Field label="Correo"   value={form.email ?? ""} keyboardType="email-address" autoCapitalize="none" onChangeText={(v)=>onChange("email", v)} />
          <Field label="Teléfono" value={(form.telefono ?? "") as string} keyboardType="phone-pad" onChangeText={(v)=>onChange("telefono", v)} />
          <TouchableOpacity onPress={openConfirm} disabled={saving} style={[styles.btn, styles.btnPrimary, saving && { opacity: 0.6 }]}>
            {saving ? <ActivityIndicator /> : <Text style={styles.btnText}>Guardar cambios</Text>}
          </TouchableOpacity>
        </Section>

        {/* Mis reservas (reales) */}
        <Section title="Mis reservas">
          {resLoading ? (
            <ActivityIndicator />
          ) : resError ? (
            <Text style={{ color:"#b91c1c" }}>{resError}</Text>
          ) : reservas.length === 0 ? (
            <Text style={{ color:"#6b7280" }}>Aún no tienes reservas.</Text>
          ) : (
            <>
              {reservas.slice(0, 3).map((r) => (
                <ReservaRow key={r.id} r={r} />
              ))}
              {reservas.length > 3 && (
                <TouchableOpacity
                  style={[styles.btn, styles.btnNeutral]}
                  onPress={() => router.push("/(reservar)/mis-reservas")}
                >
                  <Text style={styles.btnText}>Ver todas</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </Section>

        {/* Sesión */}
        <Section title="Sesión">
          <TouchableOpacity
            onPress={async ()=>{ try{ /* await AuthAPI.logout(); */ } catch{} await logout(); router.replace("/(auth)/login"); }}
            style={[styles.btn, styles.btnDanger]}
          >
            <Text style={[styles.btnText, { color:"white" }]}>Cerrar sesión</Text>
          </TouchableOpacity>
        </Section>
      </ScrollView>

      {/* TOAST éxito */}
      <Animated.View pointerEvents="none" style={[styles.toast, toastStyle]}>
        <Ionicons name="checkmark-circle" size={22} color="#065f46" />
        <Text style={{ color:"#065f46", fontWeight:"800" }}>¡Guardado!</Text>
      </Animated.View>

      {/* Modal confirmación */}
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
                <Text style={styles.btnText}>Revisar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmAndSave} disabled={saving} style={[styles.btn, styles.btnPrimary, { flex:1 }, saving && { opacity: 0.6 }]}>
                {saving ? <ActivityIndicator /> : <Text style={styles.btnText}>Confirmar y guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ========= UI helpers ========= */
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

function ReservaBadge({ status }:{ status:string }) {
  const key = (status || "").toLowerCase();
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    confirmed: { bg: "#dcfce7", fg: "#166534", label: "Confirmada" },
    confirmada:{ bg: "#dcfce7", fg: "#166534", label: "Confirmada" },
    pending:   { bg: "#fef9c3", fg: "#854d0e", label: "Pendiente"  },
    pendiente: { bg: "#fef9c3", fg: "#854d0e", label: "Pendiente"  },
    cancelled: { bg: "#fee2e2", fg: "#991b1b", label: "Cancelada"  },
    cancelada: { bg: "#fee2e2", fg: "#991b1b", label: "Cancelada"  },
  };
  const sty = map[key] ?? { bg:"#e5e7eb", fg:"#374151", label: status || "—" };
  return (
    <View style={{ backgroundColor: sty.bg, paddingHorizontal:10, paddingVertical:6, borderRadius:999 }}>
      <Text style={{ color:sty.fg, fontWeight:"700" }}>{sty.label}</Text>
    </View>
  );
}

/* Item de reserva en perfil */
function ReservaRow({ r }: { r: ReservaUI }) {
  // Título estilo "Cancha 1 - Temuco" o "Complejo" si no hay cancha
  const title =
    (r.cancha?.name ? `${r.cancha.name}` : "") +
    (r.venue?.name ? (r.cancha?.name ? " - " : "") + r.venue.name : r.cancha?.name ? "" : "Complejo");

  // "Dom 18:00, 22 Sep"
  const subtitle = formatFechaFila(r.date, r.startTime);

  return (
    <TouchableOpacity
      style={styles.itemRow}
      onPress={() =>
        router.push({
          pathname: "/(tabs)/reservadetalle",
          params: {
            id: r.id,
            cancha: r.cancha?.name?.toString() ?? "",
            complejo: r.venue?.name ?? "",
            fecha: r.date ?? "",
            inicio: r.startTime ?? "",
            fin: r.endTime ?? "",
            estado: (r.status ?? "").toLowerCase(),
            notas: r.notas ?? "",
          },
        })
      }
    >
      <View>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemSub}>{subtitle}</Text>
      </View>
      <ReservaBadge status={r.status} />
    </TouchableOpacity>
  );
}

function formatFechaFila(fecha?: string, inicio?: string) {
  if (!fecha) return "—";
  try {
    const d = new Date(`${fecha}T00:00:00`);
    const dow = new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(d); // Dom
    const dayMon = new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short" }).format(d); // 22 sep
    return `${capitalize(dow)} ${inicio ? `${inicio}, ` : ""}${dayMon}`;
  } catch {
    return [inicio, fecha].filter(Boolean).join(", ");
  }
}
function capitalize(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

/* ========= estilos ========= */
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
