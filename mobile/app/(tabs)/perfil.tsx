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

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "http://api-h1d7oi-a881cc-168-232-167-73.traefik.me/api/v1";

/* ========= Tipos ========= */
type ReservaUI = {
  id: string;
  status: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  cancha?: { id: string; name?: string | number };
  venue?: { id: string; name: string; address?: string };
  notas?: string | null;
};

/* ========= Helpers ========= */
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

/* ========= Componente principal ========= */
export default function PerfilScreen() {
  const { user, setUser, logout } = useAuth();

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

  const [form, setForm] = useState({
    nombre: user?.nombre ?? "",
    apellido: user?.apellido ?? "",
    email: user?.email ?? "",
    telefono: (user?.telefono as any) ?? "",
  });

  const onChange = (k: string, v: string | null) => setForm((prev) => ({ ...prev, [k]: v as any }));

  const [saving, setSaving] = useState(false);
  const confirmAndSave = async () => {
    try {
      setSaving(true);
      const payload = { ...form };
      const updated = await AuthAPI.updateMe(payload);
      const nextUser = updated && typeof updated === "object" ? { ...user!, ...updated } : { ...user!, ...payload };
      await setUser(nextUser);
      Alert.alert("Guardado", "Los cambios se guardaron correctamente");
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.response?.data?.message || "No se pudieron guardar los cambios";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

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

  if (loadingMe) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (errorMe) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
        <Text style={{ color: "#b91c1c", textAlign: "center" }}>{errorMe}</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.btn, styles.btnNeutral, { marginTop: 12 }]}>
          <Text style={styles.btnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 64 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Perfil</Text>
          <View style={{ width: 26 }} />
        </View>

        {/* Datos personales */}
        <Section title="Datos personales">
          <Field label="Nombre" value={form.nombre} onChangeText={(v) => onChange("nombre", v)} />
          <Field label="Apellido" value={form.apellido} onChangeText={(v) => onChange("apellido", v)} />
          <Field
            label="Correo"
            value={form.email ?? ""}
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={(v) => onChange("email", v)}
          />
          <Field
            label="Teléfono"
            value={(form.telefono ?? "") as string}
            keyboardType="phone-pad"
            onChangeText={(v) => onChange("telefono", v)}
          />
          <TouchableOpacity
            onPress={confirmAndSave}
            disabled={saving}
            style={[styles.btn, styles.btnPrimary, saving && { opacity: 0.6 }]}
          >
            {saving ? <ActivityIndicator /> : <Text style={styles.btnText}>Guardar cambios</Text>}
          </TouchableOpacity>
        </Section>

        {/* Mis reservas */}
        <Section title="Mis reservas">
          {resLoading ? (
            <ActivityIndicator />
          ) : resError ? (
            <Text style={{ color: "#b91c1c" }}>{resError}</Text>
          ) : reservas.length === 0 ? (
            <Text style={{ color: "#6b7280" }}>Aún no tienes reservas.</Text>
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

        {/* 🔶 Nueva sección: Reseñas */}
        <Section title="Reseñas">
          <TouchableOpacity onPress={() => router.push("/(perfil)/mis-resenas")} style={styles.navRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="star-outline" size={18} color="#0f172a" />
              <Text style={styles.navRowText}>Mis reseñas</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#0f172a" />
          </TouchableOpacity>
        </Section>

        {/* Sesión */}
        <Section title="Sesión">
          <TouchableOpacity
            onPress={async () => {
              try { /* await AuthAPI.logout(); */ } catch {}
              await logout();
              router.replace("/(auth)/login");
            }}
            style={[styles.btn, styles.btnDanger]}
          >
            <Text style={[styles.btnText, { color: "white" }]}>Cerrar sesión</Text>
          </TouchableOpacity>
        </Section>
      </ScrollView>
    </View>
  );
}

/* ========= Subcomponentes ========= */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ gap: 12, marginTop: 8 }}>{children}</View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontWeight: "600" }}>{label}</Text>
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

function ReservaRow({ r }: { r: ReservaUI }) {
  const title =
    (r.cancha?.name ? `${r.cancha.name}` : "") +
    (r.venue?.name ? (r.cancha?.name ? " - " : "") + r.venue.name : r.cancha?.name ? "" : "Complejo");

  return (
    <TouchableOpacity
      style={styles.itemRow}
      onPress={() =>
        router.push({
          pathname: "/(reservar)/reservadetalle",
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
        <Text style={styles.itemSub}>{r.date}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#0f172a" />
    </TouchableOpacity>
  );
}

/* ========= Estilos ========= */
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", flex: 1, textAlign: "center" },

  sectionTitle: { fontSize: 16, fontWeight: "700" },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#f9fafb",
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
  },
  itemTitle: { fontWeight: "700" },
  itemSub: { color: "#6b7280" },

  btn: {
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  btnPrimary: { backgroundColor: "#e0f2fe" },
  btnDanger: { backgroundColor: "#ef4444" },
  btnNeutral: { backgroundColor: "#f1f5f9" },
  btnText: { fontWeight: "700" },

  // Nueva sección navegación interna
  navRow: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  navRowText: { fontWeight: "800", color: "#0f172a" },
});
