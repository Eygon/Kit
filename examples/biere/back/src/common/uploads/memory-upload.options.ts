import type { MulterModuleOptions } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { UPLOAD_MAX_FILES, UPLOAD_MAX_SIZE_BYTES } from "@/common/uploads/upload.constants";

export const MEMORY_UPLOAD_OPTIONS: Readonly<MulterModuleOptions> = {
  storage: memoryStorage(),
  limits: { fileSize: UPLOAD_MAX_SIZE_BYTES, files: UPLOAD_MAX_FILES },
};
