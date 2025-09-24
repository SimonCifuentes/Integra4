﻿// src/config/env.ts
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = (Constants.expoConfig?.extra ?? {}) as { API_URL?: string };

// Detectar IP automáticamente en móvil vs web
const LOCAL_API =
  Platform.OS === 'web'
    ? 'http://localhost:8000/api/v1' // navegador en tu PC
    : 'http://192.168.1.177:8000/api/v1'; // tu IPv4 de ipconfig

export const API_URL = extra.API_URL ?? LOCAL_API;