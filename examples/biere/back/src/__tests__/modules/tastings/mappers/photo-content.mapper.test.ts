import { describe, expect, it } from "vitest";
import { PhotoContentTypeEnum } from "@/modules/tastings/enums/photo-content-type.enum";
import { toPhotoContentDto } from "@/modules/tastings/mappers/photo-content.mapper";

describe("toPhotoContentDto", () => {
  it("keeps only the content type and the exact bytes, dropping the id", () => {
    const content = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x80]);

    const dto = toPhotoContentDto({ id: "3f2b8c1e-5d4a-4e6b-9a7c-1d2e3f4a5b6c", contentType: PhotoContentTypeEnum.JPEG, content });

    expect(dto).toStrictEqual({ contentType: PhotoContentTypeEnum.JPEG, content });
    expect(Buffer.compare(dto.content, content)).toBe(0);
  });
});
