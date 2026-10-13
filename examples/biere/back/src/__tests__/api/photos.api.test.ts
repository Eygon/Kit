import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";
import { ALICE_USER_ID } from "@/database/seed.constants";
import type { BeerPageDto } from "@/modules/beers/dtos/beer-page.dto";
import type { CreatedCheckinDto } from "@/modules/pokedex/dtos/created-checkin.dto";

const PHOTOS_PATH = "/api/v1/photos";
const CHECKINS_PATH = "/api/v1/checkins";
const BEERS_PATH = "/api/v1/beers";
const UNKNOWN_USER_ID = 99;
const UNKNOWN_PHOTO_ID = "3f2b8c1e-5d4a-4e6b-9a7c-1d2e3f4a5b6c";
const UUID_V1 = "6fa459ea-ee8a-11ee-9f1f-0242ac120002";
const PNG_BUFFER = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("pixels"), Buffer.from([0x00, 0xff, 0x80])]);
const JPEG_BUFFER = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("scan"), Buffer.from([0x00, 0xff, 0x80, 0xff, 0xd9])]);
const WEBP_BUFFER = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0x24, 0x00, 0x00, 0x00]), Buffer.from("WEBP"), Buffer.from("VP8 ")]);

const binaryParser = (response: request.Response, callback: (error: Error | null, body: Buffer) => void): void => {
  const chunks: Buffer[] = [];
  response.on("data", (chunk: Buffer) => chunks.push(chunk));
  response.on("end", () => callback(null, Buffer.concat(chunks)));
};

describe("photos API", () => {
  let app: INestApplication;
  let pngPhotoId: string;
  let jpegPhotoId: string;
  let webpPhotoId: string;

  const findBeerId = async (name: string): Promise<number> => {
    const response = await request(app.getHttpServer())
      .get(BEERS_PATH)
      .query({ q: name })
      .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));
    expect(response.status).toBe(HttpStatus.OK);
    const beer = (response.body as BeerPageDto).items.find((item) => item.name === name);
    if (beer === undefined) {
      throw new Error(`${name} is not seeded`);
    }
    return beer.id;
  };

  const uploadPhoto = async (beerId: number, buffer: Buffer): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(CHECKINS_PATH)
      .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID))
      .field("beerId", String(beerId))
      .field("drankAt", "2026-03-14T17:00:00.000Z")
      .field("place", "Le Bistrot")
      .field("format", "bottle")
      .attach("file", buffer, { filename: "photo.bin", contentType: "application/octet-stream" });
    expect(response.status).toBe(HttpStatus.CREATED);
    const photoId = (response.body as CreatedCheckinDto).checkin.photoId;
    expect(photoId).not.toBeNull();
    return photoId as string;
  };

  const readPhoto = (id: string, userId?: number): request.Test => {
    const test = request(app.getHttpServer()).get(`${PHOTOS_PATH}/${id}`).buffer(true).parse(binaryParser);
    return userId === undefined ? test : test.set(USER_ID_HEADER_NAME, String(userId));
  };

  beforeAll(async () => {
    app = await createTestApp();
    const orvalId = await findBeerId("Orval");
    pngPhotoId = await uploadPhoto(orvalId, PNG_BUFFER);
    jpegPhotoId = await uploadPhoto(orvalId, JPEG_BUFFER);
    webpPhotoId = await uploadPhoto(orvalId, WEBP_BUFFER);
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves the exact bytes with the detected image type without any identity", async () => {
    const response = await readPhoto(pngPhotoId);

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.headers["content-type"]).toContain("image/png");
    expect(Buffer.compare(response.body as Buffer, PNG_BUFFER)).toBe(0);
  });

  it("serves a JPEG photo with the image/jpeg type and its exact bytes", async () => {
    const response = await readPhoto(jpegPhotoId);

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.headers["content-type"]).toContain("image/jpeg");
    expect(Buffer.compare(response.body as Buffer, JPEG_BUFFER)).toBe(0);
  });

  it("serves the type detected for each photo, not a fixed one", async () => {
    const response = await readPhoto(webpPhotoId);

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.headers["content-type"]).toContain("image/webp");
    expect(Buffer.compare(response.body as Buffer, WEBP_BUFFER)).toBe(0);
  });

  it("serves the photo to an unknown user id as well, the guard does not apply", async () => {
    const response = await readPhoto(pngPhotoId, UNKNOWN_USER_ID);

    expect(response.status).toBe(HttpStatus.OK);
    expect(Buffer.compare(response.body as Buffer, PNG_BUFFER)).toBe(0);
  });

  it("answers 404 for an unknown UUID", async () => {
    const response = await request(app.getHttpServer()).get(`${PHOTOS_PATH}/${UNKNOWN_PHOTO_ID}`);

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body).toEqual({ message: `Photo ${UNKNOWN_PHOTO_ID} not found.` });
  });

  it.each(["abc", "123", UUID_V1])("answers 400 for the identifier %s that is not a UUID v4", async (id) => {
    const response = await request(app.getHttpServer()).get(`${PHOTOS_PATH}/${id}`);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect((response.body as { message: string }).message).toContain("uuid");
  });
});
