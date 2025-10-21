// src/features/reservas/hooks.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ReservasAPI, CotizarBody } from "./api";
import type { Reserva } from "@/src/types";

export function useMisReservas() {
  return useQuery({ queryKey: ["reservas", "mias"], queryFn: ReservasAPI.mias });
}

export function useCotizarReserva() {
  return useMutation({
    mutationFn: (body: CotizarBody) => ReservasAPI.cotizar(body),
  });
}

export function useCrearReserva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CotizarBody & { monto_total: number }) => ReservasAPI.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservas", "mias"] }),
  });
}
