import { createAsyncStorageAdapter } from './asyncStorageAdapter';

export const storage = createAsyncStorageAdapter();

export type { StorageAdapter } from './types';
