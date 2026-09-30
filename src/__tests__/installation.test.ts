import { createInstallationId, INSTALLATION_ID_KEY } from "../installation";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function memoryStorage(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial };
  const writes: string[] = [];
  return {
    store,
    writes,
    getItem: async (k: string) => store[k] ?? null,
    setItem: async (k: string, v: string) => { store[k] = v; writes.push(v); },
  };
}

test("generates a UUID v4 on first run and persists it", async () => {
  const storage = memoryStorage();
  const id = await createInstallationId(storage)();
  expect(id).toMatch(UUID_V4);
  expect(storage.store[INSTALLATION_ID_KEY]).toBe(id);
});

test("returns the stored id on later runs", async () => {
  const stored = "3f1d2c4e-0000-4000-8000-000000000a92";
  const storage = memoryStorage({ [INSTALLATION_ID_KEY]: stored });
  expect(await createInstallationId(storage)()).toBe(stored);
  expect(storage.writes).toHaveLength(0);
});

test("replaces a malformed stored value", async () => {
  const storage = memoryStorage({ [INSTALLATION_ID_KEY]: "ios-1.4.0-iPhone" });
  const id = await createInstallationId(storage)();
  expect(id).toMatch(UUID_V4);
  expect(storage.store[INSTALLATION_ID_KEY]).toBe(id);
});

test("concurrent callers share one id and one write", async () => {
  const storage = memoryStorage();
  const get = createInstallationId(storage);
  const [a, b, c] = await Promise.all([get(), get(), get()]);
  expect(a).toBe(b);
  expect(b).toBe(c);
  expect(storage.writes).toHaveLength(1);
});

test("two installations get different ids", async () => {
  const a = await createInstallationId(memoryStorage())();
  const b = await createInstallationId(memoryStorage())();
  expect(a).not.toBe(b);
});

test("a storage read failure still yields a usable id", async () => {
  const storage = { getItem: async () => { throw new Error("disk"); }, setItem: async () => {} };
  expect(await createInstallationId(storage)()).toMatch(UUID_V4);
});
