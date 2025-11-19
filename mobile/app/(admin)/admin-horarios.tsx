// app/(admin)/admin-horarios.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  RefreshControl,
  TextInput,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "http://api-h1d7oi-a881cc-168-232-167-73.traefik.me/api/v1";
const TEAL = "#0ea5a4";

/* ========= auth & helpers iguales al resto del proyecto ========= */

async function getToken() {
  try {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return (
        window.localStorage.getItem("token") ||
        window.localStorage.getItem("accessToken") ||
        window.localStorage.getItem("jwt") ||
        window.localStorage.getItem("access_token")
      );
    }
    return (
      (await SecureStore.getItemAsync("token")) ||
      (await SecureStore.getItemAsync("accessToken")) ||
      (await SecureStore.getItemAsync("jwt")) ||
      (await SecureStore.getItemAsync("access_token"))
    );
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

async function apiPost<T>(path: string, body: any): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(txt || `HTTP ${res.status}`);
  return txt ? JSON.parse(txt) : ({} as T);
}

async function apiPatch<T>(path: string, body: any): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(txt || `HTTP ${res.status}`);
  return txt ? JSON.parse(txt) : ({} as T);
}

/* ========= tipos ========= */

type Horario = {
  id_horario?: number;
  dia: string; // "lunes", "martes", ...
  hora_apertura: string | null; // "HH:MM" o null
  hora_cierre: string | null;   // "HH:MM" o null
};

type CanchaResumen = {
  id_cancha: number;
  nombre: string;
  deporte?: string;
};

/** Orden fijo de días para la UI */
const DIAS = [
  { key: "lunes", label: "Lunes" },
  { key: "martes", label: "Martes" },
  { key: "miercoles", label: "Miércoles" },
  { key: "jueves", label: "Jueves" },
  { key: "viernes", label: "Viernes" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" },
] as const;

/* ========= helpers de mapeo tiempos ========= */

function apiTimeFromHM(hm: string): string {
  // de "HH:MM" → "HH:MM:00"
  if (!hm) return hm;
  return hm.length === 5 ? `${hm}:00` : hm;
}

function hmFromApiTime(t: string | null | undefined): string | null {
  if (!t) return null;
  // admite "HH:MM", "HH:MM:SS", "HH:MM:SS.sssZ"
  const m = String(t).match(/^(\d{2}):(\d{2})/);
  if (!m) return null;
  return `${m[1]}:${m[2]}`;
}

/* ========= API horarios según tu backend ========= */

/**
 * Intentamos encontrar un GET de horarios por cancha.
 * Dejo varias rutas candidatas por si cambiaste el router:
 *   - /horarios?cancha_id=ID
 *   - /horarios?id_cancha=ID
 *   - /horarios/cancha/ID
 *   - /horarios/canchas/ID
 */
async function fetchHorariosPorCancha(
  idCancha: string | number
): Promise<Horario[]> {
  // Llama a: GET /api/v1/horarios/canchas/{id_cancha}
  const raw = await apiGet<any>(`/horarios/canchas/${idCancha}`);

  const arr: any[] = Array.isArray(raw)
    ? raw
    : raw?.items ?? raw?.data ?? [];

  return arr.map((h) => ({
    id_horario: h.id_horario ?? h.id,
    dia: String(h.dia ?? h.dia_semana ?? "").toLowerCase(), // "lunes", "martes", etc.
    hora_apertura: hmFromApiTime(h.hora_apertura),
    hora_cierre: hmFromApiTime(h.hora_cierre),
  }));
}


/**
 * POST /horarios → crea un horario.
 * PATCH /horarios/{id_horario} → actualiza uno existente.
 * Si para un día está "cerrado" (ambas horas null/""), intento mandar null.
 */
async function saveHorariosPorCancha(
  idCancha: string | number,
  idComplejo: string | number | undefined,
  items: Horario[]
): Promise<void> {
  for (const h of items) {
    const cerrado = !h.hora_apertura && !h.hora_cierre;

    // día cerrado
    if (cerrado) {
      if (h.id_horario) {
        // lo dejo explícitamente sin horas (si tu backend lo acepta)
        await apiPatch(`/horarios/${h.id_horario}`, {
          hora_apertura: null,
          hora_cierre: null,
        });
      }
      continue;
    }

    const hora_apertura = apiTimeFromHM(h.hora_apertura!);
    const hora_cierre = apiTimeFromHM(h.hora_cierre!);

    if (h.id_horario) {
      // actualizar
      await apiPatch(`/horarios/${h.id_horario}`, {
        dia: h.dia,
        hora_apertura,
        hora_cierre,
      });
    } else {
      // crear
      await apiPost(`/horarios`, {
        id_complejo: idComplejo ? Number(idComplejo) : undefined,
        id_cancha: Number(idCancha),
        dia: h.dia,
        hora_apertura,
        hora_cierre,
      });
    }
  }
}

/**
 * Info básica de la cancha, para mostrar nombre y deporte
 */
async function fetchCanchaResumen(
  idCancha: string | number
): Promise<CanchaResumen | null> {
  try {
    const raw = await apiGet<any>(`/canchas/${idCancha}`);
    return {
      id_cancha: raw.id_cancha ?? raw.id ?? Number(idCancha),
      nombre: raw.nombre ?? `Cancha ${idCancha}`,
      deporte: raw.deporte ?? raw.nombre_deporte,
    };
  } catch {
    return null;
  }
}

/* ========= Componente principal ========= */

export default function AdminHorariosScreen() {
  const params = useLocalSearchParams<{
    canchaId?: string;
    canchaNombre?: string;
    complejoId?: string;
  }>();

  const canchaId = params.canchaId;
  const canchaNombreParam = params.canchaNombre;
  const complejoId = params.complejoId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancha, setCancha] = useState<CanchaResumen | null>(null);
  const [horarios, setHorarios] = useState<Horario[]>([]);

  const titleCancha = canchaNombreParam || cancha?.nombre || "Cancha";

  const loadData = useCallback(async () => {
    if (!canchaId) return;
    try {
      setLoading(true);
      setError(null);

      const [hApi, canchaApi] = await Promise.all([
        fetchHorariosPorCancha(canchaId),
        fetchCanchaResumen(canchaId),
      ]);

      const porDia: Record<string, Horario> = {};
      for (const h of hApi) {
        porDia[h.dia] = h;
      }

      const merged: Horario[] = DIAS.map((d) => {
        const existing = porDia[d.key];
        return (
          existing || {
            dia: d.key,
            hora_apertura: null,
            hora_cierre: null,
          }
        );
      });

      setHorarios(merged);
      setCancha(canchaApi);
    } catch (e: any) {
      setError(e?.message ?? "No se pudieron cargar los horarios.");
    } finally {
      setLoading(false);
    }
  }, [canchaId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onChangeHora = (
    diaKey: string,
    field: "hora_apertura" | "hora_cierre",
    value: string
  ) => {
    setHorarios((prev) =>
      prev.map((h) =>
        h.dia === diaKey ? { ...h, [field]: value } : h
      )
    );
  };

  const onToggleCerrado = (diaKey: string, cerrado: boolean) => {
    setHorarios((prev) =>
      prev.map((h) =>
        h.dia === diaKey
          ? {
              ...h,
              hora_apertura: cerrado ? null : "09:00",
              hora_cierre: cerrado ? null : "18:00",
            }
          : h
      )
    );
  };

  const validate = (): string | null => {
    const reHora = /^([01]\d|2[0-3]):[0-5]\d$/;

    for (const h of horarios) {
      const { dia, hora_apertura, hora_cierre } = h;

      // cerrado → ok
      if (!hora_apertura && !hora_cierre) continue;

      if (!hora_apertura || !hora_cierre) {
        return `Completa ambas horas en ${dia}.`;
      }
      if (!reHora.test(hora_apertura) || !reHora.test(hora_cierre)) {
        return `Formato de hora inválido en ${dia}. Usa HH:MM.`;
      }
      if (hora_apertura >= hora_cierre) {
        return `La hora de apertura debe ser menor a la de cierre en ${dia}.`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    if (!canchaId) return;

    const msg = validate();
    if (msg) {
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Validación", msg);
      return;
    }

    try {
      setSaving(true);
      await saveHorariosPorCancha(canchaId, complejoId, horarios);

      const okMsg = "Horarios guardados correctamente.";
      if (Platform.OS === "web") window.alert(okMsg);
      else Alert.alert("Listo", okMsg);

      await loadData(); // recargar por si el backend normaliza tiempos
    } catch (e: any) {
      const m = e?.message ?? "No se pudieron guardar los horarios.";
      if (Platform.OS === "web") window.alert(m);
      else Alert.alert("Error", m);
    } finally {
      setSaving(false);
    }
  };

  const contenido = useMemo(
    () => (
      <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        {DIAS.map((d) => {
          const h = horarios.find((x) => x.dia === d.key);
          const apertura = h?.hora_apertura ?? "";
          const cierre = h?.hora_cierre ?? "";
          const cerrado = !apertura && !cierre;

          return (
            <View key={d.key} style={styles.rowDia}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.diaLabel}>{d.label}</Text>
                <View style={styles.cerradoWrap}>
                  <Text style={styles.cerradoText}>Cerrado</Text>
                  <Switch
                    value={cerrado}
                    onValueChange={(val) => onToggleCerrado(d.key, val)}
                  />
                </View>
              </View>

              {!cerrado && (
                <View style={styles.horasRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.horaLabel}>Apertura</Text>
                    <TextInput
                      style={styles.inputHora}
                      placeholder="HH:MM"
                      keyboardType="numeric"
                      value={apertura}
                      onChangeText={(val) =>
                        onChangeHora(d.key, "hora_apertura", val)
                      }
                    />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.horaLabel}>Cierre</Text>
                    <TextInput
                      style={styles.inputHora}
                      placeholder="HH:MM"
                      keyboardType="numeric"
                      value={cierre}
                      onChangeText={(val) =>
                        onChangeHora(d.key, "hora_cierre", val)
                      }
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity
          style={[styles.btnPrimary, { marginTop: 16 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={styles.btnPrimaryTxt}>Guardar horarios</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    ),
    [horarios, saving]
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={styles.headerTop}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Gestionar horarios</Text>
          <Text style={styles.subtle}>
            {titleCancha}
            {cancha?.deporte ? ` · ${cancha.deporte}` : ""}
          </Text>
        </View>
      </View>

      {error && !loading && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text style={{ color: "#b91c1c" }}>{error}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ paddingTop: 8 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadData} />
        }
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.muted}>Cargando horarios…</Text>
          </View>
        ) : (
          contenido
        )}
      </ScrollView>
    </View>
  );
}

/* ========= estilos ========= */

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  muted: {
    color: "#6b7280",
    marginTop: 8,
    textAlign: "center",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#efefef",
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  subtle: {
    color: "#6b7280",
  },
  rowDia: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#f9fafb",
  },
  diaLabel: {
    fontWeight: "700",
    fontSize: 15,
    color: "#111827",
  },
  cerradoWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
    gap: 6,
  },
  cerradoText: {
    fontSize: 12,
    color: "#64748b",
  },
  horasRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  horaLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  inputHora: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
    fontSize: 14,
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: TEAL,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  btnPrimaryTxt: {
    color: "#fff",
    fontWeight: "700",
  },
});
