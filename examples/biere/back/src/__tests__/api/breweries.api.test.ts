import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import breweriesSeed from "@/database/seed/data/breweries.json";
import type { BreweryDto } from "@/modules/beers/dtos/brewery.dto";

const BREWERIES_PATH = "/api/v1/breweries";

describe("breweries API", () => {
  let app: INestApplication;
  let breweries: BreweryDto[];

  beforeAll(async () => {
    app = await createTestApp();
    const response = await request(app.getHttpServer()).get(BREWERIES_PATH).set(USER_ID_HEADER_NAME, "1");
    expect(response.status).toBe(HttpStatus.OK);
    breweries = response.body as BreweryDto[];
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/v1/breweries lists every seeded brewery exactly once", () => {
    expect(breweries).toHaveLength(breweriesSeed.length);
    expect(new Set(breweries.map((brewery) => brewery.id)).size).toBe(breweriesSeed.length);
    expect(new Set(breweries.map((brewery) => brewery.name))).toEqual(new Set(breweriesSeed.map((brewery) => brewery.name)));
  });

  it("returns exactly an id, a name and a country for each brewery, with the seeded country", () => {
    const countryByName = new Map(breweriesSeed.map((brewery) => [brewery.name, brewery.country]));

    expect(breweries.length).toBeGreaterThan(0);
    breweries.forEach((brewery) => {
      expect(Object.keys(brewery).sort()).toEqual(["country", "id", "name"]);
      expect(brewery.country).toBe(countryByName.get(brewery.name));
    });
  });

  it("sorts the breweries by name ignoring the case", () => {
    const keys = breweries.map((brewery) => brewery.name.toLowerCase());

    expect(keys).toEqual([...keys].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0)));
  });

  it("GET /api/v1/breweries returns 401 without the header", async () => {
    const response = await request(app.getHttpServer()).get(BREWERIES_PATH);

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });
});
