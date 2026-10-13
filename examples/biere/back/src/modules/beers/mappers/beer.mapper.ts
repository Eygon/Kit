import type { CatalogBeerDto } from "@/modules/beers/dtos/catalog-beer.dto";
import type { BeerUserStateDto } from "@/modules/tastings/dtos/beer-user-state.dto";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import type { Beer } from "@/modules/beers/entities/beer.entity";
import type { BeerStyle } from "@/modules/beers/entities/beer-style.entity";
import type { Brewery } from "@/modules/beers/entities/brewery.entity";

export const toBeerDto = (entity: Beer & { brewery: Brewery; style: BeerStyle }): BeerDto => ({
  id: entity.id,
  name: entity.name,
  breweryName: entity.brewery.name,
  country: entity.country,
  styleId: entity.style.id,
  styleName: entity.style.name,
  family: entity.style.family,
  abv: entity.abv,
  aromas: entity.aromas,
  formats: entity.formats,
  description: entity.description,
});

export const toCatalogBeerDto = (beer: BeerDto, state: BeerUserStateDto | undefined): CatalogBeerDto => ({
  id: beer.id,
  name: beer.name,
  breweryName: beer.breweryName,
  country: beer.country,
  styleId: beer.styleId,
  styleName: beer.styleName,
  family: beer.family,
  abv: beer.abv,
  aromas: beer.aromas,
  formats: beer.formats,
  description: beer.description,
  drunk: state?.drunk ?? false,
  checkinCount: state?.checkinCount ?? 0,
  inWishlist: state?.inWishlist ?? false,
});
