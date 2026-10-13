import BeerStyleService from "@/api/beerStyles/beerStyleService";

export const fetchBeerStyleGroups = () => BeerStyleService.getGroups();
