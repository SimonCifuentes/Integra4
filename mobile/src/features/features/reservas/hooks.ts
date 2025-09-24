﻿import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ReservasAPI } from "./api";

export function useMisReservas() {
  return useQuery({ queryKey: ["reservas", "mias"], queryFn: ReservasAPI.mias });
}

export function useCrearReserva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ReservasAPI.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservas", "mias"] }),
  });
}

export function useCancelarReserva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ReservasAPI.cancelar, // recibe (id:number)
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservas", "mias"] }),
  });
}