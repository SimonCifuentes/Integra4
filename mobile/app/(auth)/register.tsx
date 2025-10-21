// app/(auth)/register.tsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated, Easing,
  SafeAreaView, ScrollView, useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useRegister } from "../../src/features/features/auth/hooks";

const TEAL = "#0ea5a4";

export default function RegisterScreen() {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useRegister();
  const { height } = useWindowDimensions();

  // Animación sutil del badge
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

  // Validaciones
  const emailOk = useMemo(() => /^\S+@\S+\.\S+$/.test(email.trim()), [email]);
  const passOk = useMemo(() => (password?.length ?? 0) >= 6, [password]);
  const nombreOk = useMemo(() => nombre.trim().length >= 2, [nombre]);
  const apellidoOk = useMemo(() => apellido.trim().length >= 2, [apellido]);
  const canSubmit = nombreOk && apellidoOk && emailOk && passOk && !register.isPending;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    Haptics.selectionAsync();
    try {
      await register.mutateAsync({ nombre, apellido, email, password });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(auth)/login");
    } catch (e: any) {
      console.log("Error de registro:", e);
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        "No se pudo registrar el usuario.";
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // Alto del héroe adaptable (un poco más alto en pantallas grandes)
  const HERO_H = Math.max(220, Math.min(300, height * 0.32));
  // “superposición” controlada del card (en vez de marginTop negativo)
  const CARD_LIFT = 28;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentInsetAdjustmentBehavior="always"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {/* HERO */}
          <LinearGradient
            colors={["#0ea5a4", "#16a34a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.hero, { height: HERO_H, position: "relative", zIndex: 1 }]}
          >
            <View style={styles.heroContent}>
              <Animated.View style={[styles.heroBadge, { transform: [{ scale }] }]}>
                <Ionicons name="person-add-outline" size={24} color="#065f46" />
              </Animated.View>
              <Text style={styles.heroTitle}>Crea tu cuenta</Text>
              <Text style={styles.heroSub}>Regístrate para reservar y gestionar tus canchas</Text>
            </View>
          </LinearGradient>

          {/* CARD */}
          <View style={{ position: "relative", zIndex: 2 }}>
            <View style={[styles.card, { transform: [{ translateY: -CARD_LIFT }] }]}>
              <Text style={styles.cardTitle}>Registro</Text>

              {/* Nombre */}
              <View style={[styles.inputWrap, !nombreOk && nombre.length > 0 ? styles.inputError : null]}>
                <Ionicons name="person-outline" size={18} color="#64748b" />
                <TextInput
                  value={nombre}
                  onChangeText={setNombre}
                  placeholder="Nombre"
                  style={styles.input}
                  returnKeyType="next"
                />
                {nombre.length > 0 && (
                  <Ionicons name={nombreOk ? "checkmark-circle" : "alert-circle"} size={18} color={nombreOk ? "#16a34a" : "#ef4444"} />
                )}
              </View>

              {/* Apellido */}
              <View style={[styles.inputWrap, !apellidoOk && apellido.length > 0 ? styles.inputError : null]}>
                <Ionicons name="person-outline" size={18} color="#64748b" />
                <TextInput
                  value={apellido}
                  onChangeText={setApellido}
                  placeholder="Apellido"
                  style={styles.input}
                  returnKeyType="next"
                />
                {apellido.length > 0 && (
                  <Ionicons name={apellidoOk ? "checkmark-circle" : "alert-circle"} size={18} color={apellidoOk ? "#16a34a" : "#ef4444"} />
                )}
              </View>

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
                  <Ionicons name={emailOk ? "checkmark-circle" : "alert-circle"} size={18} color={emailOk ? "#16a34a" : "#ef4444"} />
                )}
              </View>

              {/* Password */}
              <View style={[styles.inputWrap, !passOk && password.length > 0 ? styles.inputError : null]}>
                <Ionicons name="lock-closed-outline" size={18} color="#64748b" />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Contraseña (mín. 6 caracteres)"
                  secureTextEntry={!showPass}
                  style={styles.input}
                  returnKeyType="done"
                  onSubmitEditing={onSubmit}
                />
                <TouchableOpacity onPress={() => setShowPass((s) => !s)} hitSlop={10}>
                  <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Error */}
              {!!error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color="#b91c1c" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* CTA principal */}
              <TouchableOpacity
                disabled={!canSubmit}
                onPress={onSubmit}
                style={[styles.primaryBtn, !canSubmit && { opacity: 0.6 }]}
              >
                {register.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="person-add-outline" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>Registrarse</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={{ color: "#94a3b8" }}>o</Text>
                <View style={styles.divider} />
              </View>

              {/* Ir a login */}
              <View style={[styles.rowCenter, { marginTop: 8 }]}>
                <Text style={{ color: "#475569" }}>¿Ya tienes cuenta?</Text>
                <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
                  <Text style={[styles.link, { marginLeft: 6 }]}>Inicia sesión</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* relleno para compensar el translateY (evita corte en el final) */}
          <View style={{ height: CARD_LIFT }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
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

  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: -8,              // pequeño ajuste visual
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

  rowCenter: { flexDirection: "row", alignItems: "center" },

  primaryBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: TEAL,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
  },
  primaryBtnText: { color: "white", fontWeight: "700" },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 12 },
  divider: { flex: 1, height: 1, backgroundColor: "#e5e7eb" },

  link: { color: TEAL, fontWeight: "700" },

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
});
