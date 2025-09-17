// src/features/auth/hooks.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

// ---- UPDATE ME (guardar perfil) ----
// Envía los cambios del usuario a la API y actualiza la caché de 'me'
export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: AuthAPI.updateMe, // PUT/PATCH /api/v1/users/me
    onSuccess: (updatedUser) => {
      // Si el endpoint devuelve el usuario actualizado, refrescamos caché
      if (updatedUser && typeof updatedUser === "object") {
        qc.setQueryData(["auth", "me"], updatedUser);
      } else {
        // Si tu API responde { ok:true }, al menos invalida para refetch
        qc.invalidateQueries({ queryKey: ["auth", "me"] });
      }
    },
  });
}
