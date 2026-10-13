import type { PhotoContentDto } from "@/modules/tastings/dtos/photo-content.dto";
import type { Photo } from "@/modules/tastings/entities/photo.entity";

export const toPhotoContentDto = (entity: Photo): PhotoContentDto => ({
  contentType: entity.contentType,
  content: entity.content,
});
