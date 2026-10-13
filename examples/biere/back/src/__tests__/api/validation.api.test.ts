import { Body, Controller, HttpCode, HttpStatus, NotFoundException, Param, ParseIntPipe, Post, Module } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from "class-validator";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";

const PROBE_NAME_MAX_LENGTH = 10;
const KNOWN_PROBE_ID = 1;

class CreateProbeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(PROBE_NAME_MAX_LENGTH)
  readonly name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  readonly rating?: number;
}

@Controller("probes")
class ProbeController {
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateProbeDto): CreateProbeDto {
    return dto;
  }

  @Post(":id")
  @HttpCode(HttpStatus.OK)
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: CreateProbeDto): CreateProbeDto {
    if (id !== KNOWN_PROBE_ID) {
      throw new NotFoundException(`Probe ${id} not found.`);
    }
    return dto;
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

describe("global ValidationPipe", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp([ProbeModule]);
  });

  afterAll(async () => {
    await app.close();
  });

  const post = (path: string, body: object) =>
    request(app.getHttpServer()).post(path).set(USER_ID_HEADER_NAME, "1").send(body);

  it("accepts a valid body and keeps the declared fields", async () => {
    const response = await post("/api/v1/probes", { name: "Stout", rating: 4 });

    expect(response.status).toBe(HttpStatus.CREATED);
    expect(response.body).toEqual({ name: "Stout", rating: 4 });
  });

  it("returns 400 with a single message string when a field is invalid", async () => {
    const response = await post("/api/v1/probes", { name: "", rating: 0 });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body).toEqual({
      message: "name should not be empty; rating must not be less than 1",
    });
  });

  it("returns 400 when a required field is missing", async () => {
    const response = await post("/api/v1/probes", {});

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(typeof response.body.message).toBe("string");
    expect(response.body.message).toContain("name must be a string");
  });

  it("rejects a non whitelisted property (forbidNonWhitelisted)", async () => {
    const response = await post("/api/v1/probes", { name: "Stout", ownerId: 2 });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body).toEqual({ message: "property ownerId should not exist" });
  });

  it("checks identity (401) before validation (400)", async () => {
    const response = await request(app.getHttpServer()).post("/api/v1/probes").send({ name: "" });

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("checks validation (400) before existence (404)", async () => {
    const response = await post("/api/v1/probes/99", { name: "" });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it("reaches the existence check (404) once the body is valid", async () => {
    const response = await post("/api/v1/probes/99", { name: "Stout" });

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body).toEqual({ message: "Probe 99 not found." });
  });

  it("returns 400 when a route id is not numeric", async () => {
    const response = await post("/api/v1/probes/abc", { name: "Stout" });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body).toEqual({ message: "Validation failed (numeric string is expected)" });
  });
});
