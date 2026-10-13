import type { StorageKeyEnum } from "@/types/enums/storage/storageKeyEnum";

export interface KeyValueStorage {
  get: (key: StorageKeyEnum) => string | null;
  set: (key: StorageKeyEnum, value: string) => void;
  remove: (key: StorageKeyEnum) => void;
}
