﻿// src/config/env.ts
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// 1) Primero intenta por variable de entorno (funciona perfecto en Expo Web y Móvil)
const ENV_API = process.env.EXPO_PUBLIC_API_URL;

// 2) Luego intenta por extra de app.json/app.config.ts (por si también lo usas)
const EXTRA_API =
  (Constants.expoConfig?.extra as { API_URL?: string } | undefined)?.API_URL;

// 3) Fallback local (solo si no hay nada configurado)
const LOCAL_API =
  Platform.OS === 'web'
    ? 'http://localhost:8000/api/v1'
    : 'http://192.168.1.177:8000/api/v1';

export const API_URL = ENV_API ?? EXTRA_API ?? LOCAL_API;

console.log('🛰️ API en uso:', API_URL);
