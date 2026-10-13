import type { PhotoContentTypeEnum } from "@/modules/tastings/enums/photo-content-type.enum";

export interface PhotoContentDto {
  readonly contentType: PhotoContentTypeEnum;
  readonly content: Buffer;
}
