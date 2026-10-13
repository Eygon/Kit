import { createMemoryKeyValueStorage } from "@/__tests__/utils/memoryKeyValueStorage";
import { StorageKeyEnum } from "@/types/enums/storage/storageKeyEnum";
import { DemoUserIdEnum } from "@/types/enums/user/demoUserIdEnum";
import { getCurrentUserId } from "@/utils/currentUser/getCurrentUserId";

describe("getCurrentUserId", () => {
  beforeEach(() => window.localStorage.clear());

  it("defaults to the first demo user when nothing is stored", () => {
    expect(getCurrentUserId(createMemoryKeyValueStorage())).toBe(DemoUserIdEnum.ALICE);
  });

  it("returns the stored demo user", () => {
    const storage = createMemoryKeyValueStorage({ [StorageKeyEnum.CURRENT_USER_ID]: "2" });

    expect(getCurrentUserId(storage)).toBe(DemoUserIdEnum.BOB);
  });

  it.each(["0", "4", "abc", ""])("falls back to the default for the stored value %s", (stored) => {
    const storage = createMemoryKeyValueStorage({ [StorageKeyEnum.CURRENT_USER_ID]: stored });

    expect(getCurrentUserId(storage)).toBe(DemoUserIdEnum.ALICE);
  });

  it("reads localStorage by default", () => {
    window.localStorage.setItem(StorageKeyEnum.CURRENT_USER_ID, "3");

    expect(getCurrentUserId()).toBe(DemoUserIdEnum.CAROL);
  });
});
