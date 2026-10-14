import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { COUNTRY_CODES } from "@/modules/beers/beers.constants";
import { CreateBeerDto } from "@/modules/beers/dtos/create-beer.dto";

const VALID_BODY = { name: "Brune du Mont", breweryName: "Brasserie du Mont", country: "FR", styleId: 7, abv: 6.5 };

const validateBody = async (body: Record<string, unknown>) => {
  const dto = plainToInstance(CreateBeerDto, body);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return { dto, messages: errors.flatMap((error) => Object.values(error.constraints ?? {})) };
};

const rejected = async (overrides: Record<string, unknown>): Promise<boolean> =>
  (await validateBody({ ...VALID_BODY, ...overrides })).messages.length > 0;

describe("CreateBeerDto", () => {
  it("accepts a complete valid body without description", async () => {
    expect((await validateBody(VALID_BODY)).messages).toEqual([]);
  });

  it("accepts a description", async () => {
    expect((await validateBody({ ...VALID_BODY, description: "Une brune." })).messages).toEqual([]);
  });

  it.each(["name", "breweryName", "country", "styleId", "abv"])("rejects a missing %s", async (field) => {
    const body = Object.fromEntries(Object.entries(VALID_BODY).filter(([key]) => key !== field));

    expect((await validateBody(body)).messages.length).toBeGreaterThan(0);
  });

  it("accepts a name of 80 characters and rejects 81", async () => {
    expect(await rejected({ name: "a".repeat(80) })).toBe(false);
    expect(await rejected({ name: "a".repeat(81) })).toBe(true);
  });

  it("accepts a name of 2 characters and rejects 1 and none", async () => {
    expect(await rejected({ name: "ab" })).toBe(false);
    expect(await rejected({ name: "a" })).toBe(true);
    expect(await rejected({ name: "" })).toBe(true);
  });

  it("rejects a name made of spaces and line breaks only", async () => {
    expect(await rejected({ name: "   \n \t " })).toBe(true);
  });

  it("cleans the name to one line with single spaces and trimmed edges", async () => {
    const { dto, messages } = await validateBody({ ...VALID_BODY, name: "  Brune \r\n du\n\n  Mont  " });

    expect(messages).toEqual([]);
    expect(dto.name).toBe("Brune du Mont");
  });

  it("counts the length of the name after the cleaning", async () => {
    expect(await rejected({ name: `  ${"a".repeat(80)}  ` })).toBe(false);
    expect(await rejected({ name: `  ${"a".repeat(81)}  ` })).toBe(true);
    expect(await rejected({ name: `${"a".repeat(40)}\n\n\n${"b".repeat(39)}` })).toBe(false);
    expect(await rejected({ name: ` a ` })).toBe(true);
  });

  it("accepts a brewery name of 60 characters and rejects 61", async () => {
    expect(await rejected({ breweryName: "a".repeat(60) })).toBe(false);
    expect(await rejected({ breweryName: "a".repeat(61) })).toBe(true);
  });

  it("accepts a brewery name of 2 characters and rejects 1", async () => {
    expect(await rejected({ breweryName: "ab" })).toBe(false);
    expect(await rejected({ breweryName: "a" })).toBe(true);
  });

  it("cleans the brewery name like the name", async () => {
    const { dto, messages } = await validateBody({ ...VALID_BODY, breweryName: "\n Brasserie   du\r\nMont " });

    expect(messages).toEqual([]);
    expect(dto.breweryName).toBe("Brasserie du Mont");
    expect(await rejected({ breweryName: `  ${"a".repeat(61)}  ` })).toBe(true);
    expect(await rejected({ breweryName: "   " })).toBe(true);
  });

  it.each([["name"], ["breweryName"]])("rejects a %s that is not a string", async (field) => {
    expect(await rejected({ [field]: 12 })).toBe(true);
  });

  it("accepts every ISO country code and rejects other values", async () => {
    expect(COUNTRY_CODES.length).toBeGreaterThan(0);
    for (const country of COUNTRY_CODES) {
      expect(await rejected({ country })).toBe(false);
    }
    for (const country of ["XX", "UK", "fr", "FRA", "", 33]) {
      expect(await rejected({ country })).toBe(true);
    }
  });

  it("accepts a style id of 1 and rejects 0, -1, 1.5 and a string", async () => {
    expect(await rejected({ styleId: 1 })).toBe(false);
    for (const styleId of [0, -1, 1.5, "1"]) {
      expect(await rejected({ styleId })).toBe(true);
    }
  });

  it.each([0, 0.1, 6.5, 19.9, 20])("accepts the degree %s", async (abv) => {
    expect(await rejected({ abv })).toBe(false);
  });

  it.each([20.1, 21, -1, -0.1, 6.55, 6.05, "6.5"])("rejects the degree %s", async (abv) => {
    expect(await rejected({ abv })).toBe(true);
  });

  it("accepts a description of 500 characters and rejects 501", async () => {
    expect(await rejected({ description: "a".repeat(500) })).toBe(false);
    expect(await rejected({ description: "a".repeat(501) })).toBe(true);
  });

  it("normalizes the line endings and trims the description before the length check", async () => {
    const accepted = await validateBody({ ...VALID_BODY, description: `  ${"a".repeat(249)}\r\n${"b".repeat(250)}  ` });

    expect(accepted.messages).toEqual([]);
    expect(accepted.dto.description).toBe(`${"a".repeat(249)}\n${"b".repeat(250)}`);
    expect(await rejected({ description: ` ${"a".repeat(501)} ` })).toBe(true);
  });

  it("rejects a description that is not a string", async () => {
    expect(await rejected({ description: 12 })).toBe(true);
  });

  it("rejects an unknown field", async () => {
    expect(await rejected({ createdBy: 2 })).toBe(true);
    expect(await rejected({ source: "official" })).toBe(true);
  });
});
