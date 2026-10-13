import { createMemoryKeyValueStorage } from "@/__tests__/utils/memoryKeyValueStorage";
import { StorageKeyEnum } from "@/types/enums/storage/storageKeyEnum";
import { DemoUserIdEnum } from "@/types/enums/user/demoUserIdEnum";
import { setCurrentUserId } from "@/utils/currentUser/setCurrentUserId";

describe("setCurrentUserId", () => {
  beforeEach(() => window.localStorage.clear());

  it("stores the user id as a string", () => {
    const storage = createMemoryKeyValueStorage();

    setCurrentUserId(DemoUserIdEnum.CAROL, storage);

    expect(storage.get(StorageKeyEnum.CURRENT_USER_ID)).toBe("3");
  });

  it("writes to localStorage by default", () => {
    setCurrentUserId(DemoUserIdEnum.BOB);

    expect(window.localStorage.getItem(StorageKeyEnum.CURRENT_USER_ID)).toBe("2");
  });
});
