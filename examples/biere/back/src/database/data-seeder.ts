import { Inject, Injectable } from "@nestjs/common";
import type { OnApplicationBootstrap } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import type { AppConfig } from "@/config/app-config";
import { APP_CONFIG } from "@/config/app-config.constants";
import demoCheckinsSeed from "@/database/seed/data/demo-checkins.json";
import breweriesSeed from "@/database/seed/data/breweries.json";
import beersSeed from "@/database/seed/data/beers.json";
import stylesSeed from "@/database/seed/data/styles.json";
import reviewsSeed from "@/database/seed/data/reviews.json";
import venueBeersSeed from "@/database/seed/data/venue-beers.json";
import venuesSeed from "@/database/seed/data/venues.json";
import { buildBeerRows, buildBreweryRows, buildStyleRows } from "@/database/seed/catalog-seed";
import { buildReviewRows } from "@/database/seed/review-seed";
import { buildDemoCheckinRows, buildDemoFollowRows } from "@/database/seed/social-seed";
import { buildSeedVotes, buildVenueBeerRows, buildVenueRows } from "@/database/seed/venue-seed";
import { ALICE_USER_ID, DEMO_CHECKIN_USER_IDS, SEED_USERS, SEED_VOTE_BATCH_SIZE } from "@/database/seed.constants";
import { Beer } from "@/modules/beers/entities/beer.entity";
import { BeerStyle } from "@/modules/beers/entities/beer-style.entity";
import { Brewery } from "@/modules/beers/entities/brewery.entity";
import { Review } from "@/modules/beers/entities/review.entity";
import { Follow } from "@/modules/social/entities/follow.entity";
import { Checkin } from "@/modules/tastings/entities/checkin.entity";
import { User } from "@/modules/users/entities/user.entity";
import { AvailabilityVote } from "@/modules/venues/entities/availability-vote.entity";
import { VenueBeer } from "@/modules/venues/entities/venue-beer.entity";
import { Venue } from "@/modules/venues/entities/venue.entity";
import { toVenueSearchKeys } from "@/modules/venues/mappers/venue.mapper";

const toIdsByLowerName = (rows: readonly { id: number; name: string }[]): Map<string, number> =>
  new Map(rows.map(({ id, name }) => [name.toLowerCase(), id]));

const toLinkKey = (venueId: number, beerId: number): string => `${venueId}-${beerId}`;

const toBatches = <T>(items: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));

@Injectable()
export class DataSeeder implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(BeerStyle) private readonly styles: Repository<BeerStyle>,
    @InjectRepository(Brewery) private readonly breweries: Repository<Brewery>,
    @InjectRepository(Beer) private readonly beers: Repository<Beer>,
    @InjectRepository(Venue) private readonly venues: Repository<Venue>,
    @InjectRepository(VenueBeer) private readonly venueBeers: Repository<VenueBeer>,
    @InjectRepository(AvailabilityVote) private readonly availabilityVotes: Repository<AvailabilityVote>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(Checkin) private readonly checkins: Repository<Checkin>,
    @InjectRepository(Follow) private readonly follows: Repository<Follow>,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seed();
  }

  async seed(): Promise<void> {
    await this.seedUsers();
    await this.seedStyles();
    await this.seedBreweries();
    await this.seedBeers();
    await this.seedVenues();
    await this.seedVenueBeers();
    await this.seedReviews();
    await this.seedDemoActivity();
  }

  private async seedUsers(): Promise<void> {
    if ((await this.users.count()) > 0) {
      return;
    }
    await this.users.insert(SEED_USERS.map((user) => ({ ...user })));
  }

  private async seedStyles(): Promise<void> {
    if ((await this.styles.count()) > 0) {
      return;
    }
    await this.styles.insert(buildStyleRows(stylesSeed));
  }

  private async seedBreweries(): Promise<void> {
    if ((await this.breweries.count()) > 0) {
      return;
    }
    await this.breweries.insert(buildBreweryRows(breweriesSeed));
  }

  private async seedBeers(): Promise<void> {
    if ((await this.beers.count()) > 0) {
      return;
    }
    const styleIdsByName = toIdsByLowerName(await this.styles.find());
    const breweryIdsByName = toIdsByLowerName(await this.breweries.find());
    await this.beers.insert(buildBeerRows(beersSeed, styleIdsByName, breweryIdsByName));
  }

  private async seedVenues(): Promise<void> {
    if ((await this.venues.count()) > 0) {
      await this.backfillVenueSearchKeys();
      return;
    }
    await this.venues.insert(buildVenueRows(venuesSeed));
  }

  private async backfillVenueSearchKeys(): Promise<void> {
    const venuesWithoutKeys = await this.venues.find({ where: { searchName: "" } });
    for (const { id, name, city } of venuesWithoutKeys) {
      await this.venues.update({ id }, toVenueSearchKeys(name, city));
    }
  }

  private async seedVenueBeers(): Promise<void> {
    if ((await this.venueBeers.count()) > 0) {
      return;
    }
    const venueIdsByName = toIdsByLowerName(await this.venues.find());
    const beerIdsByName = toIdsByLowerName(await this.beers.find({ where: { createdBy: IsNull() } }));
    const linkRows = buildVenueBeerRows(venueBeersSeed, venueIdsByName, beerIdsByName);
    await this.venueBeers.insert(linkRows);
    const linkIds = new Map(
      (await this.venueBeers.find()).map(({ id, venueId, beerId }) => [toLinkKey(venueId, beerId), id]),
    );
    const now = new Date();
    const votes = venueBeersSeed.flatMap((row, index) => {
      const { venueId, beerId } = linkRows[index];
      return buildSeedVotes(row, linkIds.get(toLinkKey(venueId, beerId)) as number, now);
    });
    for (const batch of toBatches(votes, SEED_VOTE_BATCH_SIZE)) {
      await this.availabilityVotes.insert(batch);
    }
  }

  private async seedReviews(): Promise<void> {
    if ((await this.reviews.count()) > 0) {
      return;
    }
    const beerIdsByName = toIdsByLowerName(await this.beers.find({ where: { createdBy: IsNull() } }));
    await this.reviews.insert(buildReviewRows(reviewsSeed, beerIdsByName, new Date()));
  }

  private async seedDemoActivity(): Promise<void> {
    if (!this.config.seedDemoActivity) {
      return;
    }
    const beerIdsByName = toIdsByLowerName(await this.beers.find({ where: { createdBy: IsNull() } }));
    const venueIdsByName = new Map((await this.venues.find()).map(({ id, name }) => [name, id]));
    const checkinRows = buildDemoCheckinRows(demoCheckinsSeed, beerIdsByName, venueIdsByName, new Date());
    for (const userId of DEMO_CHECKIN_USER_IDS) {
      if ((await this.checkins.countBy({ userId })) === 0) {
        await this.checkins.insert(checkinRows.filter((row) => row.userId === userId));
      }
    }
    if ((await this.follows.countBy({ followerId: ALICE_USER_ID })) === 0) {
      await this.follows.insert(buildDemoFollowRows());
    }
  }
}
