import type { Storage } from "./queue";

/** Storage key for the per-install random identifier (ADR 0001). */
export const INSTALLATION_ID_KEY = "@hindbrain/installation-id";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// ponytail: Math.random fallback when Hermes has no crypto.randomUUID; fine for an
// install identifier, not for secrets — switch to expo-crypto if one is ever needed here.
export function uuidV4(): string {
  const native = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID;
  if (native) return native.call((globalThis as { crypto: object }).crypto);
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function readOrCreate(storage: Storage): Promise<string> {
  const stored = await storage.getItem(INSTALLATION_ID_KEY).catch(() => null);
  if (stored && UUID_V4.test(stored)) return stored;
  const id = uuidV4();
  await storage.setItem(INSTALLATION_ID_KEY, id).catch(() => undefined);
  return id;
}

/**
 * Returns a getter for this installation's ID: a random UUID v4 persisted in `storage`,
 * created on first use. Concurrent calls share one read/write. Without persistent
 * storage the ID lasts only for the app session.
 */
export function createInstallationId(storage: Storage): () => Promise<string> {
  let pending: Promise<string> | null = null;
  return () => (pending ??= readOrCreate(storage));
}
