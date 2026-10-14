import { httpClient } from "@/api/httpClient";
import { HttpError } from "@/api/httpError";
import type { StatsDto } from "@/types/dtos/stats/statsDto";
import { statsDtoToModel } from "@/types/mappers/stats/statsMapper";
import type { Stats } from "@/types/models/stats/stats";
import { ME_STATS } from "@/utils/apiURL/apiURL";

export default class StatsService {
  static async get(): Promise<Stats> {
    const response = await httpClient.get<StatsDto>(ME_STATS());
    if (response.data === null) throw new HttpError(response.status, "Empty stats");
    return statsDtoToModel(response.data);
  }
}
