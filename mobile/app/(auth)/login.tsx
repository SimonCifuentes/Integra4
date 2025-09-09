// app/(auth)/login.tsx
import { useState } from 'react';
import { View, TextInput, Button, Text, ActivityIndicator } from 'react-native';
import { useLogin } from '../../src/features/features/auth/hooks';
// filepath: c:\Users\nachi\OneDrive\Documentos\GitHub\Integra4\mobile\app\(auth)\login.tsx
import { useAuth } from '../../src/stores/auth';
import { router } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState("demo@demo.cl");
  const [password, setPassword] = useState("demo123");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const login = useLogin(); // TanStack v5
  const setSession = useAuth((s) => s.setSession);

  // Animación suave del hero
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });

  const emailOk = useMemo(() => /^\S+@\S+\.\S+$/.test(email), [email]);
  const passOk  = useMemo(() => (password?.length ?? 0) >= 6, [password]);
  const canSubmit = emailOk && passOk && !login.isPending;

  const doSubmit = async () => {
    if (!canSubmit) return;
    Haptics.selectionAsync();
    setError(null);

    if (DEV_BYPASS_AUTH) {
      await setSession("dev-token", {
        id_usuario: 1,
        nombre: "Demo",
        apellido: "Local",
        email,
        telefono: null,
        avatar_url: null,
        rol: "user",
      });
      router.replace("/"); // sin tabs
      return;
    }

    try {
      const { access_token, user } = await login.mutateAsync({ email, password });
      await setSession(access_token, user);
      router.replace("/");
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "No se pudo iniciar sesión. Verifica tus credenciales.";
      setError(msg);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* HERO */}
      <LinearGradient colors={["#0ea5a4", "#16a34a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroContent}>
          <Animated.View style={[styles.heroBadge, { transform: [{ scale }] }]}>
            <Ionicons name="football-outline" size={26} color="#065f46" />
          </Animated.View>
          <Text style={styles.heroTitle}>PlayTemuco</Text>
          <Text style={styles.heroSub}>Reserva, gestiona y juega en tu ciudad</Text>
        </View>
      </LinearGradient>

      {/* CARD */}
      <View style={styles.cardWrap}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Inicia sesión</Text>

          {/* Email */}
          <View style={[styles.inputWrap, !emailOk && email.length > 0 ? styles.inputError : null]}>
            <Ionicons name="mail-outline" size={18} color="#64748b" />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Correo electrónico"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              returnKeyType="next"
            />
            {email.length > 0 && (
              <Ionicons
                name={emailOk ? "checkmark-circle" : "alert-circle"}
                size={18}
                color={emailOk ? "#16a34a" : "#ef4444"}
              />
            )}
          </View>

          {/* Password */}
          <View style={[styles.inputWrap, !passOk && password.length > 0 ? styles.inputError : null]}>
            <Ionicons name="lock-closed-outline" size={18} color="#64748b" />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Contraseña"
              secureTextEntry={!showPass}
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={doSubmit}
            />
            <TouchableOpacity onPress={() => setShowPass((s) => !s)} hitSlop={10}>
              <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* opciones */}
          <View style={styles.rowBetween}>
            <View style={styles.rowCenter}>
              <Switch value={remember} onValueChange={setRemember} />
              <Text style={{ marginLeft: 8, color: "#475569" }}>Recordarme</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/(auth)/forgot")}>
              <Text style={styles.link}>Olvidé mi contraseña</Text>
            </TouchableOpacity>
          </View>

          {/* Error */}
          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#b91c1c" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Botón principal */}
          <TouchableOpacity
            disabled={!canSubmit}
            onPress={doSubmit}
            style={[styles.primaryBtn, !canSubmit && { opacity: 0.6 }]}
          >
            {login.isPending ? (
              <ActivityIndicator />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Entrar</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={{ color: "#94a3b8" }}>o</Text>
            <View style={styles.divider} />
          </View>

          {/* Social (decorativo / plug futuro) */}
          <View style={styles.rowGap}>
            <TouchableOpacity style={styles.altBtn} onPress={() => {}}>
              <Ionicons name="logo-google" size={18} color="#111827" />
              <Text style={styles.altBtnText}>Continuar con Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.altBtn} onPress={() => {}}>
              <Ionicons name="logo-facebook" size={18} color="#111827" />
              <Text style={styles.altBtnText}>Continuar con Facebook</Text>
            </TouchableOpacity>
          </View>

          {/* Crear cuenta */}
          <View style={[styles.rowCenter, { marginTop: 12 }]}>
            <Text style={{ color: "#475569" }}>¿No tienes cuenta?</Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
              <Text style={[styles.link, { marginLeft: 6 }]}>Crear cuenta</Text>
            </TouchableOpacity>
          </View>

          {/* Bypass DEV visible */}
          {DEV_BYPASS_AUTH && (
            <TouchableOpacity
              onPress={doSubmit}
              style={[styles.devBtn, { marginTop: 16 }]}
            >
              <Ionicons name="rocket-outline" size={16} color="#0ea5a4" />
              <Text style={styles.devBtnText}>Entrar rápido (DEV sin backend)</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 220,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
    paddingTop: 56,
    paddingHorizontal: 20,
  },
  heroContent: { flex: 1, justifyContent: "center" },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#a7f3d0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 10,
  },
  heroTitle: { fontSize: 28, fontWeight: "800", color: "white" },
  heroSub: { color: "white", marginTop: 4, opacity: 0.95 },

  cardWrap: { marginTop: -36, paddingHorizontal: 16 },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 48,
    marginBottom: 10,
  },
  input: { flex: 1, fontSize: 16 },
  inputError: { borderColor: "#fecaca", backgroundColor: "#fff1f2" },

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 6 },
  rowCenter: { flexDirection: "row", alignItems: "center" },

  primaryBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "#0ea5a4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
  },
  primaryBtnText: { color: "white", fontWeight: "700" },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 12 },
  divider: { flex: 1, height: 1, backgroundColor: "#e5e7eb" },
  rowGap: { gap: 8 },

  altBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  altBtnText: { fontWeight: "700", color: "#111827" },

  link: { color: "#0ea5a4", fontWeight: "700" },

  errorBox: {
    marginTop: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fecaca",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: { color: "#b91c1c", flex: 1 },

  devBtn: {
    height: 42,
    borderRadius: 10,
    backgroundColor: "#ecfeff",
    borderWidth: 1,
    borderColor: "#a5f3fc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  devBtnText: { color: "#0ea5a4", fontWeight: "700" },
});
