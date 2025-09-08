// src/config/env.ts
import Constants from 'expo-constants';
const extra = (Constants.expoConfig?.extra ?? {}) as { API_URL?: string };
export const API_URL = extra.API_URL ?? 'http://localhost:8000/api/v1';
