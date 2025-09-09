// src/stores/auth.ts
import { create } from 'zustand';
import { storage } from '../utils/storage';

export type Usuario = {
  id_usuario: number; nombre: string; apellido: string;
  email?: string; telefono?: string | null; avatar_url?: string | null; rol: string;
};

// 👇 Posibles shapes que vienen del backend
type ApiUser = {
  id?: number; id_usuario?: number;
  name?: string; nombre?: string; apellido?: string;
  email?: string; telefono?: string | null; avatar_url?: string | null;
  rol?: string; role?: string; roles?: Array<string | { name?: string }>;
};

const normalizeUser = (u: ApiUser): Usuario => {
  const rawRole =
    u.rol ??
    u.role ??
    (Array.isArray(u.roles)
      ? (typeof u.roles[0] === 'string' ? u.roles[0] : (u.roles[0] as any)?.name)
      : undefined);

  return {
    id_usuario: u.id_usuario ?? u.id ?? 0,
    nombre:     u.nombre ?? u.name ?? '',
    apellido:   u.apellido ?? '',
    email:      u.email ?? '',
    telefono:   u.telefono ?? '',
    avatar_url: u.avatar_url ?? null,
    rol:        String(rawRole ?? 'user').toLowerCase(), // 🔑 siempre definido
  };
};

type AuthState = {
  token: string | null;
  user: Usuario | null;
  isHydrated: boolean;
  setSession: (t: string, u: ApiUser) => Promise<void>;       // 👈 recibe ApiUser, normaliza
  setUser: (u: Partial<Usuario>) => Promise<void>;             // 👈 actualización parcial
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  token: null, user: null, isHydrated: false,

  async setSession(token, apiUser) {
    const user = normalizeUser(apiUser);
    await storage.setItem('token', token);
    await storage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },

  async setUser(partial) {
    const current = get().user;
    const merged: Usuario = {
      ...(current ?? { id_usuario: 0, nombre: '', apellido: '', email: '', telefono: '', avatar_url: null, rol: 'user' }),
      ...partial,
      rol: partial.rol ?? current?.rol ?? 'user', // 🔒 no perder el rol
    };
    await storage.setItem('user', JSON.stringify(merged));
    set({ user: merged });
  },

  async logout() {
    await storage.deleteItem('token');
    await storage.deleteItem('user');
    set({ token: null, user: null });
  },

  async hydrate() {
    const [t, u] = await Promise.all([ storage.getItem('token'), storage.getItem('user') ]);
    set({ token: t ?? null, user: u ? (JSON.parse(u) as Usuario) : null, isHydrated: true });
  },
}));
