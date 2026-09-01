import type { StorageAdapter } from './types';
import { CURRENT_SCHEMA_VERSION, SCHEMA_VERSION_KEY } from './schema';

export interface Migration {
  version: number;
  migrate: (storage: StorageAdapter) => Promise<void>;
}

// Ordered by ascending version. Empty until the first schema change ships.
export const migrations: Migration[] = [];

export async function runMigrations(storage: StorageAdapter): Promise<void> {
  const storedVersion = (await storage.get<number>(SCHEMA_VERSION_KEY)) ?? 0;

  const pending = migrations
    .filter((migration) => migration.version > storedVersion)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    await migration.migrate(storage);
    await storage.set(SCHEMA_VERSION_KEY, migration.version);
  }

  // Fresh install with no migrations to run yet — stamp the current version.
  if (storedVersion === 0 && pending.length === 0) {
    await storage.set(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
  }
}
