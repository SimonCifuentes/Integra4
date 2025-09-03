import { http } from "@/src/services/http";
import { R } from "@/src/config/routes";
import type { Usuario } from "@/src/stores/auth";

export type LoginDto = { email:string; password:string };
export type LoginResp = { access_token:string; token_type:"bearer"; refresh_token?:string; user:Usuario };

export const AuthAPI = {
  register: (b:{nombre:string;apellido:string;email:string;password:string}) =>
    http.post<LoginResp>(R.auth.register, b).then(r=>r.data),
  login: (b:LoginDto) => http.post<LoginResp>(R.auth.login, b).then(r=>r.data),
  refresh: (refresh_token:string) =>
    http.post<{access_token:string}>(R.auth.refresh, { refresh_token }).then(r=>r.data),
  me: () => http.get<Usuario>(R.auth.me).then(r=>r.data),
  updateMe: (body: Partial<Pick<Usuario, 'nombre' | 'apellido' | 'telefono' | 'avatar_url'>>) =>
    http.patch<Usuario>(R.auth.me, body).then(r=>r.data),
  changePassword: (body:{ actual:string; nueva:string }) =>
    http.patch(R.auth.changePassword ?? '/auth/me/password', body).then(r=>r.data),
  pushToken: (token:string) => http.post(R.auth.pushToken, { token }).then(r=>r.data),
  logout: () => http.post(R.auth.logout, {}).then(r=>r.data),
  
};
