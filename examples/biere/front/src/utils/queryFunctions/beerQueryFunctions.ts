import BeerService from "@/api/beers/beerService";
import type { BeerQuery } from "@/types/models/beer/beerQuery";

export const fetchBeerPage = (query: BeerQuery, page: number, size: number) => BeerService.getPage(query, page, size);

export const fetchBeer = (beerId: number) => BeerService.getById(beerId);
