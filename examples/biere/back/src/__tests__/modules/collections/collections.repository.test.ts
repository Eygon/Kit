import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { EntityManager, type Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CollectionsRepository } from "@/modules/collections/collections.repository";
import { CollectionItem } from "@/modules/collections/entities/collection-item.entity";
import { Collection } from "@/modules/collections/entities/collection.entity";
import { toCollectionSummaryDto, toNewCollection } from "@/modules/collections/mappers/collection.mapper";
import { inMemoryDatabase } from "@/__tests__/support/test-database";

const ALICE = 1;
const BOB = 2;
const CAROL = 3;
const UNKNOWN_COLLECTION = 9999;

describe("CollectionsRepository", () => {
  let moduleRef: TestingModule;
  let collections: Repository<Collection>;
  let items: Repository<CollectionItem>;

  const repository = async () => moduleRef.get(CollectionsRepository);

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [inMemoryDatabase(), TypeOrmModule.forFeature([Collection, CollectionItem])],
      providers: [CollectionsRepository],
    }).compile();
    collections = moduleRef.get(getRepositoryToken(Collection));
    items = moduleRef.get(getRepositoryToken(CollectionItem));
  });

  beforeEach(async () => {
    await items.clear();
    await collections.clear();
    await collections.save([
      { userId: BOB, name: "Trappistes" },
      { userId: BOB, name: "IPA" },
      { userId: ALICE, name: "Trappistes" },
      { userId: ALICE, name: "Blondes" },
      { userId: ALICE, name: "Stouts" },
    ]);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it("counts the collections of a user, not those of the others", async () => {
    const target = await repository();

    expect(await target.countByUser(ALICE)).toBe(3);
    expect(await target.countByUser(BOB)).toBe(2);
    expect(await target.countByUser(CAROL)).toBe(0);
  });

  it("finds a name whatever the case, for the same user only", async () => {
    const target = await repository();

    expect(await target.existsByName(ALICE, "blondes")).toBe(true);
    expect(await target.existsByName(ALICE, "BLONDES")).toBe(true);
    expect(await target.existsByName(BOB, "Blondes")).toBe(false);
    expect(await target.existsByName(CAROL, "Trappistes")).toBe(false);
    expect(await target.existsByName(ALICE, "Triples")).toBe(false);
  });

  it("ignores the collection named by exceptId but not the others", async () => {
    const target = await repository();
    const blondes = await collections.findOneByOrFail({ userId: ALICE, name: "Blondes" });

    expect(await target.existsByName(ALICE, "blondes", blondes.id)).toBe(false);
    expect(await target.existsByName(ALICE, "stouts", blondes.id)).toBe(true);
  });

  it("folds the case of accented letters, which SQLite LOWER does not", async () => {
    const target = await repository();
    const summer = await collections.save({ userId: CAROL, name: "Été" });

    expect(await target.existsByName(CAROL, "été")).toBe(true);
    expect(await target.existsByName(CAROL, "ÉTÉ")).toBe(true);
    expect(await target.existsByName(CAROL, "  été  ")).toBe(true);
    expect(await target.existsByName(CAROL, "ete")).toBe(false);
    expect(await target.existsByName(CAROL, "été", summer.id)).toBe(false);
  });

  it("summarizes the collections of a user with their beer count, in creation order", async () => {
    const target = await repository();
    const [bobTrappistes] = await collections.findBy({ userId: BOB, name: "Trappistes" });
    const [aliceTrappistes] = await collections.findBy({ userId: ALICE, name: "Trappistes" });
    const [aliceStouts] = await collections.findBy({ userId: ALICE, name: "Stouts" });
    await items.save([
      { collectionId: bobTrappistes.id, beerId: 10 },
      { collectionId: bobTrappistes.id, beerId: 11 },
      { collectionId: bobTrappistes.id, beerId: 12 },
      { collectionId: aliceTrappistes.id, beerId: 10 },
      { collectionId: aliceTrappistes.id, beerId: 11 },
      { collectionId: aliceStouts.id, beerId: 10 },
    ]);

    const summaries = await target.findSummariesByUser(ALICE);

    expect(summaries).toEqual([
      { id: aliceTrappistes.id, kind: "custom", name: "Trappistes", beerCount: 2 },
      { id: expect.any(Number), kind: "custom", name: "Blondes", beerCount: 0 },
      { id: aliceStouts.id, kind: "custom", name: "Stouts", beerCount: 1 },
    ]);
  });

  it("answers an empty list for a user with no collection", async () => {
    const target = await repository();

    expect(await target.findSummariesByUser(CAROL)).toEqual([]);
  });

  it("creates a collection for the user and answers its summary with no beer", async () => {
    const target = await repository();

    const summary = await target.create(CAROL, { name: "Sours" });
    const stored = await collections.findBy({ userId: CAROL });

    expect(summary).toEqual({ id: stored[0].id, kind: "custom", name: "Sours", beerCount: 0 });
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ userId: CAROL, name: "Sours" });
    expect(await collections.count()).toBe(6);
  });
  it("finds an owned collection with its beer count, and nothing for another owner or an unknown id", async () => {
    const target = await repository();
    const [bobTrappistes] = await collections.findBy({ userId: BOB, name: "Trappistes" });
    const [aliceTrappistes] = await collections.findBy({ userId: ALICE, name: "Trappistes" });
    await items.save([
      { collectionId: aliceTrappistes.id, beerId: 10 },
      { collectionId: aliceTrappistes.id, beerId: 11 },
      { collectionId: bobTrappistes.id, beerId: 10 },
      { collectionId: bobTrappistes.id, beerId: 11 },
      { collectionId: bobTrappistes.id, beerId: 12 },
    ]);

    expect(await target.findOwned(ALICE, aliceTrappistes.id)).toEqual({
      id: aliceTrappistes.id,
      kind: "custom",
      name: "Trappistes",
      beerCount: 2,
    });
    expect(await target.findOwned(ALICE, bobTrappistes.id)).toBeNull();
    expect(await target.findOwned(CAROL, aliceTrappistes.id)).toBeNull();
    expect(await target.findOwned(ALICE, UNKNOWN_COLLECTION)).toBeNull();
  });

  it("renames only the targeted collection and answers its summary with the beer count", async () => {
    const target = await repository();
    const [aliceTrappistes] = await collections.findBy({ userId: ALICE, name: "Trappistes" });
    await items.save([
      { collectionId: aliceTrappistes.id, beerId: 10 },
      { collectionId: aliceTrappistes.id, beerId: 11 },
    ]);
    const before = await collections.find({ order: { id: "ASC" } });

    const summary = await target.rename(aliceTrappistes.id, "Abbayes");

    expect(summary).toEqual({ id: aliceTrappistes.id, kind: "custom", name: "Abbayes", beerCount: 2 });
    const after = await collections.find({ order: { id: "ASC" } });
    expect(after).toEqual(before.map((c) => (c.id === aliceTrappistes.id ? { ...c, name: "Abbayes" } : c)));
    expect(await items.countBy({ collectionId: aliceTrappistes.id })).toBe(2);
  });

  it("deletes a collection with its beers and keeps the others untouched", async () => {
    const target = await repository();
    const [aliceTrappistes] = await collections.findBy({ userId: ALICE, name: "Trappistes" });
    const [bobTrappistes] = await collections.findBy({ userId: BOB, name: "Trappistes" });
    await items.save([
      { collectionId: aliceTrappistes.id, beerId: 10 },
      { collectionId: aliceTrappistes.id, beerId: 11 },
      { collectionId: bobTrappistes.id, beerId: 10 },
    ]);

    await target.deleteWithItems(aliceTrappistes.id);

    expect(await collections.existsBy({ id: aliceTrappistes.id })).toBe(false);
    expect(await items.countBy({ collectionId: aliceTrappistes.id })).toBe(0);
    expect(await collections.count()).toBe(4);
    expect(await items.countBy({ collectionId: bobTrappistes.id })).toBe(1);
  });

  it("rolls the beers deletion back when the collection removal fails", async () => {
    const target = await repository();
    const [aliceTrappistes] = await collections.findBy({ userId: ALICE, name: "Trappistes" });
    await items.save([{ collectionId: aliceTrappistes.id, beerId: 10 }]);
    const originalDelete = EntityManager.prototype.delete;
    const removal = vi.spyOn(EntityManager.prototype, "delete").mockImplementation(function (
      this: EntityManager,
      ...args: Parameters<EntityManager["delete"]>
    ) {
      if (args[0] === Collection) {
        return Promise.reject(new Error("removal failed"));
      }
      return originalDelete.apply(this, args);
    });

    await expect(target.deleteWithItems(aliceTrappistes.id)).rejects.toThrow("removal failed");
    removal.mockRestore();

    expect(await collections.existsBy({ id: aliceTrappistes.id })).toBe(true);
    expect(await items.countBy({ collectionId: aliceTrappistes.id })).toBe(1);
  });
});

describe("collection mapper", () => {
  it("builds the new collection from the user and the DTO", async () => {
    expect(toNewCollection(ALICE, { name: "Sours" })).toEqual({ userId: ALICE, name: "Sours" });
  });

  it("maps an entity and a beer count to a custom summary", async () => {
    const entity = Object.assign(new Collection(), { id: 7, userId: ALICE, name: "Sours", createdAt: new Date() });

    expect(toCollectionSummaryDto(entity, 3)).toEqual({ id: 7, kind: "custom", name: "Sours", beerCount: 3 });
  });
});

describe("CollectionsRepository beers", () => {
  let moduleRef: TestingModule;
  let collections: Repository<Collection>;
  let items: Repository<CollectionItem>;
  let aliceTrappistes: Collection;
  let aliceBlondes: Collection;
  let bobTrappistes: Collection;

  const repository = () => moduleRef.get(CollectionsRepository);

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [inMemoryDatabase(), TypeOrmModule.forFeature([Collection, CollectionItem])],
      providers: [CollectionsRepository],
    }).compile();
    collections = moduleRef.get(getRepositoryToken(Collection));
    items = moduleRef.get(getRepositoryToken(CollectionItem));
  });

  beforeEach(async () => {
    await items.clear();
    await collections.clear();
    bobTrappistes = await collections.save({ userId: BOB, name: "Trappistes" });
    aliceTrappistes = await collections.save({ userId: ALICE, name: "Trappistes" });
    aliceBlondes = await collections.save({ userId: ALICE, name: "Blondes" });
    await items.save([
      { collectionId: bobTrappistes.id, beerId: 10 },
      { collectionId: bobTrappistes.id, beerId: 11 },
      { collectionId: bobTrappistes.id, beerId: 12 },
      { collectionId: aliceTrappistes.id, beerId: 10 },
      { collectionId: aliceTrappistes.id, beerId: 11 },
    ]);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it("tells whether a beer is in a given collection and not in the others", async () => {
    const target = repository();

    expect(await target.existsItem(aliceTrappistes.id, 10)).toBe(true);
    expect(await target.existsItem(aliceTrappistes.id, 12)).toBe(false);
    expect(await target.existsItem(aliceBlondes.id, 10)).toBe(false);
    expect(await target.existsItem(UNKNOWN_COLLECTION, 10)).toBe(false);
  });

  it("counts the beers of one collection only", async () => {
    const target = repository();

    expect(await target.countItems(aliceTrappistes.id)).toBe(2);
    expect(await target.countItems(bobTrappistes.id)).toBe(3);
    expect(await target.countItems(aliceBlondes.id)).toBe(0);
    expect(await target.countItems(UNKNOWN_COLLECTION)).toBe(0);
  });

  it("adds the beer to the targeted collection only", async () => {
    const target = repository();

    await target.addItem(aliceBlondes.id, 12);

    expect(await items.findBy({ collectionId: aliceBlondes.id })).toEqual([
      expect.objectContaining({ collectionId: aliceBlondes.id, beerId: 12 }),
    ]);
    expect(await items.count()).toBe(6);
  });

  it("removes the beer from the targeted collection only and says so", async () => {
    const target = repository();

    expect(await target.removeItem(aliceTrappistes.id, 10)).toBe(true);

    expect(await items.existsBy({ collectionId: aliceTrappistes.id, beerId: 10 })).toBe(false);
    expect(await items.existsBy({ collectionId: aliceTrappistes.id, beerId: 11 })).toBe(true);
    expect(await items.existsBy({ collectionId: bobTrappistes.id, beerId: 10 })).toBe(true);
    expect(await items.count()).toBe(4);
  });

  it("answers false and removes nothing when the beer is not in the collection", async () => {
    const target = repository();

    expect(await target.removeItem(aliceBlondes.id, 10)).toBe(false);
    expect(await target.removeItem(aliceTrappistes.id, 12)).toBe(false);
    expect(await items.count()).toBe(5);
  });

  it("finds the collections of the user holding the beer, in creation order, not those of the others", async () => {
    const target = repository();
    await items.save({ collectionId: aliceBlondes.id, beerId: 10 });

    expect(await target.findCollectionIdsContaining(ALICE, 10)).toEqual([aliceTrappistes.id, aliceBlondes.id]);
    expect(await target.findCollectionIdsContaining(ALICE, 11)).toEqual([aliceTrappistes.id]);
    expect(await target.findCollectionIdsContaining(ALICE, 12)).toEqual([]);
    expect(await target.findCollectionIdsContaining(BOB, 12)).toEqual([bobTrappistes.id]);
    expect(await target.findCollectionIdsContaining(CAROL, 10)).toEqual([]);
  });
  it("finds the items of one collection, most recently added first, ties broken by the highest id", async () => {
    const target = repository();
    const older = new Date("2026-01-01T10:00:00.000Z");
    const newer = new Date("2026-02-01T10:00:00.000Z");
    await items.save({ collectionId: aliceBlondes.id, beerId: 21, addedAt: newer });
    await items.save({ collectionId: aliceBlondes.id, beerId: 22, addedAt: newer });
    await items.save({ collectionId: aliceBlondes.id, beerId: 20, addedAt: older });

    expect(await target.findItems(aliceBlondes.id)).toEqual([
      { beerId: 22, addedAt: newer.toISOString() },
      { beerId: 21, addedAt: newer.toISOString() },
      { beerId: 20, addedAt: older.toISOString() },
    ]);
  });

  it("finds no item for an empty or unknown collection and none of the other collections", async () => {
    const target = repository();

    expect(await target.findItems(aliceBlondes.id)).toEqual([]);
    expect(await target.findItems(UNKNOWN_COLLECTION)).toEqual([]);
    expect((await target.findItems(aliceTrappistes.id)).map((item) => item.beerId).sort()).toEqual([10, 11]);
  });
});
