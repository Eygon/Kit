import { Controller, HttpCode, HttpStatus, Module, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MEMORY_UPLOAD_OPTIONS } from "@/common/uploads/memory-upload.options";
import { UPLOAD_MAX_SIZE_BYTES } from "@/common/uploads/upload.constants";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";

@Controller("photos")
class PhotoProbeController {
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor("photo", MEMORY_UPLOAD_OPTIONS))
  upload(@UploadedFile() file: Express.Multer.File): { readonly size: number; readonly inMemory: boolean } {
    return { size: file.size, inMemory: Buffer.isBuffer(file.buffer) };
  }
}

@Module({ controllers: [PhotoProbeController] })
class PhotoProbeModule {}

describe("MEMORY_UPLOAD_OPTIONS", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp([PhotoProbeModule]);
  });

  afterAll(async () => {
    await app.close();
  });

  it("limits the file size and keeps files in memory", () => {
    expect(MEMORY_UPLOAD_OPTIONS.limits).toEqual({ fileSize: UPLOAD_MAX_SIZE_BYTES, files: 1 });
    expect(MEMORY_UPLOAD_OPTIONS.storage).toBeDefined();
  });

  it("keeps an accepted file in memory", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/photos")
      .set(USER_ID_HEADER_NAME, "1")
      .attach("photo", Buffer.alloc(1024), "beer.jpg");

    expect(response.status).toBe(HttpStatus.CREATED);
    expect(response.body).toEqual({ size: 1024, inMemory: true });
  });

  it("rejects a file above 5 MB with 413 and a { message } body", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/photos")
      .set(USER_ID_HEADER_NAME, "1")
      .attach("photo", Buffer.alloc(UPLOAD_MAX_SIZE_BYTES + 1), "huge.jpg");

    expect(response.status).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(response.body).toEqual({ message: "File too large" });
  });
});
