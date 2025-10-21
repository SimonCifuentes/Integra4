﻿// src/config/env.ts
import Constants from 'expo-constants';

const ENV_API = process.env.EXPO_PUBLIC_API_URL?.trim();
const EXTRA_API = (Constants.expoConfig?.extra as { API_URL?: string } | undefined)?.API_URL?.trim();

// ⬇⬇⬇ Fallback a tu Traefik en la nube
const FALLBACK_API = "https://api-h1d7oi-a881cc-168-232-167-73.traefik.me/api/v1";

export const API_URL = ENV_API || EXTRA_API || FALLBACK_API;

if (__DEV__) console.log('🛰️ API en uso:', API_URL);
