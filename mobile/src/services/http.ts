import axios from 'axios';
import { API_URL } from '../config/env';
import { storage } from '../utils/storage';

console.log("👉 API_URL usada por axios:", API_URL);

export const http = axios.create({ baseURL: API_URL, timeout: 15000 });

http.interceptors.request.use(async (config: any) => {
  const token = await storage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
