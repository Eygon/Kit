import { HttpStatus, ParseUUIDPipe, StreamableFile } from "@nestjs/common";
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA, ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IS_PUBLIC_KEY } from "@/common/security/security.constants";
import { PhotosController } from "@/modules/pokedex/photos.controller";
import { PokedexService } from "@/modules/pokedex/pokedex.service";
import type { PhotoContentDto } from "@/modules/tastings/dtos/photo-content.dto";
import { PhotoContentTypeEnum } from "@/modules/tastings/enums/photo-content-type.enum";

const PHOTO_ID = "3f2b8c1e-5d4a-4e6b-9a7c-1d2e3f4a5b6c";
const PHOTO: PhotoContentDto = { contentType: PhotoContentTypeEnum.PNG, content: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x01]) };

const readAll = async (file: StreamableFile): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of file.getStream()) {
    chunks.push(Buffer.from(chunk as Buffer));
  }
  return Buffer.concat(chunks);
};

describe("PhotosController", () => {
  const service = { getPhoto: vi.fn() };

  const buildController = async (): Promise<PhotosController> => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PhotosController],
      providers: [{ provide: PokedexService, useValue: service }],
    }).compile();
    return moduleRef.get(PhotosController);
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("streams the bytes of the photo with its content type", async () => {
    service.getPhoto.mockResolvedValue(PHOTO);
    const controller = await buildController();

    const file: StreamableFile = await controller.getOne(PHOTO_ID);

    expect(file).toBeInstanceOf(StreamableFile);
    expect(file.getHeaders().type).toBe(PhotoContentTypeEnum.PNG);
    expect(await readAll(file)).toEqual(PHOTO.content);
    expect(service.getPhoto).toHaveBeenCalledExactlyOnceWith(PHOTO_ID);
  });

  it("lets the error of the service through", async () => {
    service.getPhoto.mockRejectedValue(new Error("boom"));
    const controller = await buildController();

    await expect(controller.getOne(PHOTO_ID)).rejects.toThrow("boom");
  });

  it("is a public GET route on photos/:id answering 200", async () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, PhotosController)).toBe(true);
    expect(Reflect.getMetadata(PATH_METADATA, PhotosController)).toBe("photos");
    expect(Reflect.getMetadata(PATH_METADATA, PhotosController.prototype.getOne)).toBe(":id");
    expect(Reflect.getMetadata(METHOD_METADATA, PhotosController.prototype.getOne)).toBe(0);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, PhotosController.prototype.getOne)).toBe(HttpStatus.OK);
  });

  it("binds the id through a ParseUUIDPipe of version 4", async () => {
    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, PhotosController, "getOne") as Record<string, { data: string; pipes: unknown[] }>;
    const bindings = Object.values(args);

    expect(bindings).toHaveLength(1);
    expect(bindings[0].data).toBe("id");
    expect(bindings[0].pipes).toHaveLength(1);
    expect(bindings[0].pipes[0]).toBeInstanceOf(ParseUUIDPipe);
    expect((bindings[0].pipes[0] as unknown as { version: string }).version).toBe("4");
  });
});
