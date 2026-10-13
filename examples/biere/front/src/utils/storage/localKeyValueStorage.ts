import type { KeyValueStorage } from "@/types/storage/keyValueStorage";

export const localKeyValueStorage: KeyValueStorage = {
  get: (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      return;
    }
  },
  remove: (key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      return;
    }
  },
};
