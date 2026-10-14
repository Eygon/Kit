import { Injectable } from "@nestjs/common";
import { BeersService } from "@/modules/beers/beers.service";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import type { BadgeDto } from "@/modules/profile/dtos/badge.dto";
import { BadgeKindEnum } from "@/modules/profile/enums/badge-kind.enum";
import { toBadgeDto } from "@/modules/profile/mappers/badge.mapper";
import type { StatsDto } from "@/modules/profile/dtos/stats.dto";
import { toStatsDto } from "@/modules/profile/mappers/stats.mapper";
import {
  computeDayStreaks,
  findStreakCompletionDayKey,
  lastTwelveMonthKeys,
  toParisDayKey,
  toParisMonthKey,
} from "@/modules/profile/paris-calendar";
import {
  CARTOGRAPHER_TARGET,
  COLLECTOR_TARGET,
  EXPLORER_TARGET,
  FIRST_SIP_TARGET,
  GLOBETROTTER_TARGET,
  PHOTOGRAPHER_TARGET,
  REGULAR_STREAK_DAYS,
  SENTINEL_TARGET,
  STATS_ROUNDING_FACTOR,
} from "@/modules/profile/profile.constants";
import type { CatalogTotalsDto } from "@/modules/beers/dtos/catalog-totals.dto";
import type { CheckinRecordDto } from "@/modules/tastings/dtos/checkin-record.dto";
import { TastingsService } from "@/modules/tastings/tastings.service";
import type { VoteRecordDto } from "@/modules/venues/dtos/vote-record.dto";
import { VenuesService } from "@/modules/venues/venues.service";

const roundToTenth = (value: number): number => Math.round(value * STATS_ROUNDING_FACTOR) / STATS_ROUNDING_FACTOR;

const averageOf = (values: readonly number[]): number | null =>
  values.length === 0 ? null : roundToTenth(values.reduce((sum, value) => sum + value, 0) / values.length);

const countByCountry = (beers: readonly BeerDto[]): [string, number][] => {
  const counts = new Map<string, number>();
  for (const beer of beers) {
    counts.set(beer.country, (counts.get(beer.country) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([countryA, countA], [countryB, countB]) => countB - countA || countryA.localeCompare(countryB));
};

const findFavoriteFamily = (checkins: readonly CheckinRecordDto[], beersById: ReadonlyMap<number, BeerDto>): BeerFamilyEnum | null => {
  const counts = new Map<BeerFamilyEnum, number>();
  for (const checkin of checkins) {
    const family = beersById.get(checkin.beerId)?.family;
    if (family !== undefined) {
      counts.set(family, (counts.get(family) ?? 0) + 1);
    }
  }
  let favorite: BeerFamilyEnum | null = null;
  let favoriteCount = 0;
  for (const family of Object.values(BeerFamilyEnum)) {
    const count = counts.get(family) ?? 0;
    if (count > favoriteCount) {
      favorite = family;
      favoriteCount = count;
    }
  }
  return favorite;
};

const countByMonth = (checkins: readonly CheckinRecordDto[], now: Date): [string, number][] => {
  const counts = new Map<string, number>();
  for (const checkin of checkins) {
    const month = toParisMonthKey(checkin.drankAt);
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }
  return lastTwelveMonthKeys(now).map((month) => [month, counts.get(month) ?? 0]);
};

interface Discovery {
  readonly drankAt: string;
  readonly beer: BeerDto;
}

interface Progress {
  readonly current: number;
  readonly unlockedAt: string | null;
}

const findDiscoveries = (checkins: readonly CheckinRecordDto[], beersById: ReadonlyMap<number, BeerDto>): Discovery[] => {
  const seen = new Set<number>();
  const discoveries: Discovery[] = [];
  for (const checkin of checkins) {
    const beer = beersById.get(checkin.beerId);
    if (beer !== undefined && !seen.has(beer.id)) {
      seen.add(beer.id);
      discoveries.push({ drankAt: checkin.drankAt, beer });
    }
  }
  return discoveries;
};

const progressTowards = (target: number, dates: readonly string[]): Progress => ({
  current: Math.min(dates.length, target),
  unlockedAt: target > 0 && dates.length >= target ? dates[target - 1] : null,
});

const findGlobetrotterProgress = (discoveries: readonly Discovery[]): Progress => {
  const countries = new Set<string>();
  let unlockedAt: string | null = null;
  for (const discovery of discoveries) {
    countries.add(discovery.beer.country);
    if (unlockedAt === null && countries.size >= GLOBETROTTER_TARGET) {
      unlockedAt = discovery.drankAt;
    }
  }
  return { current: Math.min(countries.size, GLOBETROTTER_TARGET), unlockedAt };
};

const findRegularProgress = (checkins: readonly CheckinRecordDto[], now: Date): Progress => {
  const dayKeys = checkins.map((checkin) => toParisDayKey(checkin.drankAt));
  const completionDayKey = findStreakCompletionDayKey(dayKeys, REGULAR_STREAK_DAYS);
  const completion = checkins.find((checkin) => toParisDayKey(checkin.drankAt) === completionDayKey);
  const best = computeDayStreaks(dayKeys, toParisDayKey(now.toISOString())).best;
  return { current: Math.min(best, REGULAR_STREAK_DAYS), unlockedAt: completion?.drankAt ?? null };
};

const toBadges = (
  checkins: readonly CheckinRecordDto[],
  discoveries: readonly Discovery[],
  votes: readonly VoteRecordDto[],
  totals: CatalogTotalsDto,
  now: Date,
): BadgeDto[] => {
  const discoveryDates = discoveries.map((discovery) => discovery.drankAt);
  const totalsByFamily = new Map(totals.families.map((facet) => [facet.value, facet.count]));
  const milestone = (kind: BadgeKindEnum, target: number): BadgeDto =>
    toBadgeDto({ kind, family: null, target, comingSoon: false, ...progressTowards(target, discoveryDates) });
  const specialist = (family: BeerFamilyEnum): BadgeDto => {
    const target = totalsByFamily.get(family) ?? 0;
    const dates = discoveries.filter((discovery) => discovery.beer.family === family).map((discovery) => discovery.drankAt);
    return toBadgeDto({ kind: BadgeKindEnum.SPECIALIST, family, target, comingSoon: false, ...progressTowards(target, dates) });
  };
  const photoDates = checkins.filter((checkin) => checkin.photoId !== null).map((checkin) => checkin.drankAt);
  return [
    milestone(BadgeKindEnum.FIRST_SIP, FIRST_SIP_TARGET),
    milestone(BadgeKindEnum.EXPLORER, EXPLORER_TARGET),
    milestone(BadgeKindEnum.COLLECTOR, COLLECTOR_TARGET),
    milestone(BadgeKindEnum.COMPLETIONIST, totals.total),
    toBadgeDto({
      kind: BadgeKindEnum.GLOBETROTTER,
      family: null,
      target: GLOBETROTTER_TARGET,
      comingSoon: false,
      ...findGlobetrotterProgress(discoveries),
    }),
    ...Object.values(BeerFamilyEnum).map(specialist),
    toBadgeDto({
      kind: BadgeKindEnum.PHOTOGRAPHER,
      family: null,
      target: PHOTOGRAPHER_TARGET,
      comingSoon: false,
      ...progressTowards(PHOTOGRAPHER_TARGET, photoDates),
    }),
    toBadgeDto({
      kind: BadgeKindEnum.REGULAR,
      family: null,
      target: REGULAR_STREAK_DAYS,
      comingSoon: false,
      ...findRegularProgress(checkins, now),
    }),
    toBadgeDto({
      kind: BadgeKindEnum.SENTINEL,
      family: null,
      target: SENTINEL_TARGET,
      comingSoon: false,
      ...progressTowards(
        SENTINEL_TARGET,
        votes.map((vote) => vote.votedAt.toISOString()),
      ),
    }),
    toBadgeDto({
      kind: BadgeKindEnum.CARTOGRAPHER,
      family: null,
      current: 0,
      target: CARTOGRAPHER_TARGET,
      unlockedAt: null,
      comingSoon: true,
    }),
  ];
};

@Injectable()
export class ProfileService {
  constructor(
    private readonly tastingsService: TastingsService,
    private readonly beersService: BeersService,
    private readonly venuesService: VenuesService,
  ) {}

  async getStats(userId: number): Promise<StatsDto> {
    const checkins = await this.tastingsService.getUserCheckins(userId);
    const beerIds = [...new Set(checkins.map((checkin) => checkin.beerId))];
    const beers = await this.beersService.getBeersByIds(beerIds);
    const beersById = new Map(beers.map((beer) => [beer.id, beer]));
    const ratings = checkins.flatMap((checkin) => (checkin.rating === null ? [] : [checkin.rating]));
    const now = new Date();
    const streaks = computeDayStreaks(
      checkins.map((checkin) => toParisDayKey(checkin.drankAt)),
      toParisDayKey(now.toISOString()),
    );
    return toStatsDto(
      checkins.length,
      beers.length,
      averageOf(beers.map((beer) => beer.abv)),
      countByCountry(beers),
      findFavoriteFamily(checkins, beersById),
      averageOf(ratings),
      streaks.current,
      streaks.best,
      countByMonth(checkins, now),
    );
  }

  async getBadges(userId: number): Promise<BadgeDto[]> {
    const checkins = await this.tastingsService.getUserCheckins(userId);
    const votes = await this.venuesService.getUserVotes(userId);
    const beerIds = [...new Set(checkins.map((checkin) => checkin.beerId))];
    const [totals, beers] = await Promise.all([
      this.beersService.getCatalogTotals(),
      this.beersService.getBeersByIds(beerIds),
    ]);
    const discoveries = findDiscoveries(checkins, new Map(beers.map((beer) => [beer.id, beer])));
    return toBadges(checkins, discoveries, votes, totals, new Date());
  }
}
