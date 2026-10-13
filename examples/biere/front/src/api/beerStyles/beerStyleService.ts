import { httpClient } from "@/api/httpClient";
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";
import type { BeerStyleGroupDto } from "@/types/dtos/beerStyle/beerStyleGroupDto";
import { beerStyleGroupDtosToModel } from "@/types/mappers/beerStyle/beerStyleGroupMapper";
import type { BeerStyleGroup } from "@/types/models/beerStyle/beerStyleGroup";
import { BEER_STYLES } from "@/utils/apiURL/apiURL";

export default class BeerStyleService {
  static async getGroups(): Promise<BeerStyleGroup[]> {
    const response = await httpClient.get<BeerStyleGroupDto[]>(BEER_STYLES());
    if (response.status === HttpStatusCodeEnum.NO_CONTENT || response.data === null) return [];
    return beerStyleGroupDtosToModel(response.data);
  }
}
