// src/features/reservas/api.ts
import { http } from "@/src/services/http";
import { R } from "@/src/config/routes";
import type { Reserva } from "@/src/types";

export type CotizarBody = {
  id_cancha: number;
  fecha_reserva: string; // "YYYY-MM-DD"
  hora_inicio: string;   // "HH:MM"
  hora_fin: string;      // "HH:MM"
};

export type CotizarResponse = {
  disponible: boolean;      // <= asumiendo nombre en español
  monto_total: number;      // CLP
  moneda?: string;          // "CLP"
};

export const ReservasAPI = {
  mias: () => http.get<Reserva[]>(R.reservas.mias).then(r => r.data),

  cotizar: (body: CotizarBody) =>
    http.post<CotizarResponse>(R.reservas.cotizar, body).then(r => r.data),

  create: (body: CotizarBody & { monto_total: number }) =>
    http.post<Reserva>(R.reservas.create, body).then(r => r.data),
};
