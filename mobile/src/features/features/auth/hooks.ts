import { useMutation, useQuery } from "@tanstack/react-query";
import { AuthAPI } from "./api";

// ---- ME (perfil actual) ----
export function useMe() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: AuthAPI.me,      // GET /api/v1/auth/me (ajusta si tu ruta difiere)
    staleTime: 60_000,        // cachea 1 min (opcional)
  });
}

// ---- LOGIN ----
// Devuelve { access_token, user } según tu backend
export function useLogin() {
  return useMutation({
    mutationFn: AuthAPI.login, // POST /api/v1/auth/login
  });
}
export function useRegister() {
  return useMutation({ mutationFn: AuthAPI.register });
}