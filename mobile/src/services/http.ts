import axios from 'axios';
import { API_URL } from '../config/env';
import { storage } from '../utils/storage';

// Crea una instancia global de axios
export const http = axios.create({
  baseURL: API_URL, // ✅ Usará la API pública de Traefik
  timeout: 15000,
});

// Inyecta el token JWT (si existe)
http.interceptors.request.use(async (config: any) => {
  const token = await storage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
