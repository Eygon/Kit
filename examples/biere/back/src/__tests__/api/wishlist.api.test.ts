import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import { ALICE_USER_ID, BOB_USER_ID } from "@/database/seed.constants";
import type { BeerPageDto } from "@/modules/beers/dtos/beer-page.dto";
import type { WishlistItemDto } from "@/modules/pokedex/dtos/wishlist-item.dto";

const WISHLIST_PATH = "/api/v1/me/wishlist";
const BEERS_PATH = "/api/v1/beers";
const CHECKINS_PATH = "/api/v1/checkins";
const UNKNOWN_BEER_ID = 999_999;
const UNKNOWN_USER_ID = 99;
const PAST_DATE = "2026-03-14T17:00:00.000Z";

describe("wishlist API", () => {
  let app: INestApplication;
  let orvalId: number;
  let duvelId: number;

  const findBeerId = async (name: string): Promise<number> => {
    const response = await request(app.getHttpServer())
      .get(BEERS_PATH)
      .query({ q: name })
      .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));
    expect(response.status).toBe(HttpStatus.OK);
    const page = response.body as BeerPageDto;
    const beer = page.items.find((item) => item.name === name);
    if (beer === undefined) {
      throw new Error(`${name} is not seeded`);
    }
    return beer.id;
  };

  const list = (userId: number): request.Test =>
    request(app.getHttpServer()).get(WISHLIST_PATH).set(USER_ID_HEADER_NAME, String(userId));

  const add = (userId: number, body: object): request.Test =>
    request(app.getHttpServer()).post(WISHLIST_PATH).set(USER_ID_HEADER_NAME, String(userId)).send(body);

  const remove = (userId: number, beerId: number | string): request.Test =>
    request(app.getHttpServer()).delete(`${WISHLIST_PATH}/${beerId}`).set(USER_ID_HEADER_NAME, String(userId));

  const listedNames = async (userId: number): Promise<string[]> => {
    const response = await list(userId);
    expect(response.status).toBe(HttpStatus.OK);
    return (response.body as WishlistItemDto[]).map((item) => item.beerName);
  };

  beforeAll(async () => {
    app = await createTestApp();
    orvalId = await findBeerId("Orval");
    duvelId = await findBeerId("Duvel");
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ["GET", () => request(app.getHttpServer()).get(WISHLIST_PATH)],
    ["POST", () => request(app.getHttpServer()).post(WISHLIST_PATH).send({ beerId: 1 })],
    ["DELETE", () => request(app.getHttpServer()).delete(`${WISHLIST_PATH}/1`)],
  ])("answers 401 to %s without the user header", async (_method, build) => {
    const response = await build();

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("answers 401 to a well-formed user id that matches no user", async () => {
    const response = await list(UNKNOWN_USER_ID);

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("answers an empty array for a user with an empty wishlist", async () => {
    const response = await list(ALICE_USER_ID);

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual([]);
  });

  it("adds Orval to the empty wishlist and answers 201 with the item", async () => {
    const before = Date.now();

    const response = await add(ALICE_USER_ID, { beerId: orvalId });

    expect(response.status).toBe(HttpStatus.CREATED);
    expect(response.body).toEqual({ beerId: orvalId, beerName: "Orval", addedAt: expect.any(String) });
    const addedAt = (response.body as WishlistItemDto).addedAt;
    expect(new Date(addedAt).toISOString()).toBe(addedAt);
    expect(Date.parse(addedAt)).toBeGreaterThan(before - 2 * 60_000);
    expect(await listedNames(ALICE_USER_ID)).toEqual(["Orval"]);
  });

  it("answers 409 and keeps a single item when Orval is added again", async () => {
    const response = await add(ALICE_USER_ID, { beerId: orvalId });

    expect(response.status).toBe(HttpStatus.CONFLICT);
    expect(response.body).toEqual({ message: `Beer ${orvalId} is already in the wishlist.` });
    expect(await listedNames(ALICE_USER_ID)).toEqual(["Orval"]);
  });

  it("answers 404 for an unknown beer and adds nothing", async () => {
    const response = await add(ALICE_USER_ID, { beerId: UNKNOWN_BEER_ID });

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body).toEqual({ message: `Beer ${UNKNOWN_BEER_ID} not found.` });
    expect(await listedNames(ALICE_USER_ID)).toEqual(["Orval"]);
  });

  it.each([
    ["a body without beer", {}],
    ["a beer id of 0", { beerId: 0 }],
    ["a negative beer id", { beerId: -1 }],
    ["a fractional beer id", { beerId: 1.5 }],
    ["a textual beer id", { beerId: "abc" }],
  ])("answers 400 for %s and adds nothing", async (_label, body) => {
    const response = await add(ALICE_USER_ID, body);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect((response.body as { message: string }).message).not.toBe("");
    expect(await listedNames(ALICE_USER_ID)).toEqual(["Orval"]);
  });

  it("lists Duvel before Orval once both are added, and leaves the list of Bob empty", async () => {
    const added = await add(ALICE_USER_ID, { beerId: duvelId });
    expect(added.status).toBe(HttpStatus.CREATED);

    expect(await listedNames(ALICE_USER_ID)).toEqual(["Duvel", "Orval"]);
    const bobResponse = await list(BOB_USER_ID);
    expect(bobResponse.status).toBe(HttpStatus.OK);
    expect(bobResponse.body).toEqual([]);
  });

  it("answers 404 when Bob removes a beer that only Alice listed, and keeps her list", async () => {
    const response = await remove(BOB_USER_ID, orvalId);

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body).toEqual({ message: `Beer ${orvalId} is not in the wishlist.` });
    expect(await listedNames(ALICE_USER_ID)).toEqual(["Duvel", "Orval"]);
  });

  it("answers 400 for a beer id in the path that is not an integer", async () => {
    const response = await remove(ALICE_USER_ID, "abc");

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect((response.body as { message: string }).message).not.toBe("");
  });

  it("removes Orval with 204 and an empty body, then answers 404 on the second removal", async () => {
    const first = await remove(ALICE_USER_ID, orvalId);

    expect(first.status).toBe(HttpStatus.NO_CONTENT);
    expect(first.body).toEqual({});
    expect(await listedNames(ALICE_USER_ID)).toEqual(["Duvel"]);

    const second = await remove(ALICE_USER_ID, orvalId);

    expect(second.status).toBe(HttpStatus.NOT_FOUND);
    expect(second.body).toEqual({ message: `Beer ${orvalId} is not in the wishlist.` });
  });

  it("keeps Orval in the wishlist when Alice records a tasting of Orval", async () => {
    const added = await add(ALICE_USER_ID, { beerId: orvalId });
    expect(added.status).toBe(HttpStatus.CREATED);

    const checkin = await request(app.getHttpServer())
      .post(CHECKINS_PATH)
      .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID))
      .field("beerId", String(orvalId))
      .field("drankAt", PAST_DATE)
      .field("place", "Le Bistrot")
      .field("format", "bottle");
    expect(checkin.status).toBe(HttpStatus.CREATED);

    expect(await listedNames(ALICE_USER_ID)).toEqual(["Orval", "Duvel"]);
  });
});
