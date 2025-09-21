/* eslint-disable @typescript-eslint/no-explicit-any */
import { http } from "@/src/services/http";
import { R } from "@/src/config/routes";

export type Slot = { inicio: string; fin: string };
export type SlotsResponse = {
  id_cancha: number;
  fecha: string;     // YYYY-MM-DD
  slot_min: number;  // minutos por bloque
  slots: Slot[];
};

export const DisponAPI = {
  // GET /api/v1/disponibilidad?id_cancha=...&fecha=YYYY-MM-DD&slot_min=60
  slots: (params: { id_cancha: number; fecha: string; slot_min?: number }) =>
    http.get<SlotsResponse>(R.disponibilidad.slots, { params }).then(r => r.data),
};
