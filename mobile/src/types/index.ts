export type Complejo = { id_complejo:number; nombre:string; comuna:string; esta_activo:boolean };
export type Cancha = { id_cancha:number; id_complejo:number; nombre:string; deporte?:string; esta_activa?:boolean };
export type Reserva = {
  id_reserva:number; id_usuario:number; id_cancha:number;
  fecha_reserva:string; hora_inicio:string; hora_fin:string;
  estado:"pending"|"confirmed"|"cancelled"; monto_total?:number|null;
};
