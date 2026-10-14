import { Test } from "@nestjs/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BeersService } from "@/modules/beers/beers.service";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import type { BadgeDto } from "@/modules/profile/dtos/badge.dto";
import { ProfileService } from "@/modules/profile/profile.service";
import type { CheckinRecordDto } from "@/modules/tastings/dtos/checkin-record.dto";
import { TastingsService } from "@/modules/tastings/tastings.service";
import type { VoteRecordDto } from "@/modules/venues/dtos/vote-record.dto";
import { VoteSenseEnum } from "@/modules/venues/enums/vote-sense.enum";
import { VenuesService } from "@/modules/venues/venues.service";

const ALICE = 1;
const NOW = "2026-03-14T12:00:00.000Z";
const DEFAULT_DRANK_AT = "2026-03-14T18:30:00.000Z";
const TWELVE_MONTHS = [
  "2025-04",
  "2025-05",
  "2025-06",
  "2025-07",
  "2025-08",
  "2025-09",
  "2025-10",
  "2025-11",
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
] as const;

const monthly = (counts: Readonly<Record<string, number>> = {}): { month: string; count: number }[] =>
  TWELVE_MONTHS.map((month) => ({ month, count: counts[month] ?? 0 }));

const beer = (id: number, country: string, abv: number, family: BeerFamilyEnum): BeerDto => ({
  id,
  name: `Beer ${id}`,
  breweryName: "Brewery",
  country,
  styleId: 1,
  styleName: "Style",
  family,
  abv,
  aromas: [],
  formats: [],
  description: "",
  bitternessLevel: null,
  colorLevel: null,
  styleColorRange: null,
});

const checkin = (
  id: number,
  beerId: number,
  rating: number | null = null,
  drankAt: string = DEFAULT_DRANK_AT,
): CheckinRecordDto => ({
  id,
  userId: ALICE,
  beerId,
  drankAt,
  place: "Chez Alice",
  rating,
  aromas: [],
  format: BeerFormatEnum.BOTTLE,
  price: null,
  comment: "",
  photoId: null,
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ProfileService", () => {
  const tastingsService = { getUserCheckins: vi.fn() };
  const beersService = { getBeersByIds: vi.fn(), getCatalogTotals: vi.fn() };
  const venuesService = { getUserVotes: vi.fn() };
  let service: ProfileService;

  const givenTastings = (checkins: CheckinRecordDto[], beers: BeerDto[]): void => {
    tastingsService.getUserCheckins.mockResolvedValue(checkins);
    beersService.getBeersByIds.mockResolvedValue(beers);
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    venuesService.getUserVotes.mockResolvedValue([]);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(NOW));
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: TastingsService, useValue: tastingsService },
        { provide: BeersService, useValue: beersService },
        { provide: VenuesService, useValue: venuesService },
      ],
    }).compile();
    service = moduleRef.get(ProfileService);
  });

  it("answers zero counts, null averages and favorite family and no country without any check-in", async () => {
    givenTastings([], []);

    expect(await service.getStats(ALICE)).toStrictEqual({
      checkinCount: 0,
      discoveredCount: 0,
      averageAbv: null,
      countries: [],
      favoriteFamily: null,
      averageRating: null,
      currentStreak: 0,
      bestStreak: 0,
      monthlyCheckins: monthly(),
    });
    expect(tastingsService.getUserCheckins).toHaveBeenCalledExactlyOnceWith(ALICE);
    expect(beersService.getBeersByIds).toHaveBeenCalledExactlyOnceWith([]);
  });

  it("counts a beer drunk twice once for the degree and the country, and averages the ratings that exist", async () => {
    const orval = beer(12, "BE", 6.2, BeerFamilyEnum.TRAPPIST);
    const hell = beer(40, "DE", 4.9, BeerFamilyEnum.LAGER);
    givenTastings([checkin(1, 12, 4), checkin(2, 12, 5), checkin(3, 40)], [orval, hell]);

    expect(await service.getStats(ALICE)).toStrictEqual({
      checkinCount: 3,
      discoveredCount: 2,
      averageAbv: 5.6,
      countries: [{ country: "BE", count: 1 }, { country: "DE", count: 1 }],
      favoriteFamily: BeerFamilyEnum.TRAPPIST,
      averageRating: 4.5,
      currentStreak: 1,
      bestStreak: 1,
      monthlyCheckins: monthly({ "2026-03": 3 }),
    });
    expect(beersService.getBeersByIds).toHaveBeenCalledExactlyOnceWith([12, 40]);
  });

  it("rounds an average ending in 5 hundredths up to the next tenth", async () => {
    givenTastings([checkin(1, 1), checkin(2, 2)], [beer(1, "BE", 5, BeerFamilyEnum.LAGER), beer(2, "BE", 5.5, BeerFamilyEnum.LAGER)]);

    expect((await service.getStats(ALICE)).averageAbv).toBe(5.3);
  });

  it("rounds the average rating to the tenth", async () => {
    givenTastings([checkin(1, 1, 4), checkin(2, 1, 4), checkin(3, 1, 5)], [beer(1, "BE", 5, BeerFamilyEnum.LAGER)]);

    expect((await service.getStats(ALICE)).averageRating).toBe(4.3);
  });

  it("has no average rating when no check-in is rated", async () => {
    givenTastings([checkin(1, 1)], [beer(1, "BE", 5, BeerFamilyEnum.LAGER)]);

    expect((await service.getStats(ALICE)).averageRating).toBeNull();
  });

  it("sorts the countries by count descending, then by country code", async () => {
    givenTastings(
      [checkin(1, 1), checkin(2, 2), checkin(3, 3), checkin(4, 4), checkin(5, 5)],
      [
        beer(1, "FR", 5, BeerFamilyEnum.LAGER),
        beer(2, "BE", 5, BeerFamilyEnum.LAGER),
        beer(3, "DE", 5, BeerFamilyEnum.LAGER),
        beer(4, "DE", 5, BeerFamilyEnum.LAGER),
        beer(5, "AT", 5, BeerFamilyEnum.LAGER),
      ],
    );

    expect((await service.getStats(ALICE)).countries).toStrictEqual([
      { country: "DE", count: 2 },
      { country: "AT", count: 1 },
      { country: "BE", count: 1 },
      { country: "FR", count: 1 },
    ]);
  });

  it("picks the first family of the enum order when two families have as many check-ins", async () => {
    givenTastings(
      [checkin(1, 1), checkin(2, 2)],
      [beer(1, "BE", 5, BeerFamilyEnum.STOUT), beer(2, "BE", 5, BeerFamilyEnum.PILSNER)],
    );

    expect((await service.getStats(ALICE)).favoriteFamily).toBe(BeerFamilyEnum.PILSNER);
  });

  it("picks the first family of the enum order on a tie whatever the order of the check-ins", async () => {
    givenTastings(
      [checkin(1, 2), checkin(2, 1)],
      [beer(1, "BE", 5, BeerFamilyEnum.STOUT), beer(2, "BE", 5, BeerFamilyEnum.PILSNER)],
    );

    expect((await service.getStats(ALICE)).favoriteFamily).toBe(BeerFamilyEnum.PILSNER);
  });

  it("prefers the family with the most check-ins over the family with the most beers", async () => {
    givenTastings(
      [checkin(1, 1), checkin(2, 2), checkin(3, 3), checkin(4, 3), checkin(5, 3)],
      [beer(1, "BE", 5, BeerFamilyEnum.LAGER), beer(2, "BE", 5, BeerFamilyEnum.LAGER), beer(3, "BE", 5, BeerFamilyEnum.STOUT)],
    );

    expect((await service.getStats(ALICE)).favoriteFamily).toBe(BeerFamilyEnum.STOUT);
  });

  describe("streaks", () => {
    const lager = [beer(1, "BE", 5, BeerFamilyEnum.LAGER)];
    const onDays = (...isos: string[]): CheckinRecordDto[] =>
      isos.map((drankAt, index) => checkin(index + 1, 1, null, drankAt));

    it("counts a current streak of 3 for tastings on the last 3 days including today", async () => {
      givenTastings(onDays("2026-03-12T10:00:00.000Z", "2026-03-13T10:00:00.000Z", "2026-03-14T10:00:00.000Z"), lager);

      const stats = await service.getStats(ALICE);

      expect(stats.currentStreak).toBe(3);
      expect(stats.bestStreak).toBe(3);
    });

    it("still counts the current streak when the last tasting is yesterday", async () => {
      givenTastings(onDays("2026-03-12T10:00:00.000Z", "2026-03-13T10:00:00.000Z"), lager);

      expect((await service.getStats(ALICE)).currentStreak).toBe(2);
    });

    it("answers a current streak of 0 when the last tasting is the day before yesterday", async () => {
      givenTastings(onDays("2026-03-11T10:00:00.000Z", "2026-03-12T10:00:00.000Z"), lager);

      const stats = await service.getStats(ALICE);

      expect(stats.currentStreak).toBe(0);
      expect(stats.bestStreak).toBe(2);
    });

    it("counts 23:30 and 00:30 Paris as two consecutive days, and two tastings of one day as one", async () => {
      givenTastings(
        onDays("2026-03-12T22:30:00.000Z", "2026-03-12T23:30:00.000Z", "2026-03-12T23:45:00.000Z"),
        lager,
      );

      const stats = await service.getStats(ALICE);

      expect(stats.currentStreak).toBe(2);
      expect(stats.bestStreak).toBe(2);
    });

    it("tells apart a past best streak of 5 days from a current streak of 2 days", async () => {
      givenTastings(
        onDays(
          "2026-02-01T10:00:00.000Z",
          "2026-02-02T10:00:00.000Z",
          "2026-02-03T10:00:00.000Z",
          "2026-02-04T10:00:00.000Z",
          "2026-02-05T10:00:00.000Z",
          "2026-03-13T10:00:00.000Z",
          "2026-03-14T10:00:00.000Z",
        ),
        lager,
      );

      const stats = await service.getStats(ALICE);

      expect(stats.currentStreak).toBe(2);
      expect(stats.bestStreak).toBe(5);
    });

    it("takes today in Paris when the clock is still on the previous day in UTC", async () => {
      vi.setSystemTime(new Date("2026-03-14T23:30:00.000Z"));
      givenTastings(onDays("2026-03-15T08:00:00.000Z"), lager);

      expect((await service.getStats(ALICE)).currentStreak).toBe(1);
    });

    it("links the days across the autumn clock change", async () => {
      vi.setSystemTime(new Date("2026-10-26T12:00:00.000Z"));
      givenTastings(onDays("2026-10-24T12:00:00.000Z", "2026-10-25T22:30:00.000Z", "2026-10-26T08:00:00.000Z"), lager);

      const stats = await service.getStats(ALICE);

      expect(stats.currentStreak).toBe(3);
      expect(stats.bestStreak).toBe(3);
    });
  });

  describe("monthly check-ins", () => {
    const lager = [beer(1, "BE", 5, BeerFamilyEnum.LAGER)];

    it("lists exactly 12 months from the oldest to the current one, with 0 for the months without tasting", async () => {
      givenTastings([checkin(1, 1, null, "2025-12-10T10:00:00.000Z"), checkin(2, 1, null, "2025-12-11T10:00:00.000Z")], lager);

      const stats = await service.getStats(ALICE);

      expect(stats.monthlyCheckins).toHaveLength(12);
      expect(stats.monthlyCheckins).toStrictEqual(monthly({ "2025-12": 2 }));
    });

    it("counts the last evening of a month in the Paris month and the first night of the next one in the next month", async () => {
      givenTastings(
        [
          checkin(1, 1, null, "2026-01-31T22:30:00.000Z"),
          checkin(2, 1, null, "2026-01-31T23:30:00.000Z"),
          checkin(3, 1, null, "2026-02-28T23:30:00.000Z"),
        ],
        lager,
      );

      expect((await service.getStats(ALICE)).monthlyCheckins).toStrictEqual(
        monthly({ "2026-01": 1, "2026-02": 1, "2026-03": 1 }),
      );
    });

    it("ignores a tasting older than the 12 months window", async () => {
      givenTastings([checkin(1, 1, null, "2025-03-31T10:00:00.000Z"), checkin(2, 1, null, "2025-04-01T10:00:00.000Z")], lager);

      expect((await service.getStats(ALICE)).monthlyCheckins).toStrictEqual(monthly({ "2025-04": 1 }));
    });
  });

  describe("getBadges", () => {
    const FAMILIES = Object.values(BeerFamilyEnum);
    const PHOTO_ID = "3f2b8c1e-5d4a-4e6b-9a7c-1d2e3f4a5b6c";
    const CATALOG_SIZE = 120;
    const FAMILY_SIZE = 2;
    const TOTALS = {
      total: CATALOG_SIZE,
      families: FAMILIES.map((value) => ({ value, count: FAMILY_SIZE })),
    };
    const SPECIALIST_IDS = FAMILIES.map((family) => `specialist-${family}`);

    const minute = (index: number): string => new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString();
    const withPhoto = (record: CheckinRecordDto): CheckinRecordDto => ({ ...record, photoId: PHOTO_ID });
    const sequence = (count: number): { checkins: CheckinRecordDto[]; beers: BeerDto[] } => ({
      checkins: Array.from({ length: count }, (_, index) => checkin(index + 1, index + 1, null, minute(index))),
      beers: Array.from({ length: count }, (_, index) => beer(index + 1, "BE", 5, BeerFamilyEnum.LAGER)),
    });
    const givenBadges = (
      checkins: CheckinRecordDto[],
      beers: BeerDto[],
      totals: { total: number; families: { value: string; count: number }[] } = TOTALS,
    ): void => {
      tastingsService.getUserCheckins.mockResolvedValue(checkins);
      beersService.getBeersByIds.mockResolvedValue(beers);
      beersService.getCatalogTotals.mockResolvedValue(totals);
    };
    const badgeOf = async (id: string): Promise<BadgeDto | undefined> =>
      (await service.getBadges(ALICE)).find((badge) => badge.id === id);

    it("answers the 27 badges in the contract order, all locked at 0, with Cartographe coming soon", async () => {
      givenBadges([], []);

      const badges = await service.getBadges(ALICE);

      expect(badges.map((badge) => badge.id)).toStrictEqual([
        "firstSip",
        "explorer",
        "collector",
        "completionist",
        "globetrotter",
        ...SPECIALIST_IDS,
        "photographer",
        "regular",
        "sentinel",
        "cartographer",
      ]);
      expect(badges).toHaveLength(27);
      expect(badges.map((badge) => badge.target)).toStrictEqual([
        1,
        10,
        50,
        CATALOG_SIZE,
        5,
        ...FAMILIES.map(() => FAMILY_SIZE),
        10,
        3,
        10,
        1,
      ]);
      expect(badges.every((badge) => !badge.unlocked && badge.unlockedAt === null && badge.current === 0)).toBe(true);
      expect(badges.filter((badge) => badge.comingSoon).map((badge) => badge.id)).toStrictEqual(["cartographer"]);
      expect(badges[5]).toStrictEqual({
        id: "specialist-lager",
        kind: "specialist",
        family: "lager",
        unlocked: false,
        unlockedAt: null,
        current: 0,
        target: FAMILY_SIZE,
        comingSoon: false,
      });
      expect(badges[0]).toStrictEqual({
        id: "firstSip",
        kind: "firstSip",
        family: null,
        unlocked: false,
        unlockedAt: null,
        current: 0,
        target: 1,
        comingSoon: false,
      });
      expect(tastingsService.getUserCheckins).toHaveBeenCalledExactlyOnceWith(ALICE);
      expect(beersService.getBeersByIds).toHaveBeenCalledExactlyOnceWith([]);
      expect(beersService.getCatalogTotals).toHaveBeenCalledOnce();
      expect(venuesService.getUserVotes).toHaveBeenCalledExactlyOnceWith(ALICE);
    });

    it("asks the beers of the check-ins once each", async () => {
      const { checkins, beers } = sequence(3);
      givenBadges([...checkins, checkin(4, 2, null, minute(10))], beers);

      await service.getBadges(ALICE);

      expect(beersService.getBeersByIds).toHaveBeenCalledExactlyOnceWith([1, 2, 3]);
    });

    it.each([
      ["firstSip", 0, 0, 1, false],
      ["firstSip", 1, 1, 1, true],
      ["explorer", 9, 9, 10, false],
      ["explorer", 10, 10, 10, true],
      ["collector", 49, 49, 50, false],
      ["collector", 50, 50, 50, true],
      ["completionist", 119, 119, CATALOG_SIZE, false],
      ["completionist", 120, 120, CATALOG_SIZE, true],
    ])("answers %s at %i discovered beers as %i / %i, unlocked %s", async (id, discovered, current, target, unlocked) => {
      const { checkins, beers } = sequence(discovered);
      givenBadges(checkins, beers);

      expect(await badgeOf(id)).toMatchObject({
        unlocked,
        current,
        target,
        unlockedAt: unlocked ? minute(target - 1) : null,
        comingSoon: false,
      });
    });

    it("follows the size of the catalog for the target of Completiste", async () => {
      const { checkins, beers } = sequence(5);
      const smallCatalog = { total: 5, families: TOTALS.families };

      givenBadges(checkins.slice(0, 4), beers.slice(0, 4), smallCatalog);
      expect(await badgeOf("completionist")).toMatchObject({ unlocked: false, current: 4, target: 5, unlockedAt: null });

      givenBadges(checkins, beers, smallCatalog);
      expect(await badgeOf("completionist")).toMatchObject({ unlocked: true, current: 5, target: 5, unlockedAt: minute(4) });
    });

    it("caps the progress at the target once the threshold is passed", async () => {
      const { checkins, beers } = sequence(12);
      givenBadges(checkins, beers);

      expect(await badgeOf("explorer")).toMatchObject({ unlocked: true, current: 10, target: 10, unlockedAt: minute(9) });
    });

    it("dates a badge with the first check-in of the beer that crosses the threshold, and counts a beer once", async () => {
      const { checkins, beers } = sequence(10);
      givenBadges(
        [
          ...checkins.slice(0, 9),
          checkin(11, 1, null, minute(20)),
          checkins[9],
          checkin(12, 10, null, minute(50)),
        ].sort((first, second) => first.drankAt.localeCompare(second.drankAt)),
        beers,
      );

      expect(await badgeOf("explorer")).toMatchObject({ unlocked: true, current: 10, unlockedAt: minute(9) });
    });

    it("does not unlock Explorateur with 10 check-ins of 9 beers", async () => {
      const { checkins, beers } = sequence(9);
      givenBadges([...checkins, checkin(10, 9, null, minute(30))], beers);

      expect(await badgeOf("explorer")).toMatchObject({ unlocked: false, current: 9, unlockedAt: null });
    });

    it("dates the badge with the common date of two check-ins on the same date that cross the threshold together", async () => {
      const { checkins, beers } = sequence(10);
      const sameDate = minute(9);
      givenBadges([...checkins.slice(0, 8), checkin(9, 9, null, sameDate), checkin(10, 10, null, sameDate)], beers);

      expect(await badgeOf("explorer")).toMatchObject({ unlocked: true, current: 10, unlockedAt: sameDate });
    });

    it("moves Globe-trotter from 4 / 5 to unlocked at the discovery that brings the 5th country", async () => {
      const countries = ["BE", "BE", "FR", "DE", "NL"];
      const beers = countries.map((country, index) => beer(index + 1, country, 5, BeerFamilyEnum.LAGER));
      const checkins = beers.map((record, index) => checkin(index + 1, record.id, null, minute(index)));
      givenBadges(checkins, beers);

      expect(await badgeOf("globetrotter")).toMatchObject({ unlocked: false, current: 4, target: 5, unlockedAt: null });

      const fifth = beer(6, "IT", 5, BeerFamilyEnum.LAGER);
      givenBadges(
        [...checkins, checkin(6, 6, null, minute(5)), checkin(7, 1, null, minute(6))],
        [...beers, fifth],
      );

      expect(await badgeOf("globetrotter")).toMatchObject({ unlocked: true, current: 5, target: 5, unlockedAt: minute(5) });
    });

    it("keeps Globe-trotter capped at 5 and dated at the 5th country when a 6th one comes", async () => {
      const beers = ["BE", "FR", "DE", "NL", "IT", "ES"].map((country, index) =>
        beer(index + 1, country, 5, BeerFamilyEnum.LAGER),
      );
      givenBadges(
        beers.map((record, index) => checkin(index + 1, record.id, null, minute(index))),
        beers,
      );

      expect(await badgeOf("globetrotter")).toMatchObject({ current: 5, unlockedAt: minute(4) });
    });

    it("unlocks the Specialist of a family when all its beers are discovered, the others keep their progress", async () => {
      const beers = [
        beer(1, "GB", 5, BeerFamilyEnum.PORTER),
        beer(2, "BE", 5, BeerFamilyEnum.LAGER),
        beer(3, "GB", 5, BeerFamilyEnum.PORTER),
      ];
      const checkins = [checkin(1, 1, null, minute(0)), checkin(2, 2, null, minute(1))];
      givenBadges(checkins, beers);

      expect(await badgeOf("specialist-porter")).toMatchObject({ unlocked: false, current: 1, target: 2, unlockedAt: null });

      givenBadges([...checkins, checkin(3, 3, null, minute(2)), checkin(4, 1, null, minute(3))], beers);

      const badges = await service.getBadges(ALICE);
      expect(badges.find((badge) => badge.id === "specialist-porter")).toStrictEqual({
        id: "specialist-porter",
        kind: "specialist",
        family: "porter",
        unlocked: true,
        unlockedAt: minute(2),
        current: 2,
        target: 2,
        comingSoon: false,
      });
      expect(badges.find((badge) => badge.id === "specialist-lager")).toMatchObject({
        unlocked: false,
        current: 1,
        target: 2,
      });
      expect(badges.filter((badge) => badge.kind === "specialist" && badge.unlocked)).toHaveLength(1);
    });

    it("never unlocks the Specialist of a family without any beer in the catalog", async () => {
      const totals = { total: CATALOG_SIZE, families: TOTALS.families.map((facet) => ({ ...facet, count: facet.value === "saison" ? 0 : facet.count })) };
      givenBadges([], [], totals);

      expect(await badgeOf("specialist-saison")).toMatchObject({
        unlocked: false,
        unlockedAt: null,
        current: 0,
        target: 0,
      });
    });

    it("treats a family missing from the catalog totals as empty", async () => {
      givenBadges([], [], { total: CATALOG_SIZE, families: [] });

      expect(await badgeOf("specialist-stout")).toMatchObject({ unlocked: false, current: 0, target: 0 });
    });

    it("counts only the check-ins with a photo for Photographe, dated at the 10th one", async () => {
      const lager = [beer(1, "BE", 5, BeerFamilyEnum.LAGER)];
      const photos = Array.from({ length: 9 }, (_, index) => withPhoto(checkin(index + 1, 1, null, minute(index * 2))));
      const noPhotos = Array.from({ length: 5 }, (_, index) => checkin(20 + index, 1, null, minute(index * 2 + 1)));
      givenBadges([...photos, ...noPhotos], lager);

      expect(await badgeOf("photographer")).toMatchObject({ unlocked: false, current: 9, target: 10, unlockedAt: null });

      givenBadges([...photos, ...noPhotos, withPhoto(checkin(40, 1, null, minute(40)))], lager);

      expect(await badgeOf("photographer")).toMatchObject({ unlocked: true, current: 10, target: 10, unlockedAt: minute(40) });
    });

    describe("Habitué", () => {
      const lager = [beer(1, "BE", 5, BeerFamilyEnum.LAGER)];
      const onDays = (...isos: string[]): CheckinRecordDto[] => isos.map((drankAt, index) => checkin(index + 1, 1, null, drankAt));

      it("answers 2 / 3 for 2 consecutive days, and 1 day for several check-ins on the same day", async () => {
        givenBadges(onDays("2026-03-12T10:00:00.000Z", "2026-03-13T10:00:00.000Z", "2026-03-13T11:00:00.000Z", "2026-03-13T12:00:00.000Z"), lager);

        expect(await badgeOf("regular")).toMatchObject({ unlocked: false, current: 2, target: 3, unlockedAt: null });

        givenBadges(onDays("2026-03-13T10:00:00.000Z", "2026-03-13T11:00:00.000Z", "2026-03-13T12:00:00.000Z"), lager);

        expect(await badgeOf("regular")).toMatchObject({ unlocked: false, current: 1 });
      });

      it("unlocks at the first check-in of the 3rd consecutive day", async () => {
        givenBadges(
          onDays(
            "2026-03-12T10:00:00.000Z",
            "2026-03-13T10:00:00.000Z",
            "2026-03-14T09:00:00.000Z",
            "2026-03-14T18:00:00.000Z",
          ),
          lager,
        );

        expect(await badgeOf("regular")).toMatchObject({
          unlocked: true,
          current: 3,
          target: 3,
          unlockedAt: "2026-03-14T09:00:00.000Z",
        });
      });

      it("caps the progress at 3 for a longer streak and dates it at the 3rd day", async () => {
        givenBadges(
          onDays(
            "2026-03-10T10:00:00.000Z",
            "2026-03-11T10:00:00.000Z",
            "2026-03-12T10:00:00.000Z",
            "2026-03-13T10:00:00.000Z",
            "2026-03-14T10:00:00.000Z",
          ),
          lager,
        );

        expect(await badgeOf("regular")).toMatchObject({ current: 3, unlockedAt: "2026-03-12T10:00:00.000Z" });
      });

      it("reads the days in Paris time, 23:30 and 00:30 being two consecutive days", async () => {
        givenBadges(
          onDays("2026-03-12T22:30:00.000Z", "2026-03-12T23:30:00.000Z", "2026-03-13T23:30:00.000Z"),
          lager,
        );

        expect(await badgeOf("regular")).toMatchObject({ unlocked: true, current: 3, unlockedAt: "2026-03-13T23:30:00.000Z" });
      });

      it("does not link two runs separated by an empty day", async () => {
        givenBadges(onDays("2026-03-10T10:00:00.000Z", "2026-03-11T10:00:00.000Z", "2026-03-13T10:00:00.000Z"), lager);

        expect(await badgeOf("regular")).toMatchObject({ unlocked: false, current: 2 });
      });
    });

    describe("Sentinelle", () => {
      const SENTINEL_DAY = "2026-02-";
      const vote = (day: number, sense: VoteSenseEnum = VoteSenseEnum.STILL): VoteRecordDto => ({
        userId: ALICE,
        sense,
        votedAt: new Date(`${SENTINEL_DAY}${String(day).padStart(2, "0")}T09:00:00.000Z`),
      });
      const votes = (count: number): VoteRecordDto[] => Array.from({ length: count }, (_, index) => vote(index + 1));

      it("is locked at 0 / 10 without any vote", async () => {
        givenBadges([], []);

        expect(await badgeOf("sentinel")).toStrictEqual({
          id: "sentinel",
          kind: "sentinel",
          family: null,
          unlocked: false,
          unlockedAt: null,
          current: 0,
          target: 10,
          comingSoon: false,
        });
      });

      it("is at 9 / 10 and locked with 9 votes", async () => {
        givenBadges([], []);
        venuesService.getUserVotes.mockResolvedValue(votes(9));

        expect(await badgeOf("sentinel")).toMatchObject({ unlocked: false, unlockedAt: null, current: 9, target: 10 });
      });

      it("unlocks at the 10th vote and dates it with that vote", async () => {
        givenBadges([], []);
        venuesService.getUserVotes.mockResolvedValue(votes(10));

        expect(await badgeOf("sentinel")).toMatchObject({
          unlocked: true,
          unlockedAt: "2026-02-10T09:00:00.000Z",
          current: 10,
          target: 10,
        });
      });

      it("stays capped at 10 and dated at the 10th vote when an 11th one comes", async () => {
        givenBadges([], []);
        venuesService.getUserVotes.mockResolvedValue(votes(11));

        expect(await badgeOf("sentinel")).toMatchObject({
          unlocked: true,
          unlockedAt: "2026-02-10T09:00:00.000Z",
          current: 10,
        });
      });

      it("counts the votes in both senses", async () => {
        givenBadges([], []);
        venuesService.getUserVotes.mockResolvedValue([
          ...Array.from({ length: 5 }, (_, index) => vote(index + 1, VoteSenseEnum.STILL)),
          ...Array.from({ length: 5 }, (_, index) => vote(index + 6, VoteSenseEnum.GONE)),
        ]);

        expect(await badgeOf("sentinel")).toMatchObject({ unlocked: true, current: 10, unlockedAt: "2026-02-10T09:00:00.000Z" });
      });

      it("is independent of the check-ins", async () => {
        const { checkins, beers } = sequence(12);
        givenBadges(checkins, beers);
        venuesService.getUserVotes.mockResolvedValue(votes(2));

        expect(await badgeOf("sentinel")).toMatchObject({ unlocked: false, current: 2 });
      });
    });

    it("keeps Cartographe locked, at 0 and coming soon whatever the tastings", async () => {
      const { checkins, beers } = sequence(60);
      givenBadges(checkins, beers);

      expect(await badgeOf("cartographer")).toStrictEqual({
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
  });
});
