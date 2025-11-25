// app/(auth)/forgot.tsx
import React, { useState, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useForgotPassword } from "@/src/features/auth/hooks";

const TEAL = "#0ea5a4";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const forgot = useForgotPassword();

  const emailOk = useMemo(() => /^\S+@\S+\.\S+$/.test(email), [email]);

  const onSubmit = async () => {
    if (!emailOk) return;

    Haptics.selectionAsync();
    setError(null);

    try {
      await forgot.mutateAsync({ email });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/(auth)/reset?email=${email}`);
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        "Hubo un problema al enviar el código.";
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <LinearGradient
            colors={["#0ea5a4", "#16a34a"]}
            style={{ padding: 24, borderRadius: 16, marginBottom: 20 }}
          >
            <View>
              <Ionicons name="lock-open-outline" size={32} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 26, fontWeight: "700", marginTop: 8 }}>
                ¿Olvidaste tu contraseña?
              </Text>
              <Text style={{ color: "#fff", opacity: 0.9 }}>
                Te enviaremos un código para restablecerla.
              </Text>
            </View>
          </LinearGradient>

          {/* Card */}
          <View
            style={{
              backgroundColor: "white",
              padding: 16,
              borderRadius: 16,
              elevation: 3,
            }}
          >
            {/* Email */}
            <View
              style={{
                borderWidth: 1,
                borderColor: !emailOk && email.length > 0 ? "#fecaca" : "#e5e7eb",
                backgroundColor: "#f9fafb",
                borderRadius: 12,
                height: 48,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                marginBottom: 12,
                gap: 8,
              }}
            >
              <Ionicons name="mail-outline" size={18} color="#64748b" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Correo electrónico"
                autoCapitalize="none"
                keyboardType="email-address"
                style={{ flex: 1, fontSize: 16 }}
              />
            </View>

            {!!error && (
              <View
                style={{
                  padding: 10,
                  backgroundColor: "#fee2e2",
                  borderWidth: 1,
                  borderColor: "#fecaca",
                  borderRadius: 10,
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: "#b91c1c" }}>{error}</Text>
              </View>
            )}

            {/* Botón */}
            <TouchableOpacity
              disabled={!emailOk}
              onPress={onSubmit}
              style={{
                height: 48,
                borderRadius: 12,
                backgroundColor: TEAL,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                opacity: !emailOk ? 0.6 : 1,
              }}
            >
              {forgot.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send-outline" size={18} color="#fff" />
                  <Text style={{ color: "white", fontWeight: "700" }}>
                    Enviar código
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
