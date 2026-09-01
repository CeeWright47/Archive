import AsyncStorage from '@react-native-async-storage/async-storage';

import type { StorageAdapter } from './types';

const MAX_VALUE_BYTES = 256 * 1024; // 256KB — images belong on the filesystem, not here.

// Counts UTF-8 bytes without relying on TextEncoder, which isn't guaranteed on Hermes.
function byteLength(value: string): number {
  return unescape(encodeURIComponent(value)).length;
}

export function createAsyncStorageAdapter(): StorageAdapter {
  return {
    async get<T>(key: string): Promise<T | null> {
      const raw = await AsyncStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    },

    async set<T>(key: string, value: T): Promise<void> {
      const serialized = JSON.stringify(value);
      const size = byteLength(serialized);
      if (size > MAX_VALUE_BYTES) {
        throw new Error(
          `Storage value for key "${key}" is ${size} bytes, exceeding the 256KB limit. ` +
            'Store images and other binary data via the filesystem (see src/storage/images.ts) instead of key-value storage.'
        );
      }
      await AsyncStorage.setItem(key, serialized);
    },

    async delete(key: string): Promise<void> {
      await AsyncStorage.removeItem(key);
    },

    async list(): Promise<string[]> {
      const keys = await AsyncStorage.getAllKeys();
      return [...keys];
    },
  };
}
