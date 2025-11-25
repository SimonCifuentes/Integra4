import { useMutation } from "@tanstack/react-query";
import { http } from "@/src/services/http";

// ------------------------------
// Olvidé mi contraseña
// ------------------------------
export function useForgotPassword() {
  return useMutation({
    mutationFn: async (payload: { email: string }) => {
      const { data } = await http.post("/auth/forgot-password", payload);
      return data;
    },
  });
}

// ------------------------------
// Reset contraseña con código
// ------------------------------
export function useResetPassword() {
  return useMutation({
    mutationFn: async (payload: {
      email: string;
      code: string;
      new_password: string;
    }) => {
      const { data } = await http.post("/auth/reset-password", payload);
      return data;
    },
  });
}
