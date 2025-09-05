import { create } from 'zustand';
import { storage } from '../utils/storage';

export type Usuario = {
  id_usuario: number; nombre: string; apellido: string;
  email?: string; telefono?: string | null; avatar_url?: string | null; rol: string;
};

type AuthState = {
  token: string | null;
  user: Usuario | null;
  isHydrated: boolean;
  setSession: (t: string, u: Usuario) => Promise<void>;
  setUser: (u: Usuario) => Promise<void>;         // 👈 NUEVO
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  token: null,
  user: null,
  isHydrated: false,
  async setSession(token, user) {
    await storage.setItem('token', token);
    await storage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },
  async setUser(user) {                            // 👈 NUEVO: actualiza SOLO el usuario
    await storage.setItem('user', JSON.stringify(user));
    set({ user });
  },
  async logout() {
    await storage.deleteItem('token');
    await storage.deleteItem('user');
    set({ token: null, user: null });
  },
  async hydrate() {
    const [t, u] = await Promise.all([
      storage.getItem('token'),
      storage.getItem('user'),
    ]);
    set({ token: t ?? null, user: u ? JSON.parse(u) : null, isHydrated: true });
  },
}));