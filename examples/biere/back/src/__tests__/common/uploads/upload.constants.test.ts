import { describe, expect, it } from "vitest";
import { UPLOAD_MAX_FILES, UPLOAD_MAX_SIZE_BYTES, UPLOAD_MAX_SIZE_MEGABYTES } from "@/common/uploads/upload.constants";

describe("upload constants", () => {
  it("caps an upload at a single 5 MB file", () => {
    expect(UPLOAD_MAX_SIZE_MEGABYTES).toBe(5);
    expect(UPLOAD_MAX_SIZE_BYTES).toBe(5 * 1024 * 1024);
    expect(UPLOAD_MAX_FILES).toBe(1);
  });
});
