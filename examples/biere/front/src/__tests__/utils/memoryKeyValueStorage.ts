import type { StorageKeyEnum } from "@/types/enums/storage/storageKeyEnum";
import type { KeyValueStorage } from "@/types/storage/keyValueStorage";

export const createMemoryKeyValueStorage = (initial: Partial<Record<StorageKeyEnum, string>> = {}): KeyValueStorage => {
  const values = new Map<string, string>(Object.entries(initial));
  return {
    get: (key) => values.get(key) ?? null,
    set: (key, value) => {
      values.set(key, value);
    },
    remove: (key) => {
      values.delete(key);
    },
  };
};
