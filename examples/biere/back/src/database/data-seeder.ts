import { Injectable } from "@nestjs/common";
import type { OnApplicationBootstrap } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import breweriesSeed from "@/database/seed/data/breweries.json";
import beersSeed from "@/database/seed/data/beers.json";
import stylesSeed from "@/database/seed/data/styles.json";
import { buildBeerRows, buildBreweryRows, buildStyleRows } from "@/database/seed/catalog-seed";
import { SEED_USERS } from "@/database/seed.constants";
import { Beer } from "@/modules/beers/entities/beer.entity";
import { BeerStyle } from "@/modules/beers/entities/beer-style.entity";
import { Brewery } from "@/modules/beers/entities/brewery.entity";
import { User } from "@/modules/users/entities/user.entity";

const toIdsByLowerName = (rows: readonly { id: number; name: string }[]): Map<string, number> =>
  new Map(rows.map(({ id, name }) => [name.toLowerCase(), id]));

@Injectable()
export class DataSeeder implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(BeerStyle) private readonly styles: Repository<BeerStyle>,
    @InjectRepository(Brewery) private readonly breweries: Repository<Brewery>,
    @InjectRepository(Beer) private readonly beers: Repository<Beer>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seed();
  }

  async seed(): Promise<void> {
    await this.seedUsers();
    await this.seedStyles();
    await this.seedBreweries();
    await this.seedBeers();
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
}
