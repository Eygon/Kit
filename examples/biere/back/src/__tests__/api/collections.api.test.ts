import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import request from "supertest";
import type { Repository } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import { ALICE_USER_ID, BOB_USER_ID, CAROL_USER_ID } from "@/database/seed.constants";
import { CollectionItem } from "@/modules/collections/entities/collection-item.entity";
import { Collection } from "@/modules/collections/entities/collection.entity";

const COLLECTIONS_PATH = "/api/v1/me/collections";
const UNKNOWN_USER_ID = 99;
const LIMIT_MESSAGE = "You cannot have more than 20 collections.";

describe("collections API", () => {
  let app: INestApplication;

  const create = (userId: number, body: object): request.Test =>
    request(app.getHttpServer()).post(COLLECTIONS_PATH).set(USER_ID_HEADER_NAME, String(userId)).send(body);

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("answers 401 without the user header", async () => {
    const response = await request(app.getHttpServer()).post(COLLECTIONS_PATH).send({ name: "Trappistes" });

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("answers 401 before 400 when the header is missing and the body is invalid", async () => {
    const response = await request(app.getHttpServer()).post(COLLECTIONS_PATH).send({ name: "" });

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("creates the trimmed collection of Alice with no beer", async () => {
    const response = await create(ALICE_USER_ID, { name: "  Trappistes  " });

    expect(response.status).toBe(HttpStatus.CREATED);
    expect(response.body).toEqual({ id: expect.any(Number), kind: "custom", name: "Trappistes", beerCount: 0 });
  });

  it("answers 409 for the same name in another case and for the same name between spaces", async () => {
    const lower = await create(ALICE_USER_ID, { name: "trappistes" });
    const spaced = await create(ALICE_USER_ID, { name: "  TRAPPISTES " });

    expect(lower.status).toBe(HttpStatus.CONFLICT);
    expect(lower.body).toEqual({ message: 'A collection named "trappistes" already exists.' });
    expect(spaced.status).toBe(HttpStatus.CONFLICT);
    expect(spaced.body).toEqual({ message: 'A collection named "TRAPPISTES" already exists.' });
  });

  it("answers 409 for the same accented name in another case", async () => {
    const first = await create(BOB_USER_ID, { name: "Été" });
    const second = await create(BOB_USER_ID, { name: "été" });

    expect(first.status).toBe(HttpStatus.CREATED);
    expect(second.status).toBe(HttpStatus.CONFLICT);
    expect(second.body).toEqual({ message: 'A collection named "été" already exists.' });
  });

  it("lets another user take a name already used by Alice", async () => {
    const response = await create(BOB_USER_ID, { name: "Trappistes" });

    expect(response.status).toBe(HttpStatus.CREATED);
    expect(response.body).toEqual({ id: expect.any(Number), kind: "custom", name: "Trappistes", beerCount: 0 });
  });

  it.each([
    ["an empty name", { name: "" }],
    ["a blank name", { name: "   " }],
    ["a name of 41 characters", { name: "a".repeat(41) }],
    ["a name of 41 characters between spaces", { name: ` ${"a".repeat(41)} ` }],
    ["a missing name", {}],
    ["a name that is not a string", { name: 12 }],
    ["an unknown field", { name: "Sours", userId: 2 }],
  ])("answers 400 for %s", async (_label, body) => {
    const response = await create(ALICE_USER_ID, body);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect((response.body as { message: string }).message).not.toBe("");
  });

  it.each([
    ["1 character", "b"],
    ["40 characters", "c".repeat(40)],
    ["40 characters between spaces", ` ${"d".repeat(40)} `],
  ])("accepts a name of %s", async (_label, name) => {
    const response = await create(ALICE_USER_ID, { name });

    expect(response.status).toBe(HttpStatus.CREATED);
    expect(response.body).toMatchObject({ name: name.trim(), beerCount: 0 });
  });

  it("answers 409 on the 21st collection, 400 before 409 and the limit before the name", async () => {
    for (let index = 1; index <= 20; index += 1) {
      const created = await create(CAROL_USER_ID, { name: `Collection ${index}` });
      expect(created.status).toBe(HttpStatus.CREATED);
    }

    const twentyFirst = await create(CAROL_USER_ID, { name: "Collection 21" });
    const invalid = await create(CAROL_USER_ID, { name: "" });
    const taken = await create(CAROL_USER_ID, { name: "collection 1" });

    expect(twentyFirst.status).toBe(HttpStatus.CONFLICT);
    expect(twentyFirst.body).toEqual({ message: LIMIT_MESSAGE });
    expect(invalid.status).toBe(HttpStatus.BAD_REQUEST);
    expect(taken.status).toBe(HttpStatus.CONFLICT);
    expect(taken.body).toEqual({ message: LIMIT_MESSAGE });
  });
});

describe("user collections API", () => {
  let app: INestApplication;

  const create = (userId: number, body: object): request.Test =>
    request(app.getHttpServer()).post(COLLECTIONS_PATH).set(USER_ID_HEADER_NAME, String(userId)).send(body);

  let firstBeerId: number;
  let secondBeerId: number;

  const read = (readerId: number, targetId: number | string): request.Test =>
    request(app.getHttpServer())
      .get(`/api/v1/users/${targetId}/collections`)
      .set(USER_ID_HEADER_NAME, String(readerId));

  beforeAll(async () => {
    app = await createTestApp();
    const beers = await request(app.getHttpServer())
      .get("/api/v1/beers")
      .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));
    expect(beers.status).toBe(HttpStatus.OK);
    const items = (beers.body as { items: { id: number }[] }).items;
    firstBeerId = items[0].id;
    secondBeerId = items[1].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("answers 401 without the user header", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/users/1/collections");

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("answers 400 for a user id that is not a number", async () => {
    const response = await read(ALICE_USER_ID, "abc");

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body).toEqual({ message: expect.any(String) });
    expect((response.body as { message: string }).message).not.toBe("");
  });

  it("lists the wishlist of Alice with its 2 beers, then her collection with 0", async () => {
    for (const beerId of [firstBeerId, secondBeerId]) {
      const added = await request(app.getHttpServer())
        .post("/api/v1/me/wishlist")
        .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID))
        .send({ beerId });
      expect(added.status).toBe(HttpStatus.CREATED);
    }
    const created = await create(ALICE_USER_ID, { name: "Trappistes" });
    expect(created.status).toBe(HttpStatus.CREATED);

    const response = await read(ALICE_USER_ID, ALICE_USER_ID);

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual([
      { id: null, kind: "wishlist", name: "", beerCount: 2 },
      { id: expect.any(Number), kind: "custom", name: "Trappistes", beerCount: 0 },
    ]);
  });

  it("answers 403 when Alice does not follow Bob", async () => {
    const response = await read(ALICE_USER_ID, BOB_USER_ID);

    expect(response.status).toBe(HttpStatus.FORBIDDEN);
    expect(response.body).toEqual({ message: "You must follow this user to see their collections." });
  });

  it("answers 404 before 403 for an unknown user", async () => {
    const response = await read(ALICE_USER_ID, UNKNOWN_USER_ID);

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body).toEqual({ message: `User ${UNKNOWN_USER_ID} not found.` });
  });

  it("answers 200 once Alice follows Bob, with the collections of Bob only", async () => {
    const bobCollection = await create(BOB_USER_ID, { name: "IPA" });
    expect(bobCollection.status).toBe(HttpStatus.CREATED);
    const followed = await request(app.getHttpServer())
      .post(`/api/v1/users/${BOB_USER_ID}/follow`)
      .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));
    expect(followed.status).toBe(HttpStatus.CREATED);

    const response = await read(ALICE_USER_ID, BOB_USER_ID);

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual([
      { id: null, kind: "wishlist", name: "", beerCount: 0 },
      { id: expect.any(Number), kind: "custom", name: "IPA", beerCount: 0 },
    ]);
  });

  it("does not let Bob read the collections of Alice, who does not follow him back", async () => {
    const response = await read(BOB_USER_ID, ALICE_USER_ID);

    expect(response.status).toBe(HttpStatus.FORBIDDEN);
  });
});

describe("collection rename and delete API", () => {
  let app: INestApplication;
  let items: Repository<CollectionItem>;
  let collections: Repository<Collection>;

  const create = async (userId: number, name: string): Promise<number> => {
    const response = await request(app.getHttpServer())
      .post(COLLECTIONS_PATH)
      .set(USER_ID_HEADER_NAME, String(userId))
      .send({ name });
    expect(response.status).toBe(HttpStatus.CREATED);
    return (response.body as { id: number }).id;
  };

  const rename = (userId: number, id: number | string, body: object): request.Test =>
    request(app.getHttpServer())
      .patch(`${COLLECTIONS_PATH}/${id}`)
      .set(USER_ID_HEADER_NAME, String(userId))
      .send(body);

  const remove = (userId: number, id: number | string): request.Test =>
    request(app.getHttpServer()).delete(`${COLLECTIONS_PATH}/${id}`).set(USER_ID_HEADER_NAME, String(userId));

  beforeAll(async () => {
    app = await createTestApp();
    items = app.get(getRepositoryToken(CollectionItem), { strict: false });
    collections = app.get(getRepositoryToken(Collection), { strict: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it("answers 401 without the user header on PATCH and DELETE", async () => {
    const patched = await request(app.getHttpServer()).patch(`${COLLECTIONS_PATH}/1`).send({ name: "Abbayes" });
    const deleted = await request(app.getHttpServer()).delete(`${COLLECTIONS_PATH}/1`);

    expect(patched.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(patched.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    expect(deleted.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(deleted.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("renames the collection of Alice, trimmed, and keeps its beers count", async () => {
    const id = await create(ALICE_USER_ID, "Trappistes");
    await items.save([
      { collectionId: id, beerId: 10 },
      { collectionId: id, beerId: 11 },
    ]);

    const response = await rename(ALICE_USER_ID, id, { name: "  Abbayes  " });

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual({ id, kind: "custom", name: "Abbayes", beerCount: 2 });
    expect((await collections.findOneByOrFail({ id })).name).toBe("Abbayes");
  });

  it("allows the same name and a change of case alone", async () => {
    const id = await create(ALICE_USER_ID, "Blondes");

    const same = await rename(ALICE_USER_ID, id, { name: "Blondes" });
    const recased = await rename(ALICE_USER_ID, id, { name: "BLONDES" });

    expect(same.status).toBe(HttpStatus.OK);
    expect(same.body).toEqual({ id, kind: "custom", name: "Blondes", beerCount: 0 });
    expect(recased.status).toBe(HttpStatus.OK);
    expect(recased.body).toEqual({ id, kind: "custom", name: "BLONDES", beerCount: 0 });
  });

  it("answers 409 when another collection of Alice has the name, whatever the case", async () => {
    const id = await create(ALICE_USER_ID, "Stouts");
    const before = await collections.findOneByOrFail({ id });

    const response = await rename(ALICE_USER_ID, id, { name: "abbayes" });

    expect(response.status).toBe(HttpStatus.CONFLICT);
    expect(response.body).toEqual({ message: 'A collection named "abbayes" already exists.' });
    expect(await collections.findOneByOrFail({ id })).toEqual(before);
  });

  it("lets Alice take a name used by another user", async () => {
    const id = await create(ALICE_USER_ID, "Sours");
    await create(BOB_USER_ID, "Lambics");

    const response = await rename(ALICE_USER_ID, id, { name: "Lambics" });

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual({ id, kind: "custom", name: "Lambics", beerCount: 0 });
  });

  it.each([
    ["an empty name", { name: "" }],
    ["a blank name", { name: "   " }],
    ["a name of 41 characters between spaces", { name: ` ${"a".repeat(41)} ` }],
    ["a missing name", {}],
    ["an unknown field", { name: "Sours", userId: 2 }],
  ])("answers 400 for %s", async (_label, body) => {
    const id = await create(ALICE_USER_ID, `Bad ${Math.random()}`.slice(0, 20));

    const response = await rename(ALICE_USER_ID, id, body);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect((response.body as { message: string }).message).not.toBe("");
  });

  it("answers 400 for a collection id that is not a number, on PATCH and DELETE", async () => {
    const patched = await rename(ALICE_USER_ID, "abc", { name: "Abbayes" });
    const deleted = await remove(ALICE_USER_ID, "abc");

    expect(patched.status).toBe(HttpStatus.BAD_REQUEST);
    expect((patched.body as { message: string }).message).not.toBe("");
    expect(deleted.status).toBe(HttpStatus.BAD_REQUEST);
    expect((deleted.body as { message: string }).message).not.toBe("");
  });

  it("answers 400 before 404 when the body is invalid and the collection is unknown", async () => {
    const response = await rename(ALICE_USER_ID, 9999, { name: "" });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it("answers 404 for an unknown collection and for the collection of another user", async () => {
    const bobId = await create(BOB_USER_ID, "Bob only");
    const aliceId = await create(ALICE_USER_ID, "Alice only");
    const before = await collections.findOneByOrFail({ id: bobId });

    const unknown = await rename(ALICE_USER_ID, 9999, { name: "Fresh" });
    const foreign = await rename(ALICE_USER_ID, bobId, { name: "Fresh" });
    const foreignDelete = await remove(ALICE_USER_ID, bobId);
    const reversed = await remove(BOB_USER_ID, aliceId);

    for (const response of [unknown, foreign, foreignDelete, reversed]) {
      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect((response.body as { message: string }).message).not.toBe("");
    }
    expect(await collections.findOneByOrFail({ id: bobId })).toEqual(before);
    expect(await collections.existsBy({ id: aliceId })).toBe(true);
  });

  it("answers 404 before 409 when the foreign collection is renamed to a name Alice owns", async () => {
    const bobId = await create(BOB_USER_ID, "Bob again");
    await create(ALICE_USER_ID, "Taken by Alice");

    const response = await rename(ALICE_USER_ID, bobId, { name: "taken by alice" });

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
  });

  it("deletes the collection of Alice with her beers, and nothing else", async () => {
    const id = await create(ALICE_USER_ID, "To delete");
    const otherId = await create(ALICE_USER_ID, "To keep");
    await items.save([
      { collectionId: id, beerId: 10 },
      { collectionId: id, beerId: 11 },
      { collectionId: otherId, beerId: 10 },
    ]);

    const response = await remove(ALICE_USER_ID, id);
    const again = await remove(ALICE_USER_ID, id);

    expect(response.status).toBe(HttpStatus.NO_CONTENT);
    expect(response.body).toEqual({});
    expect(await collections.existsBy({ id })).toBe(false);
    expect(await items.countBy({ collectionId: id })).toBe(0);
    expect(await items.countBy({ collectionId: otherId })).toBe(1);
    expect(again.status).toBe(HttpStatus.NOT_FOUND);
  });
});

describe("collection beers API", () => {
  const ORVAL_ID = 4;
  const DUVEL_ID = 5;
  const UNKNOWN_BEER_ID = 999_999;
  const FILLER_BEER_ID_START = 100_000;
  const BEERS_MAX = 200;
  const WISHLIST_NAME = "";

  let app: INestApplication;
  let items: Repository<CollectionItem>;

  const as = (userId: number, test: request.Test): request.Test => test.set(USER_ID_HEADER_NAME, String(userId));

  const create = async (userId: number, name: string): Promise<number> => {
    const response = await as(userId, request(app.getHttpServer()).post(COLLECTIONS_PATH)).send({ name });
    expect(response.status).toBe(HttpStatus.CREATED);
    return (response.body as { id: number }).id;
  };

  const add = (userId: number, collectionId: number | string, body: object): request.Test =>
    as(userId, request(app.getHttpServer()).post(`${COLLECTIONS_PATH}/${collectionId}/beers`)).send(body);

  const removeBeer = (userId: number, collectionId: number | string, beerId: number | string): request.Test =>
    as(userId, request(app.getHttpServer()).delete(`${COLLECTIONS_PATH}/${collectionId}/beers/${beerId}`));

  const mine = (userId: number, query = ""): request.Test =>
    as(userId, request(app.getHttpServer()).get(`${COLLECTIONS_PATH}${query}`));

  beforeAll(async () => {
    app = await createTestApp();
    items = app.get(getRepositoryToken(CollectionItem), { strict: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it("answers 401 without the user header on GET, POST and DELETE", async () => {
    const listed = await request(app.getHttpServer()).get(COLLECTIONS_PATH);
    const added = await request(app.getHttpServer()).post(`${COLLECTIONS_PATH}/1/beers`).send({ beerId: ORVAL_ID });
    const removed = await request(app.getHttpServer()).delete(`${COLLECTIONS_PATH}/1/beers/${ORVAL_ID}`);

    for (const response of [listed, added, removed]) {
      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    }
  });

  it("adds Orval to Trappistes with 201 and 1 beer, then answers 409 on a second add", async () => {
    const trappistes = await create(ALICE_USER_ID, "Trappistes");

    const first = await add(ALICE_USER_ID, trappistes, { beerId: ORVAL_ID });
    const second = await add(ALICE_USER_ID, trappistes, { beerId: ORVAL_ID });

    expect(first.status).toBe(HttpStatus.CREATED);
    expect(first.body).toEqual({ id: trappistes, kind: "custom", name: "Trappistes", beerCount: 1 });
    expect(second.status).toBe(HttpStatus.CONFLICT);
    expect(second.body).toEqual({ message: `Beer ${ORVAL_ID} is already in this collection.` });
    expect(await items.countBy({ collectionId: trappistes })).toBe(1);
  });

  it("counts the beers already there and keeps the same beer addable to another collection", async () => {
    const abbayes = await create(ALICE_USER_ID, "Abbayes");
    const first = await add(ALICE_USER_ID, abbayes, { beerId: ORVAL_ID });
    const second = await add(ALICE_USER_ID, abbayes, { beerId: DUVEL_ID });

    expect(first.body).toMatchObject({ beerCount: 1 });
    expect(second.status).toBe(HttpStatus.CREATED);
    expect(second.body).toEqual({ id: abbayes, kind: "custom", name: "Abbayes", beerCount: 2 });
  });

  it("answers 404 for an unknown beer, for an unknown collection and for the collection of another user", async () => {
    const aliceCollection = await create(ALICE_USER_ID, "Blondes");

    const unknownBeer = await add(ALICE_USER_ID, aliceCollection, { beerId: UNKNOWN_BEER_ID });
    const unknownCollection = await add(ALICE_USER_ID, 999_999, { beerId: ORVAL_ID });
    const foreign = await add(BOB_USER_ID, aliceCollection, { beerId: ORVAL_ID });

    expect(unknownBeer.status).toBe(HttpStatus.NOT_FOUND);
    expect(unknownBeer.body).toEqual({ message: `Beer ${UNKNOWN_BEER_ID} not found.` });
    expect(unknownCollection.status).toBe(HttpStatus.NOT_FOUND);
    expect(unknownCollection.body).toEqual({ message: "Collection 999999 not found." });
    expect(foreign.status).toBe(HttpStatus.NOT_FOUND);
    expect(foreign.body).toEqual({ message: `Collection ${aliceCollection} not found.` });
    expect(await items.countBy({ collectionId: aliceCollection })).toBe(0);
  });

  it("answers 404 on the collection before 404 on the beer", async () => {
    const response = await add(ALICE_USER_ID, 999_999, { beerId: UNKNOWN_BEER_ID });

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body).toEqual({ message: "Collection 999999 not found." });
  });

  it.each([
    ["no beer", {}],
    ["a beer of 0", { beerId: 0 }],
    ["a beer of -1", { beerId: -1 }],
    ["a text beer", { beerId: "4" }],
    ["an unknown field", { beerId: ORVAL_ID, extra: 1 }],
  ])("answers 400 before 404 for %s on an unknown collection", async (_label, body) => {
    const response = await add(ALICE_USER_ID, 999_999, body);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body).toEqual({ message: expect.stringMatching(/\S/) });
  });

  it("answers 400 for a collection id that is not a number on POST and DELETE", async () => {
    const added = await add(ALICE_USER_ID, "abc", { beerId: ORVAL_ID });
    const removed = await removeBeer(ALICE_USER_ID, "abc", ORVAL_ID);
    const removedBeer = await removeBeer(ALICE_USER_ID, 1, "abc");

    expect(added.status).toBe(HttpStatus.BAD_REQUEST);
    expect(removed.status).toBe(HttpStatus.BAD_REQUEST);
    expect(removedBeer.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it("accepts the 200th beer, answers 409 on the 201st, which stays out, and 404 on an unknown beer before any 409", async () => {
    const big = await create(ALICE_USER_ID, "Grande cave");
    await items.save(
      Array.from({ length: BEERS_MAX - 1 }, (_, index) => ({
        collectionId: big,
        beerId: FILLER_BEER_ID_START + index,
      })),
    );

    const last = await add(ALICE_USER_ID, big, { beerId: ORVAL_ID });
    const overflow = await add(ALICE_USER_ID, big, { beerId: DUVEL_ID });
    const duplicate = await add(ALICE_USER_ID, big, { beerId: ORVAL_ID });
    const unknownOnFull = await add(ALICE_USER_ID, big, { beerId: UNKNOWN_BEER_ID });
    const unknownAlreadyThere = await add(ALICE_USER_ID, big, { beerId: FILLER_BEER_ID_START });

    expect(last.status).toBe(HttpStatus.CREATED);
    expect(last.body).toMatchObject({ beerCount: BEERS_MAX });
    expect(overflow.status).toBe(HttpStatus.CONFLICT);
    expect(overflow.body).toEqual({ message: "A collection cannot hold more than 200 beers." });
    expect(duplicate.body).toEqual({ message: `Beer ${ORVAL_ID} is already in this collection.` });
    expect(unknownOnFull.status).toBe(HttpStatus.NOT_FOUND);
    expect(unknownOnFull.body).toEqual({ message: `Beer ${UNKNOWN_BEER_ID} not found.` });
    expect(unknownAlreadyThere.status).toBe(HttpStatus.NOT_FOUND);
    expect(unknownAlreadyThere.body).toEqual({ message: `Beer ${FILLER_BEER_ID_START} not found.` });
    expect(await items.countBy({ collectionId: big })).toBe(BEERS_MAX);
  });

  it("checks Orval in the wishlist and in Trappistes when Orval is asked, and nothing without a beer", async () => {
    const fresh = await createTestApp();
    const listed = (userId: number, query = ""): request.Test =>
      as(userId, request(fresh.getHttpServer()).get(`${COLLECTIONS_PATH}${query}`));
    try {
      const trappistes = (
        await as(CAROL_USER_ID, request(fresh.getHttpServer()).post(COLLECTIONS_PATH)).send({ name: "Trappistes" })
      ).body as { id: number };
      await as(CAROL_USER_ID, request(fresh.getHttpServer()).post(COLLECTIONS_PATH)).send({ name: "Blondes" });
      const wished = await as(CAROL_USER_ID, request(fresh.getHttpServer()).post("/api/v1/me/wishlist")).send({
        beerId: ORVAL_ID,
      });
      expect(wished.status).toBe(HttpStatus.CREATED);
      const stored = await as(
        CAROL_USER_ID,
        request(fresh.getHttpServer()).post(`${COLLECTIONS_PATH}/${trappistes.id}/beers`),
      ).send({ beerId: ORVAL_ID });
      expect(stored.status).toBe(HttpStatus.CREATED);

      const withOrval = await listed(CAROL_USER_ID, `?beerId=${ORVAL_ID}`);
      const withoutBeer = await listed(CAROL_USER_ID);

      expect(withOrval.status).toBe(HttpStatus.OK);
      expect(withOrval.body).toEqual([
        { id: null, kind: "wishlist", name: WISHLIST_NAME, beerCount: 1, containsBeer: true },
        { id: trappistes.id, kind: "custom", name: "Trappistes", beerCount: 1, containsBeer: true },
        { id: expect.any(Number), kind: "custom", name: "Blondes", beerCount: 0, containsBeer: false },
      ]);
      expect(withoutBeer.status).toBe(HttpStatus.OK);
      expect(withoutBeer.body).toEqual([
        { id: null, kind: "wishlist", name: WISHLIST_NAME, beerCount: 1, containsBeer: false },
        { id: trappistes.id, kind: "custom", name: "Trappistes", beerCount: 1, containsBeer: false },
        { id: expect.any(Number), kind: "custom", name: "Blondes", beerCount: 0, containsBeer: false },
      ]);
    } finally {
      await fresh.close();
    }
  });

  it("leaves a collection unchecked for a beer it does not hold, and ignores the beers of the others", async () => {
    const own = await create(BOB_USER_ID, "Stouts");
    await add(BOB_USER_ID, own, { beerId: DUVEL_ID });
    const alice = await create(ALICE_USER_ID, "Stouts de Alice");
    await add(ALICE_USER_ID, alice, { beerId: ORVAL_ID });

    const response = await mine(BOB_USER_ID, `?beerId=${ORVAL_ID}`);

    expect(response.status).toBe(HttpStatus.OK);
    const stouts = (response.body as { id: number | null; containsBeer: boolean }[]).find(
      (collection) => collection.id === own,
    );
    expect(stouts).toEqual({ id: own, kind: "custom", name: "Stouts", beerCount: 1, containsBeer: false });
    expect(
      (response.body as { id: number | null }[]).some((collection) => collection.id === alice),
    ).toBe(false);
  });

  it("answers 404 for an unknown beer asked, and 400 for an invalid beer id", async () => {
    const unknown = await mine(ALICE_USER_ID, `?beerId=${UNKNOWN_BEER_ID}`);

    expect(unknown.status).toBe(HttpStatus.NOT_FOUND);
    expect(unknown.body).toEqual({ message: `Beer ${UNKNOWN_BEER_ID} not found.` });
    for (const invalid of ["0", "-1", "abc", "1.5"]) {
      const response = await mine(ALICE_USER_ID, `?beerId=${invalid}`);
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    }
  });

  it("retires Orval from Trappistes with 204 and answers 404 when it is absent", async () => {
    const trappistes = await create(ALICE_USER_ID, "Trappistes retirees");
    await add(ALICE_USER_ID, trappistes, { beerId: ORVAL_ID });
    await add(ALICE_USER_ID, trappistes, { beerId: DUVEL_ID });

    const removed = await removeBeer(ALICE_USER_ID, trappistes, ORVAL_ID);
    const again = await removeBeer(ALICE_USER_ID, trappistes, ORVAL_ID);

    expect(removed.status).toBe(HttpStatus.NO_CONTENT);
    expect(removed.body).toEqual({});
    expect(again.status).toBe(HttpStatus.NOT_FOUND);
    expect(again.body).toEqual({ message: `Beer ${ORVAL_ID} is not in collection ${trappistes}.` });
    expect(await items.countBy({ collectionId: trappistes })).toBe(1);
    expect(await items.existsBy({ collectionId: trappistes, beerId: DUVEL_ID })).toBe(true);
  });

  it("answers 404 for an unknown collection and for the collection of another user on DELETE", async () => {
    const aliceCollection = await create(ALICE_USER_ID, "Privee");
    await add(ALICE_USER_ID, aliceCollection, { beerId: ORVAL_ID });

    const unknown = await removeBeer(ALICE_USER_ID, 999_999, ORVAL_ID);
    const foreign = await removeBeer(BOB_USER_ID, aliceCollection, ORVAL_ID);

    expect(unknown.status).toBe(HttpStatus.NOT_FOUND);
    expect(unknown.body).toEqual({ message: "Collection 999999 not found." });
    expect(foreign.status).toBe(HttpStatus.NOT_FOUND);
    expect(foreign.body).toEqual({ message: `Collection ${aliceCollection} not found.` });
    expect(await items.countBy({ collectionId: aliceCollection })).toBe(1);
  });
});

describe("collection detail API", () => {
  const ORVAL_ID = 4;
  const DUVEL_ID = 10;
  const ORVAL_FAMILY = "trappist";
  const DUVEL_FAMILY = "belgianStrong";
  const UNKNOWN_COLLECTION_ID = 9999;
  const DRANK_AT = "2025-10-01T18:00:00.000Z";
  const ISO_DATE = expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/);
  let app: INestApplication;
  let bobCollection: number;
  let aliceCollection: number;
  let emptyCollection: number;

  const as = (userId: number, test: request.Test): request.Test => test.set(USER_ID_HEADER_NAME, String(userId));
  const post = (userId: number, path: string, body: object): request.Test =>
    as(userId, request(app.getHttpServer()).post(path)).send(body);
  const detail = (readerId: number, ownerId: number | string, collectionId: number | string): request.Test =>
    as(readerId, request(app.getHttpServer()).get(`/api/v1/users/${ownerId}/collections/${collectionId}`));
  const wishlist = (readerId: number, ownerId: number | string): request.Test =>
    as(readerId, request(app.getHttpServer()).get(`/api/v1/users/${ownerId}/wishlist`));

  const createCollection = async (userId: number, name: string): Promise<number> => {
    const response = await post(userId, COLLECTIONS_PATH, { name });
    expect(response.status).toBe(HttpStatus.CREATED);
    return (response.body as { id: number }).id;
  };

  const addBeer = async (userId: number, collectionId: number, beerId: number): Promise<void> => {
    const response = await post(userId, `${COLLECTIONS_PATH}/${collectionId}/beers`, { beerId });
    expect(response.status).toBe(HttpStatus.CREATED);
  };

  const wish = async (userId: number, beerId: number): Promise<void> => {
    const response = await post(userId, "/api/v1/me/wishlist", { beerId });
    expect(response.status).toBe(HttpStatus.CREATED);
  };

  const drink = async (userId: number, beerId: number): Promise<void> => {
    const response = await as(userId, request(app.getHttpServer()).post("/api/v1/checkins"))
      .field("beerId", String(beerId))
      .field("drankAt", DRANK_AT)
      .field("place", "Le Bistrot")
      .field("format", "bottle")
      .field("rating", "4");
    expect(response.status).toBe(HttpStatus.CREATED);
  };

  // Duvel is added before Orval (and has the greater id): the most recent addition, Orval, comes first.
  const orvalThenDuvel = (orvalDrunk: boolean, duvelDrunk: boolean): object[] => [
    { beerId: ORVAL_ID, beerName: "Orval", styleName: "Trappiste blonde", family: ORVAL_FAMILY, drunkByMe: orvalDrunk, addedAt: ISO_DATE },
    { beerId: DUVEL_ID, beerName: "Duvel", styleName: "Belgian Strong Golden", family: DUVEL_FAMILY, drunkByMe: duvelDrunk, addedAt: ISO_DATE },
  ];

  beforeAll(async () => {
    app = await createTestApp();
    bobCollection = await createCollection(BOB_USER_ID, "Trappistes");
    emptyCollection = await createCollection(BOB_USER_ID, "Vide");
    aliceCollection = await createCollection(ALICE_USER_ID, "Blondes");
    await addBeer(BOB_USER_ID, bobCollection, DUVEL_ID);
    await addBeer(BOB_USER_ID, bobCollection, ORVAL_ID);
    await wish(BOB_USER_ID, DUVEL_ID);
    await wish(BOB_USER_ID, ORVAL_ID);
    await drink(CAROL_USER_ID, ORVAL_ID);
    await drink(BOB_USER_ID, DUVEL_ID);
  });

  afterAll(async () => {
    await app.close();
  });

  it("answers 401 without the user header on both routes", async () => {
    const collection = await request(app.getHttpServer()).get(`/api/v1/users/${BOB_USER_ID}/collections/${bobCollection}`);
    const wished = await request(app.getHttpServer()).get(`/api/v1/users/${BOB_USER_ID}/wishlist`);

    expect(collection.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(collection.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    expect(wished.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(wished.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("answers 400 for an id that is not a number", async () => {
    for (const response of [
      await detail(CAROL_USER_ID, "abc", bobCollection),
      await detail(CAROL_USER_ID, BOB_USER_ID, "abc"),
      await wishlist(CAROL_USER_ID, "abc"),
    ]) {
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect((response.body as { message: string }).message).not.toBe("");
    }
  });

  it("answers 404 for an unknown user, and for a collection that is not his, before any 403", async () => {
    const unknownUser = await detail(CAROL_USER_ID, UNKNOWN_USER_ID, bobCollection);
    const unknownCollection = await detail(CAROL_USER_ID, BOB_USER_ID, UNKNOWN_COLLECTION_ID);
    const collectionOfAnother = await detail(CAROL_USER_ID, BOB_USER_ID, aliceCollection);
    const unknownWishlistOwner = await wishlist(CAROL_USER_ID, UNKNOWN_USER_ID);

    expect(unknownUser.status).toBe(HttpStatus.NOT_FOUND);
    expect(unknownCollection.status).toBe(HttpStatus.NOT_FOUND);
    expect(unknownCollection.body).toEqual({ message: `Collection ${UNKNOWN_COLLECTION_ID} not found.` });
    expect(collectionOfAnother.status).toBe(HttpStatus.NOT_FOUND);
    expect(collectionOfAnother.body).toEqual({ message: `Collection ${aliceCollection} not found.` });
    expect(unknownWishlistOwner.status).toBe(HttpStatus.NOT_FOUND);
  });

  it("answers 403 on his collection and on his wishlist when Carol does not follow Bob", async () => {
    const collection = await detail(CAROL_USER_ID, BOB_USER_ID, bobCollection);
    const wished = await wishlist(CAROL_USER_ID, BOB_USER_ID);

    expect(collection.status).toBe(HttpStatus.FORBIDDEN);
    expect(collection.body).toEqual({ message: "You must follow this user to see their collections." });
    expect(wished.status).toBe(HttpStatus.FORBIDDEN);
    expect(wished.body).toEqual({ message: "You must follow this user to see their collections." });
  });

  it("lets Bob read his own collection and wishlist, Duvel being the beer he drank", async () => {
    const collection = await detail(BOB_USER_ID, BOB_USER_ID, bobCollection);
    const wished = await wishlist(BOB_USER_ID, BOB_USER_ID);

    expect(collection.status).toBe(HttpStatus.OK);
    expect(collection.body).toEqual({
      id: bobCollection,
      kind: "custom",
      name: "Trappistes",
      ownerId: BOB_USER_ID,
      beers: orvalThenDuvel(false, true),
    });
    expect(wished.status).toBe(HttpStatus.OK);
    expect((wished.body as { beers: unknown[] }).beers).toEqual(orvalThenDuvel(false, true));
  });

  it("shows Carol, once she follows Bob, two beers with Orval drunk by her and Duvel not", async () => {
    const followed = await as(CAROL_USER_ID, request(app.getHttpServer()).post(`/api/v1/users/${BOB_USER_ID}/follow`));
    expect(followed.status).toBe(HttpStatus.CREATED);

    const collection = await detail(CAROL_USER_ID, BOB_USER_ID, bobCollection);

    expect(collection.status).toBe(HttpStatus.OK);
    expect(collection.body).toEqual({
      id: bobCollection,
      kind: "custom",
      name: "Trappistes",
      ownerId: BOB_USER_ID,
      beers: orvalThenDuvel(true, false),
    });
  });

  it("answers the wishlist of Bob as a collection of kind wishlist with a null id", async () => {
    const response = await wishlist(CAROL_USER_ID, BOB_USER_ID);

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual({
      id: null,
      kind: "wishlist",
      name: "",
      ownerId: BOB_USER_ID,
      beers: orvalThenDuvel(true, false),
    });
  });

  it("answers an empty list for an empty collection and for an empty wishlist", async () => {
    const collection = await detail(CAROL_USER_ID, BOB_USER_ID, emptyCollection);
    const wished = await wishlist(CAROL_USER_ID, CAROL_USER_ID);

    expect(collection.status).toBe(HttpStatus.OK);
    expect(collection.body).toEqual({ id: emptyCollection, kind: "custom", name: "Vide", ownerId: BOB_USER_ID, beers: [] });
    expect(wished.status).toBe(HttpStatus.OK);
    expect(wished.body).toEqual({ id: null, kind: "wishlist", name: "", ownerId: CAROL_USER_ID, beers: [] });
  });
});
