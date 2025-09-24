export type Reserva = {
  id_reserva: number;
  id_usuario: number;
  id_cancha: number;
  fecha_reserva: string; // YYYY-MM-DD
  hora_inicio: string;   // HH:MM
  hora_fin: string;      // HH:MM
  estado: "pending" | "confirmed" | "cancelled";
  monto_total?: number | null;
};