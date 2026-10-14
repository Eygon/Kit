import type { SaveCollectionDto } from "@/types/dtos/collection/saveCollectionDto";

export const buildSaveCollectionDto = (name: string): SaveCollectionDto => ({
  name: name.trim(),
});
