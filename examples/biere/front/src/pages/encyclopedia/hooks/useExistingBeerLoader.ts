import { normalizeSearchText } from "@/pages/encyclopedia/utils/normalizeSearchText";
import { EMPTY_BEER_QUERY } from "@/types/mappers/beer/beerQueryMapper";
import type { Beer } from "@/types/models/beer/beer";
import { fetchBeerPage } from "@/utils/queryFunctions/beerQueryFunctions";

const FIRST_PAGE = 1;
const LOOKUP_SIZE = 50;

const loadExistingBeer = async (name: string, breweryName: string): Promise<Beer | null> => {
  try {
    const page = await fetchBeerPage({ ...EMPTY_BEER_QUERY, search: name }, FIRST_PAGE, LOOKUP_SIZE);
    const normalizedName = normalizeSearchText(name);
    const normalizedBrewery = normalizeSearchText(breweryName);
    return (
      page.items.find(
        (beer) => normalizeSearchText(beer.name) === normalizedName && normalizeSearchText(beer.breweryName) === normalizedBrewery,
      ) ?? null
    );
  } catch {
    return null;
  }
};

export const useExistingBeerLoader = () => ({ loadExistingBeer });
