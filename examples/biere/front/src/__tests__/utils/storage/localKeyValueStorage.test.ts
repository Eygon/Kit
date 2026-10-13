import { StorageKeyEnum } from "@/types/enums/storage/storageKeyEnum";
import { localKeyValueStorage } from "@/utils/storage/localKeyValueStorage";

describe("localKeyValueStorage", () => {
  beforeEach(() => window.localStorage.clear());

  afterEach(() => vi.restoreAllMocks());

  it("writes, reads and removes a value in localStorage", () => {
    localKeyValueStorage.set(StorageKeyEnum.CURRENT_USER_ID, "2");

    expect(window.localStorage.getItem(StorageKeyEnum.CURRENT_USER_ID)).toBe("2");
    expect(localKeyValueStorage.get(StorageKeyEnum.CURRENT_USER_ID)).toBe("2");

    localKeyValueStorage.remove(StorageKeyEnum.CURRENT_USER_ID);

    expect(localKeyValueStorage.get(StorageKeyEnum.CURRENT_USER_ID)).toBeNull();
  });

  it("degrades silently when the browser blocks storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(localKeyValueStorage.get(StorageKeyEnum.CURRENT_USER_ID)).toBeNull();
    expect(() => localKeyValueStorage.set(StorageKeyEnum.CURRENT_USER_ID, "2")).not.toThrow();
    expect(() => localKeyValueStorage.remove(StorageKeyEnum.CURRENT_USER_ID)).not.toThrow();
  });
});
