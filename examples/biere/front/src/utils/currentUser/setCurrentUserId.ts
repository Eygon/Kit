import type { DemoUserIdEnum } from "@/types/enums/user/demoUserIdEnum";
import { StorageKeyEnum } from "@/types/enums/storage/storageKeyEnum";
import type { KeyValueStorage } from "@/types/storage/keyValueStorage";
import { localKeyValueStorage } from "@/utils/storage/localKeyValueStorage";

export const setCurrentUserId = (userId: DemoUserIdEnum, storage: KeyValueStorage = localKeyValueStorage): void => {
  storage.set(StorageKeyEnum.CURRENT_USER_ID, userId.toString());
};
