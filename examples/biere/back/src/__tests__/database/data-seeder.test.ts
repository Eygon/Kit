import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { Test } from "@nestjs/testing";
import type { TestingModule } from "@nestjs/testing";
import type { Repository } from "typeorm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DataSeeder } from "@/database/data-seeder";
import beersSeed from "@/database/seed/data/beers.json";
import breweriesSeed from "@/database/seed/data/breweries.json";
import stylesSeed from "@/database/seed/data/styles.json";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { Beer } from "@/modules/beers/entities/beer.entity";
import { BeerStyle } from "@/modules/beers/entities/beer-style.entity";
import { Brewery } from "@/modules/beers/entities/brewery.entity";
import { User } from "@/modules/users/entities/user.entity";
import { inMemoryDatabase } from "@/__tests__/support/test-database";

const SEEDED_STYLE_COUNT = 34;
const SEEDED_BREWERY_COUNT = 70;
const SEEDED_BEER_COUNT = 120;

describe("DataSeeder", () => {
  let moduleRef: TestingModule;
  let users: Repository<User>;
  let styles: Repository<BeerStyle>;
  let breweries: Repository<Brewery>;
  let beers: Repository<Beer>;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [inMemoryDatabase(), TypeOrmModule.forFeature([User, BeerStyle, Brewery, Beer])],
      providers: [DataSeeder],
    }).compile();
    users = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    styles = moduleRef.get<Repository<BeerStyle>>(getRepositoryToken(BeerStyle));
    breweries = moduleRef.get<Repository<Brewery>>(getRepositoryToken(Brewery));
    beers = moduleRef.get<Repository<Beer>>(getRepositoryToken(Beer));
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it("inserts Alice, Bob and Carol on bootstrap", async () => {
    await moduleRef.get(DataSeeder).onApplicationBootstrap();

    const seeded = await users.find({ order: { id: "ASC" } });
    expect(seeded.map((user) => user.displayName)).toEqual(["Alice", "Bob", "Carol"]);
  });

  it("is idempotent", async () => {
    const seeder = moduleRef.get(DataSeeder);

    await seeder.seed();
    await seeder.seed();

    expect(await users.count()).toBe(3);
  });

  it("leaves an already populated table untouched", async () => {
    await users.insert({ id: 10, displayName: "Dave", avatarColor: "#000000" });

    await moduleRef.get(DataSeeder).seed();

    expect(await users.count()).toBe(1);
  });

  it("loads 34 styles and 70 breweries into an empty database", async () => {
    await moduleRef.get(DataSeeder).onApplicationBootstrap();

    expect(await styles.count()).toBe(SEEDED_STYLE_COUNT);
    expect(await breweries.count()).toBe(SEEDED_BREWERY_COUNT);
    expect(stylesSeed).toHaveLength(SEEDED_STYLE_COUNT);
    expect(breweriesSeed).toHaveLength(SEEDED_BREWERY_COUNT);
  });

  it("gives every style one of the 18 contract families", async () => {
    await moduleRef.get(DataSeeder).seed();

    const families = new Set((await styles.find()).map((style) => style.family));

    expect([...families].every((family) => Object.values(BeerFamilyEnum).includes(family))).toBe(true);
    expect(families.size).toBe(Object.values(BeerFamilyEnum).length);
  });

  it("translates the seed labels Ambrée into amber and Sans alcool into nonAlcoholic", async () => {
    await moduleRef.get(DataSeeder).seed();

    const amberNames = stylesSeed.filter((style) => style.family === "Ambrée").map((style) => style.name);
    const nonAlcoholicNames = stylesSeed.filter((style) => style.family === "Sans alcool").map((style) => style.name);
    const storedAmber = (await styles.findBy({ family: BeerFamilyEnum.AMBER })).map((style) => style.name);
    const storedNonAlcoholic = (await styles.findBy({ family: BeerFamilyEnum.NON_ALCOHOLIC })).map(
      (style) => style.name,
    );

    expect(amberNames.length).toBeGreaterThan(0);
    expect(nonAlcoholicNames.length).toBeGreaterThan(0);
    expect(storedAmber.sort()).toEqual([...amberNames].sort());
    expect(storedNonAlcoholic.sort()).toEqual([...nonAlcoholicNames].sort());
  });

  it("keeps 34 styles and 70 breweries when the load is replayed", async () => {
    const seeder = moduleRef.get(DataSeeder);

    await seeder.seed();
    const stylesBefore = await styles.find({ order: { id: "ASC" } });
    await seeder.seed();

    expect(await styles.count()).toBe(SEEDED_STYLE_COUNT);
    expect(await breweries.count()).toBe(SEEDED_BREWERY_COUNT);
    expect(await styles.find({ order: { id: "ASC" } })).toEqual(stylesBefore);
  });

  it("does not modify a styles table already populated by something else", async () => {
    await styles.insert({
      name: "Style maison",
      family: BeerFamilyEnum.STOUT,
      description: "Déjà là.",
      ebcMin: 30,
      ebcMax: 60,
      ibuMin: 20,
      ibuMax: 40,
      abvMin: 4,
      abvMax: 7,
    });
    const before = await styles.find();

    await expect(moduleRef.get(DataSeeder).seed()).rejects.toThrow(/Chimay Rouge/);

    expect(await styles.find()).toEqual(before);
    expect(await breweries.count()).toBe(SEEDED_BREWERY_COUNT);
    expect(await beers.count()).toBe(0);
  });

  it("does not modify a breweries table already populated by something else", async () => {
    await breweries.insert({ name: "Brasserie maison", country: "FR", city: "Lille" });
    const before = await breweries.find();

    await expect(moduleRef.get(DataSeeder).seed()).rejects.toThrow(/Chimay Rouge/);

    expect(await breweries.find()).toEqual(before);
    expect(await styles.count()).toBe(SEEDED_STYLE_COUNT);
    expect(await beers.count()).toBe(0);
  });

  it("loads 120 beers, none without a brewery or a style, into an empty database", async () => {
    await moduleRef.get(DataSeeder).onApplicationBootstrap();

    const seeded = await beers.find({ relations: { brewery: true, style: true } });

    expect(beersSeed).toHaveLength(SEEDED_BEER_COUNT);
    expect(seeded).toHaveLength(SEEDED_BEER_COUNT);
    expect(seeded.every((beer) => beer.brewery !== null && beer.style !== null)).toBe(true);
    expect(seeded.every((beer) => beer.breweryId === beer.brewery.id && beer.styleId === beer.style.id)).toBe(true);
  });

  it("stores Chimay Rouge with its brewery, style, degree, aromas, format and country", async () => {
    await moduleRef.get(DataSeeder).seed();

    const chimay = await beers.findOneOrFail({ where: { name: "Chimay Rouge" }, relations: { brewery: true, style: true } });

    expect(chimay.brewery.name).toBe("Bières de Chimay");
    expect(chimay.style.name).toBe("Dubbel trappiste");
    expect(chimay.abv).toBe(7);
    expect(chimay.aromas).toEqual(["fruity", "caramel", "spicy", "malty"]);
    expect(chimay.formats).toEqual(["bottle"]);
    expect(chimay.country).toBe("BE");
    expect(chimay.ibu).toBeNull();
    expect(chimay.ebc).toBeNull();
  });

  it("stores the search text of Lindemans Pêcheresse without accents", async () => {
    await moduleRef.get(DataSeeder).seed();

    const beer = await beers.findOneByOrFail({ name: "Lindemans Pêcheresse" });

    expect(beer.searchText).toBe("lindemans pecheresse brouwerij lindemans");
  });

  it("folds ß into ss in the search text of Erdinger Dunkel", async () => {
    await moduleRef.get(DataSeeder).seed();

    const beer = await beers.findOneByOrFail({ name: "Erdinger Dunkel" });

    expect(beer.searchText).toContain("erdinger weissbrau");
  });

  it("keeps 120 identical beers when the load is replayed", async () => {
    const seeder = moduleRef.get(DataSeeder);

    await seeder.seed();
    const before = await beers.find({ order: { id: "ASC" } });
    await seeder.seed();

    expect(await beers.count()).toBe(SEEDED_BEER_COUNT);
    expect(await beers.find({ order: { id: "ASC" } })).toEqual(before);
  });

  it("does not modify a beers table already populated by something else", async () => {
    await moduleRef.get(DataSeeder).seed();
    await beers.clear();
    const brewery = await breweries.findOneByOrFail({ name: "Bières de Chimay" });
    const style = await styles.findOneByOrFail({ name: "Dubbel trappiste" });
    await beers.insert({
      name: "Bière maison",
      breweryId: brewery.id,
      styleId: style.id,
      abv: 5,
      ibu: null,
      ebc: null,
      description: "Déjà là.",
      aromas: [],
      formats: [],
      country: "BE",
      searchText: "biere maison",
    });
    const before = await beers.find();

    await moduleRef.get(DataSeeder).seed();

    expect(await beers.find()).toEqual(before);
  });

  it("fails with the name of the beer and loads no beer when its brewery is missing", async () => {
    await breweries.insert({ name: "Brasserie maison", country: "FR", city: "Lille" });

    await expect(moduleRef.get(DataSeeder).seed()).rejects.toThrow(/Chimay Rouge/);

    expect(await beers.count()).toBe(0);
  });

  it("loads none of the earlier beers when only the brewery of the last seed beer is missing", async () => {
    const seeder = moduleRef.get(DataSeeder);
    await seeder.seed();
    await beers.clear();
    await breweries.delete({ name: "Grupo Modelo" });

    await expect(seeder.seed()).rejects.toThrow(/Corona Extra/);

    expect(beersSeed.at(-1)?.name).toBe("Corona Extra");
    expect(await beers.count()).toBe(0);
  });

  it("fails with the name of the style and loads nothing when a style family is unknown", async () => {
    const original = stylesSeed[0].family;
    stylesSeed[0].family = "Inconnue";

    try {
      await expect(moduleRef.get(DataSeeder).seed()).rejects.toThrow(new RegExp(`Style "${stylesSeed[0].name}" has an unknown family`));
    } finally {
      stylesSeed[0].family = original;
    }

    expect(await styles.count()).toBe(0);
    expect(await beers.count()).toBe(0);
  });
});
