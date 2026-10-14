import { StorageKeyEnum } from "@/types/enums/storage/storageKeyEnum";

describe("StorageKeyEnum", () => {
  it("namespaces every key under mousse", () => {
    Object.values(StorageKeyEnum).forEach((key) => expect(key).toMatch(/^mousse\./));
  });

  it("stores the language under mousse.language", () => {
    expect(StorageKeyEnum.LANGUAGE).toBe("mousse.language");
  });
});
