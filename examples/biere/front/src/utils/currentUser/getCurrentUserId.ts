import { DEFAULT_DEMO_USER_ID, isDemoUserId } from "@/types/enums/user/demoUserIdEnum";
import type { DemoUserIdEnum } from "@/types/enums/user/demoUserIdEnum";
import { StorageKeyEnum } from "@/types/enums/storage/storageKeyEnum";
import type { KeyValueStorage } from "@/types/storage/keyValueStorage";
import { localKeyValueStorage } from "@/utils/storage/localKeyValueStorage";

export const getCurrentUserId = (storage: KeyValueStorage = localKeyValueStorage): DemoUserIdEnum => {
  const storedId = Number(storage.get(StorageKeyEnum.CURRENT_USER_ID));
  return isDemoUserId(storedId) ? storedId : DEFAULT_DEMO_USER_ID;
};
