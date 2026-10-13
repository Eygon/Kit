import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import type { BeerStyleGroupDto } from "@/modules/beers/dtos/beer-style-group.dto";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";

const BEER_STYLES_PATH = "/api/v1/beer-styles";
const SEEDED_STYLE_COUNT = 34;
const TRAPPIST_STYLE_NAMES = ["Dubbel trappiste", "Quadrupel trappiste", "Trappiste blonde", "Tripel trappiste"];

describe("beer styles API", () => {
  let app: INestApplication;
  let groups: BeerStyleGroupDto[];

  beforeAll(async () => {
    app = await createTestApp();
    const response = await request(app.getHttpServer()).get(BEER_STYLES_PATH).set(USER_ID_HEADER_NAME, "1");
    expect(response.status).toBe(HttpStatus.OK);
    groups = response.body as BeerStyleGroupDto[];
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/v1/beer-styles returns the 18 families in the enum order, lager first", () => {
    expect(groups).toHaveLength(Object.values(BeerFamilyEnum).length);
    expect(groups.map((group) => group.family)).toEqual(Object.values(BeerFamilyEnum));
    expect(groups[0]?.family).toBe(BeerFamilyEnum.LAGER);
  });

  it("returns the 34 seeded styles, each with exactly an id, a name and a description", () => {
    const styles = groups.flatMap((group) => group.styles);

    expect(styles).toHaveLength(SEEDED_STYLE_COUNT);
    styles.forEach((style) => {
      expect(Object.keys(style).sort()).toEqual(["description", "id", "name"]);
      expect(style.name.length).toBeGreaterThan(0);
      expect(style.description.length).toBeGreaterThan(0);
    });
    expect(new Set(styles.map((style) => style.id)).size).toBe(SEEDED_STYLE_COUNT);
  });

  it("puts Dubbel, Quadrupel, Trappiste blonde and Tripel in the trappist group, sorted by name", () => {
    const trappist = groups.find((group) => group.family === BeerFamilyEnum.TRAPPIST);

    expect(trappist?.styles.map((style) => style.name)).toEqual(TRAPPIST_STYLE_NAMES);
  });

  it("sorts the styles of every group by name", () => {
    groups.forEach((group) => {
      const names = group.styles.map((style) => style.name);
      expect(names).toEqual([...names].sort());
    });
  });

  it("GET /api/v1/beer-styles returns 401 without the header", async () => {
    const response = await request(app.getHttpServer()).get(BEER_STYLES_PATH);

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });
});
