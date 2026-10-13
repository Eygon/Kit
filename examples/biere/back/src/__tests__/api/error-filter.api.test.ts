import {
  BadRequestException,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Module,
  NotFoundException,
} from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";
import { INTERNAL_ERROR_MESSAGE } from "@/common/exceptions/exception-messages.constants";

@Controller("failures")
class FailureController {
  @Get("bad-request")
  @HttpCode(HttpStatus.OK)
  badRequest(): never {
    throw new BadRequestException("The name is required.");
  }

  @Get("forbidden")
  @HttpCode(HttpStatus.OK)
  forbidden(): never {
    throw new ForbiddenException("You cannot edit this entry.");
  }

  @Get("not-found")
  @HttpCode(HttpStatus.OK)
  notFound(): never {
    throw new NotFoundException("Beer 7 not found.");
  }

  @Get("conflict")
  @HttpCode(HttpStatus.OK)
  conflict(): never {
    throw new ConflictException("This beer already exists.");
  }

  @Get("crash")
  @HttpCode(HttpStatus.OK)
  crash(): never {
    throw new Error("database password leaked in a stack trace");
  }
}

@Module({ controllers: [FailureController] })
class FailureModule {}

describe("HttpExceptionFilter", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp([FailureModule]);
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (path: string) => request(app.getHttpServer()).get(path).set(USER_ID_HEADER_NAME, "1");

  it.each([
    ["bad-request", HttpStatus.BAD_REQUEST, "The name is required."],
    ["forbidden", HttpStatus.FORBIDDEN, "You cannot edit this entry."],
    ["not-found", HttpStatus.NOT_FOUND, "Beer 7 not found."],
    ["conflict", HttpStatus.CONFLICT, "This beer already exists."],
  ])("maps %s to %i with a { message } body", async (path, status, message) => {
    const response = await get(`/api/v1/failures/${path}`);

    expect(response.status).toBe(status);
    expect(response.body).toEqual({ message });
  });

  it("hides the message of an unexpected error behind a 500", async () => {
    const response = await get("/api/v1/failures/crash");

    expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.body).toEqual({ message: INTERNAL_ERROR_MESSAGE });
  });

  it("answers an unknown route with a 404 { message } body", async () => {
    const response = await get("/api/v1/unknown");

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body).toEqual({ message: "Cannot GET /api/v1/unknown" });
  });

  it("answers a malformed JSON body with a 400 { message } body", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/failures")
      .set(USER_ID_HEADER_NAME, "1")
      .set("Content-Type", "application/json")
      .send("{bad");

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(typeof response.body.message).toBe("string");
  });
});
