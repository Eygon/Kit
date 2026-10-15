import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { hasApproximableWord, matchesApproximately } from "@/common/text/matches-approximately";
import { normalizeSearchText } from "@/common/text/normalize-search-text";
import {
  BEER_ABV_MAX_DECIMAL_PLACES,
  BEER_AROMAS_MAX,
  BEER_EBC_MAX,
  BEER_EBC_MIN,
  BEER_FORMATS_MAX,
  BEER_IBU_MAX,
  BEER_IBU_MIN,
  BEER_LIST_MIN_ITEMS,
  BEER_PAGE_SIZE_DEFAULT,
  BEER_PROPOSAL_ABV_MAX_PERCENT,
  BEER_PROPOSAL_WINDOW_HOURS,
  BEER_PROPOSAL_WINDOW_MS,
  BEER_PROPOSALS_PER_WINDOW_MAX,
  BEER_SCALE_MAX,
  BEER_SCALE_MIN,
  CORRECTION_QUORUM,
  CORRECTION_WINDOW_HOURS,
  CORRECTION_WINDOW_MS,
  CORRECTIONS_PER_WINDOW_MAX,
  CORRECTIONS_RECENTLY_CLOSED_LIMIT,
  REVIEW_PAGE_SIZE,
} from "@/modules/beers/beers.constants";
import { BeersRepository } from "@/modules/beers/beers.repository";
import type { BeerFacetsDto } from "@/modules/beers/dtos/beer-facets.dto";
import type { BeerSliceDto } from "@/modules/beers/dtos/beer-slice.dto";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import type { CorrectionBoardDto, CorrectionTallyDto, CorrectionUserVoteDto, VotedCorrectionDto } from "@/modules/beers/dtos/correction-board.dto";
import type { CorrectionDto } from "@/modules/beers/dtos/correction.dto";
import type { SaveCorrectionVoteDto } from "@/modules/beers/dtos/save-correction-vote.dto";
import type { CharacteristicValue, CorrectionRecordDto } from "@/modules/beers/dtos/correction-record.dto";
import type { CreateCorrectionDto } from "@/modules/beers/dtos/create-correction.dto";
import type { CreateBeerDto } from "@/modules/beers/dtos/create-beer.dto";
import type { ReviewDto } from "@/modules/beers/dtos/review.dto";
import type { ReviewRecordDto } from "@/modules/beers/dtos/review-record.dto";
import type { ReviewPageDto } from "@/modules/beers/dtos/review-page.dto";
import type { ReviewsQueryDto } from "@/modules/beers/dtos/reviews-query.dto";
import type { UpsertReviewDto } from "@/modules/beers/dtos/upsert-review.dto";
import type { CatalogTotalsDto } from "@/modules/beers/dtos/catalog-totals.dto";
import type { BeerFilters } from "@/modules/beers/dtos/beer-filters.dto";
import type { BeerPageDto } from "@/modules/beers/dtos/beer-page.dto";
import type { BreweryDto } from "@/modules/beers/dtos/brewery.dto";
import type { BeerStyleGroupDto } from "@/modules/beers/dtos/beer-style-group.dto";
import type { BeersQueryDto } from "@/modules/beers/dtos/beers-query.dto";
import type { BeerDetailDto } from "@/modules/beers/dtos/beer-detail.dto";
import { BeerAromaEnum } from "@/modules/beers/enums/beer-aroma.enum";
import { BeerCharacteristicEnum } from "@/modules/beers/enums/beer-characteristic.enum";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import { BeerSortEnum } from "@/modules/beers/enums/beer-sort.enum";
import { BeerStatusEnum } from "@/modules/beers/enums/beer-status.enum";
import { CorrectionStatusEnum } from "@/modules/beers/enums/correction-status.enum";
import { CorrectionVoteSenseEnum } from "@/modules/beers/enums/correction-vote-sense.enum";
import { toBeerDetailDto, toCatalogBeerDto, toNewBeer } from "@/modules/beers/mappers/beer.mapper";
import {
  readCharacteristicValue,
  toBeerCharacteristicChange,
  toCorrectionBoardDto,
  toCorrectionDto,
  toNewCorrection,
  toNewCorrectionVote,
} from "@/modules/beers/mappers/correction.mapper";
import type { BeerCharacteristicChange } from "@/modules/beers/mappers/correction.mapper";
import { toNewBrewery } from "@/modules/beers/mappers/brewery.mapper";
import { toNewReview, toReviewDto, toReviewPageDto } from "@/modules/beers/mappers/review.mapper";
import { TastingsService } from "@/modules/tastings/tastings.service";
import type { UserDto } from "@/modules/users/dtos/user.dto";
import { UsersService } from "@/modules/users/users.service";

const FIRST_PAGE = 1;

const PROPOSER_AGREE_COUNT = 1;

const NEW_CORRECTION_DISAGREE_COUNT = 0;

const countOfSense = (tallies: readonly CorrectionTallyDto[], correctionId: number, sense: CorrectionVoteSenseEnum): number =>
  tallies.find((tally) => tally.correctionId === correctionId && tally.sense === sense)?.count ?? 0;

const findVoteSense = (votes: readonly CorrectionUserVoteDto[], correctionId: number): CorrectionVoteSenseEnum | null =>
  votes.find((vote) => vote.correctionId === correctionId)?.sense ?? null;

const isPending = (correction: VotedCorrectionDto): boolean => !correction.isMine && correction.myVote === null;

const isAccepted = (agreeCount: number, disagreeCount: number): boolean => agreeCount > disagreeCount && agreeCount >= CORRECTION_QUORUM;

const findBeerOfCorrection = (beers: readonly BeerDto[], record: CorrectionRecordDto): BeerDto => {
  const beer = beers.find((candidate) => candidate.id === record.beerId);
  if (beer === undefined) {
    throw new Error(`Beer ${record.beerId} of correction ${record.id} not found.`);
  }
  return beer;
};

const toUniqueBeerIds = (records: readonly CorrectionRecordDto[]): number[] => [...new Set(records.map((record) => record.beerId))];

interface CorrectionResolution {
  readonly id: number;
  readonly status: CorrectionStatusEnum;
  readonly previousValue: string;
  readonly beerId: number;
  readonly beerChange: BeerCharacteristicChange | null;
}

const ABV_MIN_PERCENT = 0;

const DECIMAL_TOLERANCE = 1e-9;

interface IntegerBounds {
  readonly min: number;
  readonly max: number;
}

const SCALE_BOUNDS: IntegerBounds = { min: BEER_SCALE_MIN, max: BEER_SCALE_MAX };

const INTEGER_BOUNDS: Readonly<Partial<Record<BeerCharacteristicEnum, IntegerBounds>>> = {
  [BeerCharacteristicEnum.IBU]: { min: BEER_IBU_MIN, max: BEER_IBU_MAX },
  [BeerCharacteristicEnum.EBC]: { min: BEER_EBC_MIN, max: BEER_EBC_MAX },
  [BeerCharacteristicEnum.SWEETNESS]: SCALE_BOUNDS,
  [BeerCharacteristicEnum.ACIDITY]: SCALE_BOUNDS,
  [BeerCharacteristicEnum.BODY]: SCALE_BOUNDS,
};

const AROMA_VALUES: readonly string[] = Object.values(BeerAromaEnum);

const FORMAT_VALUES: readonly string[] = Object.values(BeerFormatEnum);

const hasAtMostDecimals = (value: number, places: number): boolean => {
  const scaled = value * 10 ** places;
  return Math.abs(scaled - Math.round(scaled)) < DECIMAL_TOLERANCE;
};

const isDistinctMembers = (value: unknown, allowed: readonly string[], max: number): boolean =>
  Array.isArray(value) &&
  value.length >= BEER_LIST_MIN_ITEMS &&
  value.length <= max &&
  value.every((item) => typeof item === "string" && allowed.includes(item)) &&
  new Set(value).size === value.length;

const isIntegerWithin = (value: unknown, bounds: IntegerBounds): boolean =>
  typeof value === "number" && Number.isInteger(value) && value >= bounds.min && value <= bounds.max;

const isAbv = (value: unknown): boolean =>
  typeof value === "number" &&
  value >= ABV_MIN_PERCENT &&
  value <= BEER_PROPOSAL_ABV_MAX_PERCENT &&
  hasAtMostDecimals(value, BEER_ABV_MAX_DECIMAL_PLACES);

const isValidCharacteristicValue = (characteristic: BeerCharacteristicEnum, value: unknown): boolean => {
  switch (characteristic) {
    case BeerCharacteristicEnum.ABV:
      return isAbv(value);
    case BeerCharacteristicEnum.AROMAS:
      return isDistinctMembers(value, AROMA_VALUES, BEER_AROMAS_MAX);
    case BeerCharacteristicEnum.FORMATS:
      return isDistinctMembers(value, FORMAT_VALUES, BEER_FORMATS_MAX);
    default:
      return isIntegerWithin(value, INTEGER_BOUNDS[characteristic] as IntegerBounds);
  }
};

function assertCharacteristicValue(characteristic: BeerCharacteristicEnum, value: unknown): asserts value is CharacteristicValue {
  if (!isValidCharacteristicValue(characteristic, value)) {
    throw new BadRequestException(`The value of ${characteristic} is out of its bounds or has the wrong shape.`);
  }
}

const isSameValue = (current: CharacteristicValue | null, proposed: CharacteristicValue): boolean => {
  if (current === null) {
    return false;
  }
  if (typeof current === "number" || typeof proposed === "number") {
    return current === proposed;
  }
  return current.length === proposed.length && proposed.every((item) => current.includes(item));
};

const formatValue = (value: CharacteristicValue): string => (typeof value === "number" ? String(value) : value.join(", "));

const toAuthorNameById = (users: readonly UserDto[]): ReadonlyMap<number, string> =>
  new Map(users.map((user) => [user.id, user.displayName]));

const findAuthorName = (authorNames: ReadonlyMap<number, string>, beer: BeerDto): string | null =>
  beer.createdBy === null ? null : (authorNames.get(beer.createdBy) ?? null);

interface FoundBeersPage {
  readonly slice: BeerSliceDto;
  readonly facets: BeerFacetsDto;
  readonly isApproximate: boolean;
}

const toFilters = (query: BeersQueryDto): BeerFilters => ({
  family: query.family,
  styleIds: query.style,
  countries: query.country,
  formats: query.format,
  abvMin: query.abvMin,
  abvMax: query.abvMax,
  minRating: query.minRating,
});

@Injectable()
export class BeersService {
  constructor(
    private readonly beersRepository: BeersRepository,
    private readonly tastingsService: TastingsService,
    private readonly usersService: UsersService,
  ) {}

  async getBeers(userId: number, query: BeersQueryDto): Promise<BeerPageDto> {
    const page = query.page ?? FIRST_PAGE;
    const size = query.size ?? BEER_PAGE_SIZE_DEFAULT;
    const search = query.q?.trim() ?? "";
    const queryFilters = toFilters(query);
    if (queryFilters.abvMin !== undefined && queryFilters.abvMax !== undefined && queryFilters.abvMin > queryFilters.abvMax) {
      throw new BadRequestException("abvMin must not be greater than abvMax.");
    }
    const filters = { ...queryFilters, ...(await this.getStatusFilters(userId, query.status)) };
    const { slice, facets, isApproximate } = await this.findBeersPage(search, filters, query.sort ?? BeerSortEnum.NAME, page, size);
    const beerIds = slice.items.map((beer) => beer.id);
    const [states, summaries, users] = await Promise.all([
      this.tastingsService.getBeerStates(userId, beerIds),
      this.beersRepository.findRatingSummaries(beerIds),
      this.usersService.getUsers(),
    ]);
    const authorNames = toAuthorNameById(users);
    const stateByBeerId = new Map(states.map((state) => [state.beerId, state]));
    const summaryByBeerId = new Map(summaries.map((summary) => [summary.beerId, summary]));
    const items = slice.items.map((beer) =>
      toCatalogBeerDto(beer, stateByBeerId.get(beer.id), summaryByBeerId.get(beer.id), findAuthorName(authorNames, beer)),
    );
    return { items, total: slice.total, page, size, facets, isApproximate };
  }

  async getBeerForUser(userId: number, id: number): Promise<BeerDetailDto> {
    await this.resolveDueCorrections(new Date());
    const beer = await this.getBeer(id);
    const [[state], [summary], stats, users] = await Promise.all([
      this.tastingsService.getBeerStates(userId, [id]),
      this.beersRepository.findRatingSummaries([id]),
      this.beersRepository.findReviewStats(id),
      this.usersService.getUsers(),
    ]);
    const catalog = toCatalogBeerDto(beer, state, summary, findAuthorName(toAuthorNameById(users), beer));
    return toBeerDetailDto(catalog, stats);
  }

  async createBeer(userId: number, dto: CreateBeerDto): Promise<BeerDetailDto> {
    await this.assertStyleExists(dto.styleId);
    await this.assertProposalQuota(userId);
    const breweryId = await this.resolveBreweryId(dto);
    const id = await this.beersRepository.createBeer(toNewBeer(dto, breweryId, userId, new Date()));
    return this.getBeerForUser(userId, id);
  }

  async getReviewPage(userId: number, beerId: number, query: ReviewsQueryDto): Promise<ReviewPageDto> {
    await this.getBeer(beerId);
    const page = query.page ?? FIRST_PAGE;
    const [mine, slice, users] = await Promise.all([
      this.beersRepository.findReview(userId, beerId),
      this.beersRepository.findReviewPage(beerId, userId, page, REVIEW_PAGE_SIZE),
      this.usersService.getUsers(),
    ]);
    const authorsById = new Map(users.map((user) => [user.id, user]));
    return toReviewPageDto(mine, slice, authorsById, userId, page, REVIEW_PAGE_SIZE);
  }

  async saveMyReview(userId: number, beerId: number, dto: UpsertReviewDto): Promise<ReviewDto> {
    await this.getBeer(beerId);
    const existing = await this.beersRepository.findReview(userId, beerId);
    if (existing === null && (await this.tastingsService.isFirstCheckin(userId, beerId))) {
      throw new ForbiddenException("You must check in this beer before reviewing it.");
    }
    const record = await this.beersRepository.upsertReview(toNewReview(dto, userId, beerId, new Date()));
    const author = await this.usersService.getUser(userId);
    return toReviewDto(record, author, userId);
  }

  async deleteMyReview(userId: number, beerId: number): Promise<void> {
    await this.getBeer(beerId);
    if (!(await this.beersRepository.deleteReview(userId, beerId))) {
      throw new NotFoundException(`You have not reviewed beer ${beerId}.`);
    }
  }

  async proposeCorrection(userId: number, beerId: number, dto: CreateCorrectionDto): Promise<CorrectionDto> {
    const { characteristic, value } = dto;
    const now = new Date();
    await this.resolveDueCorrections(now);
    assertCharacteristicValue(characteristic, value);
    const beer = await this.getBeer(beerId);
    if (beer.createdBy === userId) {
      throw new ForbiddenException("Only other users can correct a beer they added.");
    }
    const currentValue = readCharacteristicValue(beer, characteristic);
    if (isSameValue(currentValue, value)) {
      throw new BadRequestException(`${characteristic} is already ${formatValue(value)}.`);
    }
    await this.assertCorrectionQuota(userId, now);
    if (await this.beersRepository.existsOpenCorrection(beerId, characteristic)) {
      throw new ConflictException(`A correction of ${characteristic} is already open for beer ${beerId}.`);
    }
    const record = await this.beersRepository.createCorrection(toNewCorrection(beerId, dto, userId, now));
    const proposer = await this.usersService.getUser(userId);
    return toCorrectionDto(record, beer.name, currentValue, proposer.displayName, userId, PROPOSER_AGREE_COUNT, NEW_CORRECTION_DISAGREE_COUNT, null);
  }

  async voteCorrection(userId: number, correctionId: number, dto: SaveCorrectionVoteDto): Promise<CorrectionDto> {
    const now = new Date();
    await this.resolveDueCorrections(now);
    const record = await this.beersRepository.findCorrectionById(correctionId);
    if (record === null) {
      throw new NotFoundException(`Correction ${correctionId} not found.`);
    }
    if (record.proposedBy === userId) {
      throw new ForbiddenException("You cannot vote on your own correction.");
    }
    if (record.status !== CorrectionStatusEnum.OPEN) {
      throw new ConflictException(`Correction ${correctionId} is closed.`);
    }
    await this.beersRepository.upsertCorrectionVote(toNewCorrectionVote(correctionId, userId, dto.sense, now));
    const beer = await this.getBeer(record.beerId);
    const [correction] = await this.toVotedCorrections(userId, [record], [beer]);
    return correction;
  }

  async getCorrectionBoard(userId: number): Promise<CorrectionBoardDto> {
    await this.resolveDueCorrections(new Date());
    const [openRecords, closedRecords] = await Promise.all([
      this.beersRepository.findOpenCorrections(),
      this.beersRepository.findRecentlyClosedCorrections(CORRECTIONS_RECENTLY_CLOSED_LIMIT),
    ]);
    const records = [...openRecords, ...closedRecords];
    const beers = await this.beersRepository.findByIds(toUniqueBeerIds(records));
    const corrections = await this.toVotedCorrections(userId, records, beers);
    const open = corrections.slice(0, openRecords.length);
    return toCorrectionBoardDto(open, corrections.slice(openRecords.length), open.filter(isPending).length);
  }

  async resolveDueCorrections(now: Date): Promise<void> {
    const due = await this.beersRepository.findDueCorrections(now);
    if (due.length === 0) {
      return;
    }
    const [tallies, beers] = await Promise.all([
      this.beersRepository.findCorrectionTallies(due.map((record) => record.id)),
      this.beersRepository.findByIds(toUniqueBeerIds(due)),
    ]);
    const resolutions = due.map((record): CorrectionResolution => {
      const beer = findBeerOfCorrection(beers, record);
      const agreeCount = PROPOSER_AGREE_COUNT + countOfSense(tallies, record.id, CorrectionVoteSenseEnum.AGREE);
      const disagreeCount = countOfSense(tallies, record.id, CorrectionVoteSenseEnum.DISAGREE);
      const accepted = isAccepted(agreeCount, disagreeCount);
      return {
        id: record.id,
        status: accepted ? CorrectionStatusEnum.ACCEPTED : CorrectionStatusEnum.REJECTED,
        previousValue: JSON.stringify(readCharacteristicValue(beer, record.characteristic)),
        beerId: record.beerId,
        beerChange: accepted ? toBeerCharacteristicChange(record.characteristic, record.proposedValue) : null,
      };
    });
    for (const resolution of resolutions) {
      await this.beersRepository.resolveCorrection(
        resolution.id,
        resolution.status,
        resolution.previousValue,
        now,
        resolution.beerId,
        resolution.beerChange,
      );
    }
  }

  async getBeerCorrections(userId: number, beerId: number): Promise<CorrectionDto[]> {
    await this.resolveDueCorrections(new Date());
    const beer = await this.getBeer(beerId);
    const records = await this.beersRepository.findOpenCorrectionsByBeer(beerId);
    return this.toVotedCorrections(userId, records, [beer]);
  }

  async getBeer(id: number): Promise<BeerDto> {
    const beer = await this.beersRepository.findById(id);
    if (beer === null) {
      throw new NotFoundException(`Beer ${id} not found.`);
    }
    return beer;
  }

  getBeersByIds(ids: readonly number[]): Promise<BeerDto[]> {
    return this.beersRepository.findByIds(ids);
  }

  getReviewsByUsers(userIds: readonly number[]): Promise<ReviewRecordDto[]> {
    return this.beersRepository.findReviewsByUsers(userIds);
  }

  async getCatalogTotals(): Promise<CatalogTotalsDto> {
    const facets = await this.beersRepository.findFacets("", { officialOnly: true });
    return { total: facets.families.reduce((sum, family) => sum + family.count, 0), families: facets.families };
  }

  getStyleGroups(): Promise<BeerStyleGroupDto[]> {
    return this.beersRepository.findStyleGroups();
  }

  getBreweries(): Promise<BreweryDto[]> {
    return this.beersRepository.findBreweries();
  }

  private async findBeersPage(
    search: string,
    filters: BeerFilters,
    sort: BeerSortEnum,
    page: number,
    size: number,
  ): Promise<FoundBeersPage> {
    const [slice, facets] = await Promise.all([
      this.beersRepository.findPage(search, filters, sort, page, size),
      this.beersRepository.findFacets(search, filters),
    ]);
    if (slice.total > 0 || !hasApproximableWord(search)) {
      return { slice, facets, isApproximate: false };
    }
    const candidates = await this.beersRepository.findSearchCandidates(filters);
    const beerIds = candidates.filter((candidate) => matchesApproximately(search, [candidate.searchText])).map((candidate) => candidate.id);
    if (beerIds.length === 0) {
      return { slice, facets, isApproximate: false };
    }
    const approximateFilters = { ...filters, beerIds };
    const [approximateSlice, approximateFacets] = await Promise.all([
      this.beersRepository.findPage("", approximateFilters, sort, page, size),
      this.beersRepository.findFacets("", approximateFilters),
    ]);
    return { slice: approximateSlice, facets: approximateFacets, isApproximate: true };
  }

  private async toVotedCorrections(
    userId: number,
    records: readonly CorrectionRecordDto[],
    beers: readonly BeerDto[],
  ): Promise<VotedCorrectionDto[]> {
    const correctionIds = records.map((record) => record.id);
    const [users, tallies, votes] = await Promise.all([
      this.usersService.getUsers(),
      this.beersRepository.findCorrectionTallies(correctionIds),
      this.beersRepository.findCorrectionVotesOfUser(userId, correctionIds),
    ]);
    const authorNames = toAuthorNameById(users);
    return records.map((record) => {
      const beer = findBeerOfCorrection(beers, record);
      const proposerName = authorNames.get(record.proposedBy);
      if (proposerName === undefined) {
        throw new Error(`Proposer ${record.proposedBy} of correction ${record.id} not found.`);
      }
      return toCorrectionDto(
        record,
        beer.name,
        readCharacteristicValue(beer, record.characteristic),
        proposerName,
        userId,
        PROPOSER_AGREE_COUNT + countOfSense(tallies, record.id, CorrectionVoteSenseEnum.AGREE),
        countOfSense(tallies, record.id, CorrectionVoteSenseEnum.DISAGREE),
        findVoteSense(votes, record.id),
      );
    });
  }

  private async assertStyleExists(styleId: number): Promise<void> {
    if (!(await this.beersRepository.existsStyle(styleId))) {
      throw new NotFoundException(`Beer style ${styleId} not found.`);
    }
  }

  private async assertProposalQuota(userId: number): Promise<void> {
    const since = new Date(Date.now() - BEER_PROPOSAL_WINDOW_MS);
    if ((await this.beersRepository.countCreatedSince(userId, since)) >= BEER_PROPOSALS_PER_WINDOW_MAX) {
      throw new HttpException(
        `You can propose at most ${BEER_PROPOSALS_PER_WINDOW_MAX} beers every ${BEER_PROPOSAL_WINDOW_HOURS} hours.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async assertCorrectionQuota(userId: number, now: Date): Promise<void> {
    const since = new Date(now.getTime() - CORRECTION_WINDOW_MS);
    if ((await this.beersRepository.countCorrectionsSince(userId, since)) >= CORRECTIONS_PER_WINDOW_MAX) {
      throw new HttpException(
        `You can propose at most ${CORRECTIONS_PER_WINDOW_MAX} corrections every ${CORRECTION_WINDOW_HOURS} hours.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async resolveBreweryId(dto: CreateBeerDto): Promise<number> {
    const breweryKey = normalizeSearchText(dto.breweryName);
    const breweries = await this.beersRepository.findBreweries();
    const brewery = breweries.find((entry) => normalizeSearchText(entry.name) === breweryKey);
    if (brewery === undefined) {
      return (await this.beersRepository.createBrewery(toNewBrewery(dto.breweryName, dto.country))).id;
    }
    const nameKey = normalizeSearchText(dto.name);
    const siblings = await this.beersRepository.findBeersByBrewery(brewery.id);
    if (siblings.some((beer) => normalizeSearchText(beer.name) === nameKey)) {
      throw new ConflictException(`A beer named "${nameKey}" already exists for brewery "${brewery.name}".`);
    }
    return brewery.id;
  }

  private async getStatusFilters(userId: number, status: BeerStatusEnum | undefined): Promise<BeerFilters> {
    switch (status) {
      case BeerStatusEnum.DRUNK:
        return { beerIds: await this.tastingsService.getDrunkBeerIds(userId) };
      case BeerStatusEnum.WISHLIST:
        return { beerIds: await this.tastingsService.getWishlistBeerIds(userId) };
      case BeerStatusEnum.UNTASTED:
        return { excludedBeerIds: await this.tastingsService.getDrunkBeerIds(userId) };
      case undefined:
        return {};
    }
  }
}
