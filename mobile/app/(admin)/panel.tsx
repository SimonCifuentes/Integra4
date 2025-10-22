// app/(admin)/panel.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  FlatList, RefreshControl, TextInput, Alert, Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native"; // 👈 estable
import * as SecureStore from "expo-secure-store";
import { useAuth } from "@/src/stores/auth";

/* ==== util & http helpers (idénticos a los que ya tienes) ==== */
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "http://api-h1d7oi-a881cc-168-232-167-73.traefik.me/api/v1";
const TEAL = "#0ea5a4";

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
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(txt || `HTTP ${res.status}`);
  return txt ? JSON.parse(txt) : ({} as T);
}
async function apiPost<T>(path: string, body?: any): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(txt || `HTTP ${res.status}`);
  return txt ? JSON.parse(txt) : ({} as T);
}

/* ==== tipos & helpers ==== */
type Complejo = { id: number | string; nombre: string; direccion?: string; comuna?: string; lat?: number; lng?: number; activo?: boolean; rating_promedio?: number; total_resenas?: number; };
type Cancha   = { id_cancha: number; id_complejo: number | string; nombre: string; deporte?: string; superficie?: string; capacidad?: number; iluminacion?: boolean; techada?: boolean; esta_activa?: boolean; };
type Reserva  = { id: string | number; estado?: string; fecha?: string; inicio?: string; fin?: string; complejo?: { id: number | string; nombre?: string }; cancha?: { id: number | string; nombre?: string }; titular?: { nombre?: string; email?: string } };

const isAdminLike = (role?: string) => {
  const r = (role || "").toLowerCase();
  return r === "superadmin" || r === "admin_general" || r === "admin";
};
const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : "");
function formatFechaFila(fecha?: string, inicio?: string) {
  if (!fecha) return "—";
  try {
    const d = new Date(`${fecha}T00:00:00`);
    const dow = new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(d);
    const dayMon = new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short" }).format(d);
    return `${capitalize(dow)} ${inicio ? `${inicio}, ` : ""}${dayMon}`;
  } catch { return [inicio, fecha].filter(Boolean).join(", "); }
}

/* ==== endpoints ==== */
async function fetchMisComplejos(duenioId: number | string): Promise<Complejo[]> {
  const raw = await apiGet<any>(`/complejos/duenio/${duenioId}`);
  const arr: any[] = Array.isArray(raw) ? raw : raw?.items ?? raw?.data ?? [];
  return arr.map(c => ({
    id: c.id_complejo, nombre: c.nombre, direccion: c.direccion, comuna: c.comuna,
    lat: c.latitud, lng: c.longitud, activo: c.activo, rating_promedio: c.rating_promedio, total_resenas: c.total_resenas,
  }));
}
async function fetchCanchasDeComplejo(id: number | string): Promise<Cancha[]> {
  const raw = await apiGet<any>(`/complejos/${id}/canchas`);
  const arr: any[] = Array.isArray(raw) ? raw : raw?.items ?? raw?.data ?? [];
  return arr.map(x => ({
    id_cancha: x.id_cancha ?? x.id ?? x.cancha_id,
    id_complejo: x.id_complejo ?? id,
    nombre: x.nombre ?? x.tipo ?? "Cancha",
    deporte: x.deporte, superficie: x.superficie, capacidad: x.capacidad,
    iluminacion: x.iluminacion ?? false, techada: x.techada ?? false, esta_activa: x.esta_activa ?? true,
  }));
}
function mapReservas(arr: any[]): Reserva[] {
  return arr.map((r: any) => {
    const fecha = r.fecha ?? r.fecha_reserva ?? (r.inicio ? new Date(r.inicio).toISOString().slice(0,10) : undefined);
    const inicioHM = r.hora_inicio ?? (r.inicio ? new Date(r.inicio).toTimeString().slice(0,5) : undefined);
    const finHM    = r.hora_fin    ?? (r.fin    ? new Date(r.fin).toTimeString().slice(0,5)    : undefined);
    return {
      id: r.id ?? r.id_reserva ?? r.reserva_id,
      estado: String(r.estado ?? r.status ?? ""),
      fecha, inicio: inicioHM, fin: finHM,
      complejo: { id: r?.complejo?.id ?? r.complejo_id ?? r.id_complejo, nombre: r?.complejo?.nombre ?? r.complejo_nombre ?? "" },
      cancha:   { id: r?.cancha?.id ?? r.cancha_id ?? r.id_cancha, nombre: r?.cancha?.nombre ?? r.cancha_nombre ?? "" },
      titular:  { nombre: r?.usuario?.nombre ?? r.user_name, email: r?.usuario?.email ?? r.user_email },
    };
  });
}
async function fetchReservasPorCanchaAdmin(idCancha: number | string): Promise<Reserva[]> {
  const candidates = [
    `/reservas/reservas/admin/cancha/${idCancha}`,
    `/reservas/admin/cancha/${idCancha}`,
  ];
  for (const path of candidates) {
    try {
      const raw = await apiGet<any>(path);
      const arr: any[] = Array.isArray(raw) ? raw : raw?.items ?? raw?.data ?? [];
      if (Array.isArray(arr)) return mapReservas(arr);
    } catch (e: any) {
      const m = (e?.message || "").toLowerCase();
      if (!m.includes("404") && !m.includes("not found")) throw e;
    }
  }
  return [];
}
const postAccionReserva = (id: string | number, a: "confirmar" | "cancelar") =>
  apiPost(`/reservas/${id}/${a}`);

/* ==== componente ==== */
export default function PanelAdminScreen() {
  const { user } = useAuth();               // 👈 siempre se llama
  const rol = (user as any)?.rol ?? (user as any)?.role;
  const duenioId = (user as any)?.id_dueno ?? (user as any)?.id_usuario;

  // hooks SIEMPRE al tope (sin returns antes)
  const [activeTab, setActiveTab] = useState<"reservas" | "complejos" | "canchas">("reservas");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [complejos, setComplejos] = useState<Complejo[]>([]);
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true); setErr(null);
      if (!isAdminLike(rol) || duenioId == null) { setComplejos([]); setCanchas([]); setReservas([]); return; }

      const mis = await fetchMisComplejos(duenioId);
      setComplejos(mis);

      const canchasChunks = await Promise.all(mis.map(c => fetchCanchasDeComplejo(c.id)));
      const allCanchas = canchasChunks.flat();
      setCanchas(allCanchas);

      const reservasChunks = await Promise.all(allCanchas.map(ch => fetchReservasPorCanchaAdmin(ch.id_cancha)));
      const raw = reservasChunks.flat();

      const seen = new Set<string>();
      const uniq = raw.filter(r => { const k = String(r.id); if (seen.has(k)) return false; seen.add(k); return true; });
      uniq.sort((a,b) => (`${b.fecha ?? ""} ${b.inicio ?? ""}`).localeCompare(`${a.fecha ?? ""} ${a.inicio ?? ""}`));
      setReservas(uniq);
    } catch (e: any) {
      setErr(e?.message || "No se pudieron cargar los datos.");
      setComplejos([]); setCanchas([]); setReservas([]);
    } finally { setLoading(false); }
  }, [rol, duenioId]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  // 👇 en vez de "return" condicional que podría romper el orden de hooks,
  // mostramos un bloque de acceso restringido dentro del mismo return.
  const notAllowed = !isAdminLike(rol) || duenioId == null;

  const qn = q.trim().toLowerCase();
  const complejosFiltrados = useMemo(
    () => (qn ? complejos.filter(c => (`${c.nombre} ${c.direccion ?? ""} ${c.comuna ?? ""}`).toLowerCase().includes(qn)) : complejos),
    [complejos, qn]
  );
  const canchasFiltradas = useMemo(
    () => (qn ? canchas.filter(x => (`${x.nombre} ${x.deporte ?? ""} ${x.superficie ?? ""}`).toLowerCase().includes(qn)) : canchas),
    [canchas, qn]
  );
  const reservasFiltradas = useMemo(
    () => (qn ? reservas.filter(r => (`${r.complejo?.nombre ?? ""} ${r.cancha?.nombre ?? ""} ${r.titular?.nombre ?? ""} ${r.titular?.email ?? ""}`).toLowerCase().includes(qn)) : reservas),
    [reservas, qn]
  );

  const header = (
    <>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="chevron-back" size={22} /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Panel Admin</Text>
          <Text style={styles.subtle}>Tus complejos, canchas y reservas</Text>
        </View>
      </View>
      <View style={styles.segmentRow}>
        <Segment label="Reservas"   active={activeTab === "reservas"}  onPress={() => setActiveTab("reservas")} />
        <Segment label="Complejos"  active={activeTab === "complejos"} onPress={() => setActiveTab("complejos")} />
        <Segment label="Canchas"    active={activeTab === "canchas"}   onPress={() => setActiveTab("canchas")} />
      </View>
      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#64748b" />
          <TextInput value={q} onChangeText={setQ} placeholder={`Buscar en ${activeTab}…`} style={{ flex: 1, fontSize: 16 }} />
          {!!q && <TouchableOpacity onPress={() => setQ("")}><Ionicons name="close-circle" size={18} color="#94a3b8" /></TouchableOpacity>}
        </View>
      </View>
      {loading && <View style={{ paddingVertical: 12, alignItems: "center" }}><ActivityIndicator /><Text style={styles.muted}>Cargando datos…</Text></View>}
      {err && !loading && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ color: "#b91c1c" }}>{err}</Text>
          <TouchableOpacity onPress={loadAll} style={[styles.btn, styles.btnNeutral, { marginTop: 8 }]}><Text style={styles.btnText}>Reintentar</Text></TouchableOpacity>
        </View>
      )}
      <Text style={[styles.sectionTitle, { marginTop: 6, paddingHorizontal: 16 }]}>
        {activeTab === "reservas" ? "Reservas" : activeTab === "complejos" ? "Tus complejos" : "Tus canchas"}
      </Text>
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {notAllowed ? (
        <FlatList
          data={[]}
          keyExtractor={() => "empty"}
          ListHeaderComponent={
            <>
              <View style={styles.headerTop}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="chevron-back" size={22} /></TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={styles.headerTitle}>Panel Admin</Text>
                  <Text style={styles.subtle}>Acceso restringido</Text>
                </View>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="lock-closed-outline" size={28} color="#ef4444" />
              <Text style={{ marginTop: 8, fontWeight: "700" }}>Solo para administradores.</Text>
              <TouchableOpacity onPress={() => router.replace("/(tabs)/perfil")} style={[styles.btn, styles.btnNeutral, { marginTop: 12 }]}>
                <Text style={styles.btnText}>Ir a Perfil</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : activeTab === "reservas" ? (
        <FlatList
          data={reservasFiltradas}
          keyExtractor={(it) => String(it.id)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAll} />}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16, gap: 12 }}
          renderItem={({ item }) => <ReservaCard r={item} onChanged={loadAll} />}
          ListEmptyComponent={!loading ? <Empty text="No hay reservas en tus complejos." /> : null}
        />
      ) : activeTab === "complejos" ? (
        <FlatList
          data={complejosFiltrados}
          keyExtractor={(it) => String(it.id)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAll} />}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16, gap: 12 }}
          renderItem={({ item }) => (
            <ComplejoCard
              c={item}
              onOpen={() => router.push({ pathname: "/canchas-por-complejo", params: { complejoId: String(item.id), nombre: item.nombre } })}
            />
          )}
          ListEmptyComponent={!loading ? <Empty text="No tienes complejos asignados." /> : null}
        />
      ) : (
        <FlatList
          data={canchasFiltradas}
          keyExtractor={(it) => String(it.id_cancha)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAll} />}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16, gap: 12 }}
          renderItem={({ item }) => <CanchaCard x={item} />}
          ListEmptyComponent={!loading ? <Empty text="No hay canchas en tus complejos." /> : null}
        />
      )}
    </View>
  );
}

/* ===== UI helpers (sin hooks condicionales) ===== */
function Segment({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.segment, active && styles.segmentActive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}
function Empty({ text }: { text: string }) {
  return (<View style={{ padding: 24, alignItems: "center" }}><Text style={{ color: "#6b7280" }}>{text}</Text></View>);
}
function ReservaCard({ r, onChanged }: { r: Reserva; onChanged?: () => void }) {
  const [working, setWorking] = React.useState<"confirmar" | "cancelar" | null>(null);
  const title = (r.cancha?.nombre ? `${r.cancha?.nombre}` : "Reserva") + (r.complejo?.nombre ? ` · ${r.complejo?.nombre}` : "");
  const subtitle = formatFechaFila(r.fecha, r.inicio);
  const estado = (r.estado || "").toLowerCase();
  const badge = estado.includes("confirm") ? { bg: "#dcfce7", fg: "#166534", label: "Confirmada" }
    : estado.includes("pend") ? { bg: "#fef9c3", fg: "#854d0e", label: "Pendiente" }
    : estado.includes("cancel") ? { bg: "#fee2e2", fg: "#991b1b", label: "Cancelada" }
    : { bg: "#e5e7eb", fg: "#374151", label: r.estado || "—" };

  const doAccion = async (accion: "confirmar" | "cancelar") => {
    try {
      setWorking(accion);
      await postAccionReserva(r.id, accion);
      onChanged?.();
    } catch (e: any) {
      const msg = e?.message ?? "Intenta nuevamente.";
      Platform.OS === "web" ? window.alert(`No se pudo ${accion} la reserva.\n${msg}`) : Alert.alert("Error", `No se pudo ${accion} la reserva.`);
    } finally { setWorking(null); }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}><Ionicons name="calendar-outline" size={20} color={TEAL} /><Text style={styles.cardTitle}>{title}</Text></View>
      <View style={styles.cardBody}>
        <Text style={styles.text}>🕒 {subtitle}{r.fin ? ` - ${r.fin}` : ""}</Text>
        {r.titular?.nombre || r.titular?.email ? (<Text style={styles.text}>👤 {r.titular?.nombre ?? ""} {r.titular?.email ? `· ${r.titular.email}` : ""}</Text>) : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <View style={{ backgroundColor: badge.bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
          <Text style={{ color: badge.fg, fontWeight: "700" }}>{badge.label}</Text>
        </View>
        {estado.includes("pend") && (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity onPress={() => doAccion("cancelar")} disabled={!!working} style={[styles.btn, styles.btnNeutral, { paddingHorizontal: 12 }]}>
              {working === "cancelar" ? <ActivityIndicator /> : <Text style={styles.btnText}>Cancelar</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => doAccion("confirmar")} disabled={!!working} style={[styles.btnPrimary, { paddingHorizontal: 12 }]}>
              {working === "confirmar" ? <ActivityIndicator color="#fff" /> : (<><Ionicons name="checkmark-circle-outline" size={16} color="#fff" /><Text style={styles.btnPrimaryTxt}>Confirmar</Text></>)}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
function ComplejoCard({ c, onOpen }: { c: Complejo; onOpen: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}><Ionicons name="business-outline" size={20} color={TEAL} /><Text style={styles.cardTitle}>{c.nombre}</Text></View>
      <View style={styles.cardBody}>
        <Text style={styles.text}>📍 {[c.direccion, c.comuna].filter(Boolean).join(", ") || "—"}</Text>
        <Text style={styles.text}>⭐ {typeof c.rating_promedio === "number" ? c.rating_promedio.toFixed(1) : "—"} ({c.total_resenas ?? 0})</Text>
        <Text style={styles.text}>🔘 {c.activo ? "Activo" : "Inactivo"}</Text>
      </View>
      <TouchableOpacity style={styles.btnPrimary} onPress={onOpen}><Ionicons name="grid-outline" size={16} color="#fff" /><Text style={styles.btnPrimaryTxt}>Ver canchas</Text></TouchableOpacity>
    </View>
  );
}
function CanchaCard({ x }: { x: Cancha }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}><Ionicons name="football-outline" size={20} color={TEAL} /><Text style={styles.cardTitle}>{x.nombre}</Text></View>
      <View style={styles.cardBody}>
        <Text style={styles.text}>🏅 {x.deporte ?? "—"}</Text>
        <Text style={styles.text}>🧱 {x.superficie ?? "—"}</Text>
        <Text style={styles.text}>👥 {typeof x.capacidad === "number" ? x.capacidad : "—"}</Text>
        <Text style={styles.text}>💡 {x.iluminacion ? "Con iluminación" : "Sin iluminación"}</Text>
        <Text style={styles.text}>🏠 {x.techada ? "Techada" : "No techada"}</Text>
        <Text style={styles.text}>🔘 {x.esta_activa ? "Activa" : "Inactiva"}</Text>
      </View>
    </View>
  );
}

/* ==== estilos ==== */
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  muted: { color: "#6b7280", textAlign: "center", marginTop: 8 },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: 10, paddingHorizontal: 16, paddingTop: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#efefef", marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  subtle: { color: "#6b7280" },
  segmentRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  segment: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "#f1f5f9" },
  segmentActive: { backgroundColor: "#ecfeff", borderWidth: 1, borderColor: "#99f6e4" },
  segmentText: { color: "#334155", fontWeight: "700" },
  segmentTextActive: { color: TEAL },
  searchWrap: { marginTop: 8, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb", paddingHorizontal: 12, borderRadius: 12, height: 46 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 8 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: "#e5e7eb", elevation: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  cardBody: { marginBottom: 10 },
  text: { color: "#374151", marginBottom: 4 },
  btn: { height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  btnNeutral: { backgroundColor: "#f1f5f9" },
  btnText: { fontWeight: "700" },
  btnPrimary: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: TEAL, paddingVertical: 10, borderRadius: 10, gap: 6 },
  btnPrimaryTxt: { color: "#fff", fontWeight: "700" },
});
