﻿/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from "@tanstack/react-query";
import { DisponAPI } from "./api";

/**
 * Hook para consultar slots disponibles de una cancha en una fecha.
 * Ejemplo de uso:
 *   const { data, isLoading, error } = useSlots(1, "2025-09-21", 60);
 */
export function useSlots(id_cancha: number, fecha: string, slot_min = 60) {
  return useQuery({
    queryKey: ["slots", id_cancha, fecha, slot_min],
    queryFn: () => DisponAPI.slots({ id_cancha, fecha, slot_min }),
    enabled: !!id_cancha && !!fecha,
    // Opcional: mantiene el caché fresco 60s para evitar refetch inmediato al volver
    staleTime: 60_000,
  });
}