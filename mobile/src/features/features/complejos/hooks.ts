// src/complejos/hooks.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { Complejo } from "./api";

export const hooks = {
  // 🔹 Hook: obtener todos los complejos
  useComplejos: (params?: { lat?: number; lon?: number; max_km?: number }) =>
    useQuery<Complejo[]>({
      queryKey: ["complejos", params],
      queryFn: () => api.listar(params),
      initialData: [], // Evita undefined y previene error de .map
    }),

  // 🔹 Hook: obtener complejos cercanos
  useComplejosCercanos: (
    lat: number | null,
    lon: number | null,
    radioKm: number = 5
  ) =>
    useQuery<Complejo[]>({
      queryKey: ["complejos", "cercanos", lat, lon, radioKm],
      queryFn: () => {
        if (lat == null || lon == null) return Promise.resolve([]);
        return api.cercanos(lat, lon, radioKm);
      },
      enabled: !!lat && !!lon, // solo ejecuta si hay coordenadas
      initialData: [], // también evita errores al inicio
    }),
};
