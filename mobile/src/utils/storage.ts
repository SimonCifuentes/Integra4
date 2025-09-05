import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const web = {
  async getItem(key: string) { return localStorage.getItem(key); },
  async setItem(key: string, value: string) { localStorage.setItem(key, value); },
  async deleteItem(key: string) { localStorage.removeItem(key); },
};

const native = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  deleteItem: SecureStore.deleteItemAsync,
};

export const storage = Platform.OS === 'web' ? web : native;
