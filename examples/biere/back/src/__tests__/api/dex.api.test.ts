import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import { ALICE_USER_ID, BOB_USER_ID } from "@/database/seed.constants";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import type { BeerPageDto } from "@/modules/beers/dtos/beer-page.dto";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import type { CreatedCheckinDto } from "@/modules/pokedex/dtos/created-checkin.dto";
import type { DexDto } from "@/modules/pokedex/dtos/dex.dto";

const DEX_PATH = "/api/v1/me/dex";
const BEERS_PATH = "/api/v1/beers";
const CHECKINS_PATH = "/api/v1/checkins";
const UNKNOWN_USER_ID = 99;
const CATALOG_SIZE = 120;
const TRAPPIST_TOTAL = 11;
const ORVAL_FIRST_DATE = "2025-10-01T18:00:00.000Z";
const ORVAL_LAST_DATE = "2025-10-10T18:00:00.000Z";
const DUVEL_DATE = "2025-10-05T18:00:00.000Z";

describe("dex API", () => {
  let app: INestApplication;
  let orval: BeerDto;
  let duvel: BeerDto;

  const findBeer = async (name: string): Promise<BeerDto> => {
    const response = await request(app.getHttpServer())
      .get(BEERS_PATH)
      .query({ q: name })
      .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));
    expect(response.status).toBe(HttpStatus.OK);
    const beer = (response.body as BeerPageDto).items.find((item) => item.name === name);
    if (beer === undefined) {
      throw new Error(`${name} is not seeded`);
    }
    return beer;
  };

  const drink = async (userId: number, beerId: number, drankAt: string): Promise<number> => {
    const response = await request(app.getHttpServer())
      .post(CHECKINS_PATH)
      .set(USER_ID_HEADER_NAME, String(userId))
      .field("beerId", String(beerId))
      .field("drankAt", drankAt)
      .field("place", "Le Bistrot")
      .field("format", "bottle");
    expect(response.status).toBe(HttpStatus.CREATED);
    return (response.body as CreatedCheckinDto).checkin.id;
  };

  const removeCheckin = async (userId: number, id: number): Promise<void> => {
    const response = await request(app.getHttpServer())
      .delete(`${CHECKINS_PATH}/${id}`)
      .set(USER_ID_HEADER_NAME, String(userId));
    expect(response.status).toBe(HttpStatus.NO_CONTENT);
  };

  const readDex = async (userId: number): Promise<DexDto> => {
    const response = await request(app.getHttpServer()).get(DEX_PATH).set(USER_ID_HEADER_NAME, String(userId));
    expect(response.status).toBe(HttpStatus.OK);
    return response.body as DexDto;
  };

  const familiesWithDiscovery = (dex: DexDto): DexDto["families"] => dex.families.filter((family) => family.discovered > 0);

  beforeAll(async () => {
    app = await createTestApp();
    orval = await findBeer("Orval");
    duvel = await findBeer("Duvel");
  });

  afterAll(async () => {
    await app.close();
  });

  it("answers 401 without the user header", async () => {
    const response = await request(app.getHttpServer()).get(DEX_PATH);

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("answers 401 to a well-formed user id that matches no user", async () => {
    const response = await request(app.getHttpServer()).get(DEX_PATH).set(USER_ID_HEADER_NAME, String(UNKNOWN_USER_ID));

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("answers 0 of 120, the 18 families in the enum order and no beer to a user without any tasting", async () => {
    const dex = await readDex(BOB_USER_ID);

    expect(dex.discovered).toBe(0);
    expect(dex.total).toBe(CATALOG_SIZE);
    expect(dex.beers).toEqual([]);
    expect(dex.families.map((family) => family.family)).toEqual(Object.values(BeerFamilyEnum));
    expect(dex.families.every((family) => family.discovered === 0)).toBe(true);
    expect(dex.families.find((family) => family.family === BeerFamilyEnum.TRAPPIST)).toEqual({
      family: BeerFamilyEnum.TRAPPIST,
      discovered: 0,
      total: TRAPPIST_TOTAL,
    });
    expect(dex.families.reduce((sum, family) => sum + family.total, 0)).toBe(CATALOG_SIZE);
  });

  describe("Alice drinks Orval on 1 and 10 October and Duvel on 5 October", () => {
    let orvalLastCheckinId: number;
    let duvelCheckinId: number;

    beforeAll(async () => {
      orvalLastCheckinId = await drink(ALICE_USER_ID, orval.id, ORVAL_LAST_DATE);
      await drink(ALICE_USER_ID, orval.id, ORVAL_FIRST_DATE);
      duvelCheckinId = await drink(ALICE_USER_ID, duvel.id, DUVEL_DATE);
    });

    it("answers 2 of 120, trappist 1 of 11, and Duvel before Orval by descending first date", async () => {
      const dex = await readDex(ALICE_USER_ID);

      expect(dex.discovered).toBe(2);
      expect(dex.total).toBe(CATALOG_SIZE);
      expect(dex.families.find((family) => family.family === BeerFamilyEnum.TRAPPIST)).toEqual({
        family: BeerFamilyEnum.TRAPPIST,
        discovered: 1,
        total: TRAPPIST_TOTAL,
      });
      expect(familiesWithDiscovery(dex).map((family) => family.family)).toEqual(
        Object.values(BeerFamilyEnum).filter((family) => family === BeerFamilyEnum.TRAPPIST || family === duvel.family),
      );
      expect(dex.beers).toEqual([
        { beerId: duvel.id, firstCheckinAt: DUVEL_DATE, lastCheckinAt: DUVEL_DATE },
        { beerId: orval.id, firstCheckinAt: ORVAL_FIRST_DATE, lastCheckinAt: ORVAL_LAST_DATE },
      ]);
    });

    it("leaves the progression of another user untouched", async () => {
      const dex = await readDex(BOB_USER_ID);

      expect(dex.discovered).toBe(0);
      expect(dex.beers).toEqual([]);
    });

    it("keeps Orval discovered and moves its last date back when its latest check-in is deleted", async () => {
      await removeCheckin(ALICE_USER_ID, orvalLastCheckinId);

      const dex = await readDex(ALICE_USER_ID);

      expect(dex.discovered).toBe(2);
      expect(dex.beers.find((beer) => beer.beerId === orval.id)).toEqual({
        beerId: orval.id,
        firstCheckinAt: ORVAL_FIRST_DATE,
        lastCheckinAt: ORVAL_FIRST_DATE,
      });
    });

    it("no longer counts Duvel once its only check-in is deleted", async () => {
      await removeCheckin(ALICE_USER_ID, duvelCheckinId);

      const dex = await readDex(ALICE_USER_ID);

      expect(dex.discovered).toBe(1);
      expect(dex.beers.map((beer) => beer.beerId)).toEqual([orval.id]);
      expect(familiesWithDiscovery(dex).map((family) => family.family)).toEqual([BeerFamilyEnum.TRAPPIST]);
    });
  });
});
