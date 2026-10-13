import { describe, expect, it } from "vitest";
import { detectPhotoContentType, PhotoContentTypeEnum } from "@/modules/tastings/enums/photo-content-type.enum";

const JPEG_BYTES = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46];
const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d];
const RIFF = "RIFF";
const SIZE_FIELD = [0x24, 0x00, 0x00, 0x00];

const riffFile = (format: string): Buffer => Buffer.concat([Buffer.from(RIFF), Buffer.from(SIZE_FIELD), Buffer.from(format)]);

describe("photo content type", () => {
  it("declares the three accepted image types", () => {
    expect(PhotoContentTypeEnum.JPEG).toBe("image/jpeg");
    expect(PhotoContentTypeEnum.PNG).toBe("image/png");
    expect(PhotoContentTypeEnum.WEBP).toBe("image/webp");
    expect(Object.values(PhotoContentTypeEnum)).toHaveLength(3);
  });

  it("detects a jpeg from its signature", () => {
    expect(detectPhotoContentType(Buffer.from(JPEG_BYTES))).toBe(PhotoContentTypeEnum.JPEG);
  });

  it("detects a png from its signature", () => {
    expect(detectPhotoContentType(Buffer.from(PNG_BYTES))).toBe(PhotoContentTypeEnum.PNG);
  });

  it("detects a webp from its RIFF and WEBP markers", () => {
    expect(detectPhotoContentType(riffFile("WEBP"))).toBe(PhotoContentTypeEnum.WEBP);
  });

  it("detects nothing in a text file", () => {
    expect(detectPhotoContentType(Buffer.from("this is only text renamed photo.jpg"))).toBeNull();
  });

  it("detects nothing in an empty buffer", () => {
    expect(detectPhotoContentType(Buffer.alloc(0))).toBeNull();
  });

  it("detects nothing in a truncated webp", () => {
    expect(detectPhotoContentType(riffFile("WEBP").subarray(0, 11))).toBeNull();
  });

  it("detects nothing in a truncated png", () => {
    expect(detectPhotoContentType(Buffer.from(PNG_BYTES.slice(0, 7)))).toBeNull();
  });

  it("detects nothing in a RIFF container that is not a webp", () => {
    expect(detectPhotoContentType(riffFile("WAVE"))).toBeNull();
  });
});
