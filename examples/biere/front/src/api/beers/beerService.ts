import { httpClient } from "@/api/httpClient";
import { HttpError } from "@/api/httpError";
import type { BeerDto } from "@/types/dtos/beer/beerDto";
import type { BeerPageDto } from "@/types/dtos/beer/beerPageDto";
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";
import { beerDtoToModel } from "@/types/mappers/beer/beerMapper";
import { newBeerToDto } from "@/types/mappers/beer/newBeerMapper";
import { beerPageDtoToModel } from "@/types/mappers/beer/beerPageMapper";
import { beerQueryToSearchParams } from "@/types/mappers/beer/beerQueryMapper";
import type { Beer } from "@/types/models/beer/beer";
import type { BeerPage } from "@/types/models/beer/beerPage";
import type { BeerQuery } from "@/types/models/beer/beerQuery";
import type { NewBeer } from "@/types/models/beer/newBeer";
import { BEERS, BEER_BY_ID } from "@/utils/apiURL/apiURL";
import { DisplayError } from "@/utils/displayError/displayError";
import { getErrorTranslationKey } from "@/utils/displayError/getErrorTranslationKey";

const getCreateBeerErrorTranslationKey = (error: unknown): string => {
  if (error instanceof HttpError && error.status === HttpStatusCodeEnum.CONFLICT) return "pages.encyclopedia.propose.duplicate";
  if (error instanceof HttpError && error.status === HttpStatusCodeEnum.TOO_MANY_REQUESTS) return "pages.encyclopedia.propose.limitReached";
  return getErrorTranslationKey(error);
};

export default class BeerService {
  static async getPage(query: BeerQuery, page: number, size: number): Promise<BeerPage> {
    const response = await httpClient.get<BeerPageDto>(`${BEERS()}?${beerQueryToSearchParams(query, page, size)}`);
    if (response.data === null) throw new HttpError(response.status, "Empty beer page");
    return beerPageDtoToModel(response.data);
  }

  static async getById(beerId: number): Promise<Beer | null> {
    try {
      const response = await httpClient.get<BeerDto>(BEER_BY_ID(beerId));
      if (response.data === null) throw new HttpError(response.status, "Empty beer");
      return beerDtoToModel(response.data);
    } catch (error) {
      if (error instanceof HttpError && error.status === HttpStatusCodeEnum.NOT_FOUND) return null;
      throw error;
    }
  }

  static async create(newBeer: NewBeer): Promise<Beer> {
    try {
      const response = await httpClient.post<BeerDto>(BEERS(), newBeerToDto(newBeer));
      if (response.data === null) throw new Error("Empty create response");
      return beerDtoToModel(response.data);
    } catch (error) {
      DisplayError(error, getCreateBeerErrorTranslationKey);
      throw error;
    }
  }
}
