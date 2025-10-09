// src/config/env.ts
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = (Constants.expoConfig?.extra ?? {}) as { API_URL?: string };

// Detectar IP automáticamente en móvil vs web
const LOCAL_API =
  Platform.OS === 'web'
    ? 'http://localhost:8000/api/v1'
    : 'http://10.0.2.2:8000/api/v1'; // 👈 en lugar de tu IPv4

export const API_URL = extra.API_URL ?? LOCAL_API;
