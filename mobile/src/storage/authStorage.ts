import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Browser localStorage is not equivalent to native SecureStore; it is intended
// only for the development/demo web build. Native iOS and Android still use
// SecureStore for persisted authentication data.
function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return getBrowserStorage()?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    const storage = getBrowserStorage();
    if (!storage) throw new Error('Browser storage is unavailable.');
    storage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    getBrowserStorage()?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
