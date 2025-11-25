// app/(auth)/reset.tsx
import React, { useState, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, router } from "expo-router";
import { useResetPassword } from "@/src/features/auth/hooks";

const TEAL = "#0ea5a4";

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();

  const [code, setCode] = useState("");
  const [newPass, setNewPass] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = useResetPassword();

  const codeOk = code.trim().length >= 4;
  const passOk = newPass.length >= 6;

  const onSubmit = async () => {
    if (!codeOk || !passOk) return;

    Haptics.selectionAsync();
    setError(null);

    try {
      await reset.mutateAsync({
        email: String(email),
        code,
        new_password: newPass,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(auth)/login");
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        "El código no es válido.";
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
            <Ionicons name="key-outline" size={32} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 26, fontWeight: "800", marginTop: 8 }}>
              Restablecer contraseña
            </Text>
            <Text style={{ color: "#fff", opacity: 0.9 }}>
              Ingresa el código enviado a {email}.
            </Text>
          </LinearGradient>

          {/* CARD */}
          <View
            style={{
              backgroundColor: "white",
              padding: 16,
              borderRadius: 16,
              elevation: 3,
            }}
          >
            {/* Código */}
            <View
              style={{
                borderWidth: 1,
                borderColor: !codeOk && code.length > 0 ? "#fecaca" : "#e5e7eb",
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
              <Ionicons name="shield-checkmark-outline" size={18} color="#64748b" />
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="Código"
                keyboardType="numeric"
                style={{ flex: 1, fontSize: 16 }}
              />
            </View>

            {/* Nueva contraseña */}
            <View
              style={{
                borderWidth: 1,
                borderColor: !passOk && newPass.length > 0 ? "#fecaca" : "#e5e7eb",
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
              <Ionicons name="lock-closed-outline" size={18} color="#64748b" />
              <TextInput
                secureTextEntry={true}
                value={newPass}
                onChangeText={setNewPass}
                placeholder="Nueva contraseña"
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

            <TouchableOpacity
              onPress={onSubmit}
              disabled={!codeOk || !passOk}
              style={{
                height: 48,
                borderRadius: 12,
                backgroundColor: TEAL,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                opacity: !codeOk || !passOk ? 0.6 : 1,
              }}
            >
              {reset.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={18} color="#fff" />
                  <Text style={{ color: "white", fontWeight: "700" }}>
                    Cambiar contraseña
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
