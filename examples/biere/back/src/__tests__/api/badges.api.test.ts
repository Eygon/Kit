import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import { ALICE_USER_ID, BOB_USER_ID, CAROL_USER_ID } from "@/database/seed.constants";
import type { BeerPageDto } from "@/modules/beers/dtos/beer-page.dto";
import type { CatalogBeerDto } from "@/modules/beers/dtos/catalog-beer.dto";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import type { CheckinPageDto } from "@/modules/pokedex/dtos/checkin-page.dto";
import type { CreatedCheckinDto } from "@/modules/pokedex/dtos/created-checkin.dto";
import type { StatsDto } from "@/modules/profile/dtos/stats.dto";
import type { BeerDetailDto } from "@/modules/beers/dtos/beer-detail.dto";
import type { BadgeDto } from "@/modules/profile/dtos/badge.dto";
import { BadgeKindEnum } from "@/modules/profile/enums/badge-kind.enum";
import type { VenueBeerDto } from "@/modules/venues/dtos/venue-beer.dto";
import type { VenueDto } from "@/modules/venues/dtos/venue.dto";
import { VoteSenseEnum } from "@/modules/venues/enums/vote-sense.enum";

const BADGES_PATH = "/api/v1/me/badges";
const BEERS_PATH = "/api/v1/beers";
const CHECKINS_PATH = "/api/v1/checkins";
const STATS_PATH = "/api/v1/me/stats";
const VENUES_PATH = "/api/v1/venues";
const SENTINEL_TARGET = 10;
const NOW = "2025-10-13T12:00:00.000Z";
const CATALOG_SIZE = 120;
const BEERS_PAGE_SIZE = 50;
const UNKNOWN_USER_ID = 99;
const PNG_BUFFER = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from("pixels"),
  Buffer.from([0x00, 0xff, 0x80]),
]);
const BADGE_IDS = [
  "firstSip",
  "explorer",
  "collector",
  "completionist",
  "globetrotter",
  ...Object.values(BeerFamilyEnum).map((family) => `specialist-${family}`),
  "photographer",
  "regular",
  "sentinel",
  "cartographer",
];

const minute = (day: string, index: number): string => `${day}T10:${String(index).padStart(2, "0")}:00.000Z`;

describe("badges API", () => {
  let app: INestApplication;
  let catalog: CatalogBeerDto[];

  const readCatalog = async (): Promise<CatalogBeerDto[]> => {
    const pages = await Promise.all(
      [1, 2, 3].map((page) =>
        request(app.getHttpServer())
          .get(BEERS_PATH)
          .query({ page, size: BEERS_PAGE_SIZE })
          .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID)),
      ),
    );
    return pages.flatMap((response) => (response.body as BeerPageDto).items);
  };

  const drink = async (userId: number, beerId: number, drankAt: string, withPhoto = false): Promise<CreatedCheckinDto> => {
    const call = request(app.getHttpServer())
      .post(CHECKINS_PATH)
      .set(USER_ID_HEADER_NAME, String(userId))
      .field("beerId", String(beerId))
      .field("drankAt", drankAt)
      .field("place", "Le Bistrot")
      .field("format", "bottle");
    const response = await (withPhoto
      ? call.attach("file", PNG_BUFFER, { filename: "beer.png", contentType: "image/png" })
      : call);
    expect(response.status).toBe(HttpStatus.CREATED);
    return response.body as CreatedCheckinDto;
  };

  const removeCheckin = async (userId: number, id: number): Promise<void> => {
    const response = await request(app.getHttpServer())
      .delete(`${CHECKINS_PATH}/${id}`)
      .set(USER_ID_HEADER_NAME, String(userId));
    expect(response.status).toBe(HttpStatus.NO_CONTENT);
  };

  const readBadges = (userId: number): request.Test =>
    request(app.getHttpServer()).get(BADGES_PATH).set(USER_ID_HEADER_NAME, String(userId));

  const badgeOf = async (userId: number, id: string): Promise<BadgeDto> => {
    const response = await readBadges(userId);
    expect(response.status).toBe(HttpStatus.OK);
    const badge = (response.body as BadgeDto[]).find((item) => item.id === id);
    if (badge === undefined) {
      throw new Error(`${id} is not listed`);
    }
    return badge;
  };

  const findBeers = (predicate: (beer: CatalogBeerDto) => boolean, count: number): CatalogBeerDto[] =>
    catalog.filter(predicate).slice(0, count);

  const onePerCountry = (count: number): CatalogBeerDto[] => {
    const seen = new Set<string>();
    return catalog
      .filter((beer) => !seen.has(beer.country) && seen.add(beer.country))
      .slice(0, count);
  };

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(NOW));
    app = await createTestApp();
    catalog = await readCatalog();
  });

  afterAll(async () => {
    await app.close();
    vi.useRealTimers();
  });

  it("answers 401 without the user header", async () => {
    const response = await request(app.getHttpServer()).get(BADGES_PATH);

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("answers 401 to a well-formed user id that matches no user", async () => {
    const response = await readBadges(UNKNOWN_USER_ID);

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("lists the whole catalog for the completion target", () => {
    expect(catalog).toHaveLength(CATALOG_SIZE);
  });

  it("answers 27 locked badges at 0 in the contract order to a user without tasting, Cartographe coming soon", async () => {
    const response = await readBadges(CAROL_USER_ID);
    const badges = response.body as BadgeDto[];

    expect(response.status).toBe(HttpStatus.OK);
    expect(badges.map((badge) => badge.id)).toStrictEqual(BADGE_IDS);
    expect(badges.every((badge) => !badge.unlocked && badge.unlockedAt === null && badge.current === 0)).toBe(true);
    expect(badges.filter((badge) => badge.comingSoon).map((badge) => badge.id)).toStrictEqual(["cartographer"]);
    expect(badges[0]).toEqual({
      id: "firstSip",
      kind: "firstSip",
      family: null,
      unlocked: false,
      unlockedAt: null,
      current: 0,
      target: 1,
      comingSoon: false,
    });
    const locked = (kind: BadgeKindEnum, target: number, family: BeerFamilyEnum | null = null): BadgeDto => ({
      id: family === null ? kind : `specialist-${family}`,
      kind,
      family,
      unlocked: false,
      unlockedAt: null,
      current: 0,
      target,
      comingSoon: kind === BadgeKindEnum.CARTOGRAPHER,
    });
    expect(response.body).toEqual([
      locked(BadgeKindEnum.FIRST_SIP, 1),
      locked(BadgeKindEnum.EXPLORER, 10),
      locked(BadgeKindEnum.COLLECTOR, 50),
      locked(BadgeKindEnum.COMPLETIONIST, CATALOG_SIZE),
      locked(BadgeKindEnum.GLOBETROTTER, 5),
      ...Object.values(BeerFamilyEnum).map((family) =>
        locked(BadgeKindEnum.SPECIALIST, catalog.filter((beer) => beer.family === family).length, family),
      ),
      locked(BadgeKindEnum.PHOTOGRAPHER, 10),
      locked(BadgeKindEnum.REGULAR, 3),
      locked(BadgeKindEnum.SENTINEL, SENTINEL_TARGET),
      locked(BadgeKindEnum.CARTOGRAPHER, 1),
    ]);
    expect(badges.find((badge) => badge.id === "completionist")).toMatchObject({ target: CATALOG_SIZE });
    expect(badges.find((badge) => badge.id === "specialist-porter")).toMatchObject({
      kind: "specialist",
      family: "porter",
      target: 2,
    });
  });

  it("moves Explorateur from 9 / 10 to unlocked at the first tasting of the 10th beer, then back to 9 / 10 once it is deleted", async () => {
    const beers = findBeers(() => true, 10);
    for (const [index, beer] of beers.slice(0, 9).entries()) {
      await drink(ALICE_USER_ID, beer.id, minute("2025-08-01", index));
    }

    expect(await badgeOf(ALICE_USER_ID, "firstSip")).toMatchObject({ unlocked: true, current: 1 });
    expect(await badgeOf(ALICE_USER_ID, "explorer")).toMatchObject({ unlocked: false, current: 9, target: 10, unlockedAt: null });

    const tenth = await drink(ALICE_USER_ID, beers[9].id, minute("2025-08-01", 9));

    expect(await badgeOf(ALICE_USER_ID, "explorer")).toMatchObject({
      unlocked: true,
      current: 10,
      target: 10,
      unlockedAt: minute("2025-08-01", 9),
    });

    await removeCheckin(ALICE_USER_ID, tenth.checkin.id);

    expect(await badgeOf(ALICE_USER_ID, "explorer")).toMatchObject({
      unlocked: false,
      current: 9,
      target: 10,
      unlockedAt: null,
    });
  });

  it("moves Globe-trotter from 4 / 5 to unlocked 5 / 5 with the 5th country", async () => {
    const beers = onePerCountry(5);
    for (const [index, beer] of beers.slice(0, 4).entries()) {
      await drink(CAROL_USER_ID, beer.id, minute("2025-07-01", index));
    }

    expect(await badgeOf(CAROL_USER_ID, "globetrotter")).toMatchObject({ unlocked: false, current: 4, target: 5, unlockedAt: null });

    await drink(CAROL_USER_ID, beers[4].id, minute("2025-07-01", 4));

    expect(await badgeOf(CAROL_USER_ID, "globetrotter")).toMatchObject({
      unlocked: true,
      current: 5,
      target: 5,
      unlockedAt: minute("2025-07-01", 4),
    });
  });

  it("unlocks the Porter Specialist with the 2 Porter beers, the 17 others stay locked with their progress", async () => {
    const [first, second] = findBeers((beer) => beer.family === BeerFamilyEnum.PORTER, 2);
    await drink(BOB_USER_ID, first.id, minute("2025-06-05", 0));

    expect(await badgeOf(BOB_USER_ID, "specialist-porter")).toMatchObject({ unlocked: false, current: 1, target: 2 });

    await drink(BOB_USER_ID, second.id, minute("2025-06-05", 1));

    const badges = (await readBadges(BOB_USER_ID)).body as BadgeDto[];
    expect(badges.find((badge) => badge.id === "specialist-porter")).toEqual({
      id: "specialist-porter",
      kind: "specialist",
      family: "porter",
      unlocked: true,
      unlockedAt: minute("2025-06-05", 1),
      current: 2,
      target: 2,
      comingSoon: false,
    });
    expect(badges.filter((badge) => badge.kind === "specialist" && badge.unlocked)).toHaveLength(1);
  });

  it("moves Photographe from 9 / 10 to unlocked with the 10th tasting with a photo, the tastings without photo do not count", async () => {
    const [beer] = findBeers(() => true, 1);
    for (let index = 0; index < 9; index += 1) {
      await drink(BOB_USER_ID, beer.id, minute("2025-09-01", index), true);
    }

    expect(await badgeOf(BOB_USER_ID, "photographer")).toMatchObject({ unlocked: false, current: 9, target: 10, unlockedAt: null });

    await drink(BOB_USER_ID, beer.id, minute("2025-09-01", 20));

    expect(await badgeOf(BOB_USER_ID, "photographer")).toMatchObject({ unlocked: false, current: 9 });

    await drink(BOB_USER_ID, beer.id, minute("2025-09-01", 30), true);

    expect(await badgeOf(BOB_USER_ID, "photographer")).toMatchObject({
      unlocked: true,
      current: 10,
      target: 10,
      unlockedAt: minute("2025-09-01", 30),
    });
  });

  it("moves Habitué from 2 / 3 to unlocked at the first tasting of the 3rd consecutive day, two tastings of a day being one day", async () => {
    const [beer] = findBeers(() => true, 1);
    await drink(ALICE_USER_ID, beer.id, minute("2025-10-10", 0));
    await drink(ALICE_USER_ID, beer.id, minute("2025-10-11", 0));
    await drink(ALICE_USER_ID, beer.id, minute("2025-10-11", 30));

    expect(await badgeOf(ALICE_USER_ID, "regular")).toMatchObject({ unlocked: false, current: 2, target: 3, unlockedAt: null });

    await drink(ALICE_USER_ID, beer.id, minute("2025-10-12", 5));
    await drink(ALICE_USER_ID, beer.id, minute("2025-10-12", 45));

    expect(await badgeOf(ALICE_USER_ID, "regular")).toMatchObject({
      unlocked: true,
      current: 3,
      target: 3,
      unlockedAt: minute("2025-10-12", 5),
    });
  });

  describe("Sentinelle", () => {
    const voteMinute = (index: number): string => `2025-10-13T12:${String(index).padStart(2, "0")}:00.000Z`;

    const readCouples = async (): Promise<{ venueId: number; beerId: number }[]> => {
      const venues = (
        await request(app.getHttpServer()).get(VENUES_PATH).set(USER_ID_HEADER_NAME, String(BOB_USER_ID))
      ).body as VenueDto[];
      const couples: { venueId: number; beerId: number }[] = [];
      for (const venue of venues) {
        if (couples.length === SENTINEL_TARGET) {
          break;
        }
        const response = await request(app.getHttpServer())
          .get(`${VENUES_PATH}/${venue.id}/beers`)
          .set(USER_ID_HEADER_NAME, String(BOB_USER_ID));
        expect(response.status).toBe(HttpStatus.OK);
        const [first] = response.body as VenueBeerDto[];
        if (first !== undefined) {
          couples.push({ venueId: venue.id, beerId: first.beerId });
        }
      }
      return couples;
    };

    const vote = async (userId: number, couple: { venueId: number; beerId: number }, sense: VoteSenseEnum, at: string): Promise<void> => {
      vi.setSystemTime(new Date(at));
      const response = await request(app.getHttpServer())
        .post(`${VENUES_PATH}/${couple.venueId}/beers/${couple.beerId}/votes`)
        .set(USER_ID_HEADER_NAME, String(userId))
        .send({ sense });
      vi.setSystemTime(new Date(NOW));
      expect(response.status).toBe(HttpStatus.CREATED);
    };

    it("keeps Sentinelle locked at 0 / 10 for a user who never voted, the anonymous votes of the seed counting for nobody", async () => {
      expect(await badgeOf(BOB_USER_ID, "sentinel")).toEqual({
        id: "sentinel",
        kind: "sentinel",
        family: null,
        unlocked: false,
        unlockedAt: null,
        current: 0,
        target: SENTINEL_TARGET,
        comingSoon: false,
      });
    });

    it("does not count the votes of another user", async () => {
      const couples = await readCouples();
      expect(couples).toHaveLength(SENTINEL_TARGET);
      for (const [index, couple] of couples.slice(0, 3).entries()) {
        await vote(ALICE_USER_ID, couple, VoteSenseEnum.STILL, voteMinute(index));
      }

      expect(await badgeOf(ALICE_USER_ID, "sentinel")).toMatchObject({ unlocked: false, current: 3 });
      expect(await badgeOf(BOB_USER_ID, "sentinel")).toMatchObject({ unlocked: false, current: 0, unlockedAt: null });
    });

    it("moves Sentinelle from 9 / 10 to unlocked dated at the 10th vote, both senses counting", async () => {
      const couples = await readCouples();
      for (const [index, couple] of couples.slice(0, 9).entries()) {
        await vote(BOB_USER_ID, couple, index % 2 === 0 ? VoteSenseEnum.STILL : VoteSenseEnum.GONE, voteMinute(index));
      }

      expect(await badgeOf(BOB_USER_ID, "sentinel")).toMatchObject({ unlocked: false, current: 9, target: SENTINEL_TARGET, unlockedAt: null });

      await vote(BOB_USER_ID, couples[9], VoteSenseEnum.GONE, voteMinute(9));

      expect(await badgeOf(BOB_USER_ID, "sentinel")).toMatchObject({
        unlocked: true,
        current: SENTINEL_TARGET,
        target: SENTINEL_TARGET,
        unlockedAt: voteMinute(9),
      });
    });
  });

  it("keeps Cartographe locked and coming soon for a user with many tastings", async () => {
    expect(await badgeOf(BOB_USER_ID, "cartographer")).toEqual({
      id: "cartographer",
      kind: "cartographer",
      family: null,
      unlocked: false,
      unlockedAt: null,
      current: 0,
      target: 1,
      comingSoon: true,
    });
  });

  describe("a first tasting of a community beer", () => {
    it("unlocks First sip, counts in the statistics and the journal, and moves neither Completist nor the family badge", async () => {
      const [official] = findBeers(() => true, 1);
      const proposal = await request(app.getHttpServer())
        .post(BEERS_PATH)
        .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID))
        .send({ styleId: official.styleId, name: "Brune du Mont", breweryName: "Brasserie du Mont", country: "FR", abv: 6.5 });
      expect(proposal.status).toBe(HttpStatus.CREATED);
      const community = proposal.body as BeerDetailDto;
      const readStats = async (): Promise<StatsDto> => {
        const response = await request(app.getHttpServer()).get(STATS_PATH).set(USER_ID_HEADER_NAME, String(CAROL_USER_ID));
        expect(response.status).toBe(HttpStatus.OK);
        return response.body as StatsDto;
      };
      const before = (await readBadges(CAROL_USER_ID)).body as BadgeDto[];
      const statsBefore = await readStats();
      const familyBadgeId = `specialist-${official.family}`;
      const completionistBefore = before.find((badge) => badge.id === "completionist");
      const explorerBefore = before.find((badge) => badge.id === "explorer");

      const communityTastingDate = minute("2025-06-01", 0);
      expect(before.find((badge) => badge.id === "firstSip")?.unlockedAt).not.toBeNull();

      const created = await drink(CAROL_USER_ID, community.id, communityTastingDate);

      const after = (await readBadges(CAROL_USER_ID)).body as BadgeDto[];
      expect(after.find((badge) => badge.id === "firstSip")).toMatchObject({
        unlocked: true,
        current: 1,
        unlockedAt: communityTastingDate,
      });
      expect(after.find((badge) => badge.id === "completionist")).toEqual(completionistBefore);
      expect(after.find((badge) => badge.id === familyBadgeId)).toEqual(before.find((badge) => badge.id === familyBadgeId));
      expect(after.filter((badge) => badge.kind === BadgeKindEnum.SPECIALIST)).toEqual(
        before.filter((badge) => badge.kind === BadgeKindEnum.SPECIALIST),
      );
      expect(after.find((badge) => badge.id === "explorer")?.current).toBe((explorerBefore?.current ?? 0) + 1);
      const statsAfter = await readStats();
      expect(statsAfter.checkinCount).toBe(statsBefore.checkinCount + 1);
      expect(statsAfter.discoveredCount).toBe(statsBefore.discoveredCount + 1);
      const journal = await request(app.getHttpServer())
        .get(CHECKINS_PATH)
        .query({ beerId: community.id })
        .set(USER_ID_HEADER_NAME, String(CAROL_USER_ID));
      expect(journal.status).toBe(HttpStatus.OK);
      expect(
        (journal.body as CheckinPageDto).items.map((item) => ({ id: item.id, beerId: item.beerId, beerName: item.beerName })),
      ).toEqual([{ id: created.checkin.id, beerId: community.id, beerName: community.name }]);
    });
  });
});
