import { httpClient } from "@/api/httpClient";
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";
import type { BreweryDto } from "@/types/dtos/brewery/breweryDto";
import { breweryDtoToModel } from "@/types/mappers/brewery/breweryMapper";
import type { Brewery } from "@/types/models/brewery/brewery";
import { BREWERIES } from "@/utils/apiURL/apiURL";
import { DisplayError } from "@/utils/displayError/displayError";

export default class BreweryService {
  static async getAll(): Promise<Brewery[]> {
    try {
      const response = await httpClient.get<BreweryDto[]>(BREWERIES());
      if (response.status === HttpStatusCodeEnum.NO_CONTENT || response.data === null) return [];
      return response.data.map(breweryDtoToModel);
    } catch (error) {
      DisplayError(error);
    }
    return [];
  }
}
