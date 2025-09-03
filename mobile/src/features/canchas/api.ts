import { http } from "@/src/services/http";
import { R } from "@/src/config/routes";
import type { Cancha } from "@/src/types";

export const CanchasAPI = {
  list: (params?: { deporte?:string; page?:number; page_size?:number }) =>
    http.get<{ items:Cancha[]; total:number; page:number; page_size:number }>(R.canchas.list, { params }).then(r=>r.data),
  byId: (id:number) => http.get<Cancha>(R.canchas.byId(id)).then(r=>r.data),
};
