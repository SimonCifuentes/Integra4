import { http } from "@/src/services/http";
import { R } from "@/src/config/routes";
import type { Reserva } from "@/src/types";

export const ReservasAPI = {
  mias: () => http.get<Reserva[]>(R.reservas.mias).then(r=>r.data),
  create: (body: { id_cancha:number; fecha_reserva:string; hora_inicio:string; hora_fin:string }) =>
    http.post<Reserva>(R.reservas.create, body).then(r=>r.data),
};
