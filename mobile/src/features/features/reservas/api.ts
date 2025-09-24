import { http } from "@/src/services/http";
import { R } from "@/src/config/routes";
import type { Reserva } from "@/src/types";

export const ReservasAPI = {
  mias: () => http.get<Reserva[]>(R.reservas.mias).then(r => r.data),

  create: (body: {
    id_cancha: number;
    fecha_reserva: string; // YYYY-MM-DD
    hora_inicio: string;   // HH:MM
    hora_fin: string;      // HH:MM
  }) => http.post<Reserva>(R.reservas.create, body).then(r => r.data),

  // NUEVO: cancelar una reserva
  cancelar: (id: number) =>
    http.post<Reserva>(R.reservas.cancelar(id)).then(r => r.data),
};