import { httpClient } from "@/api/httpClient";
import { HttpError } from "@/api/httpError";
import type { BeerDto } from "@/types/dtos/beer/beerDto";
import type { BeerPageDto } from "@/types/dtos/beer/beerPageDto";
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";
import { beerDtoToModel } from "@/types/mappers/beer/beerMapper";
import { beerPageDtoToModel } from "@/types/mappers/beer/beerPageMapper";
import { beerQueryToSearchParams } from "@/types/mappers/beer/beerQueryMapper";
import type { Beer } from "@/types/models/beer/beer";
import type { BeerPage } from "@/types/models/beer/beerPage";
import type { BeerQuery } from "@/types/models/beer/beerQuery";
import { BEERS, BEER_BY_ID } from "@/utils/apiURL/apiURL";

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
}
