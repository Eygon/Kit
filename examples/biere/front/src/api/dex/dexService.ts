import { httpClient } from "@/api/httpClient";
import { HttpError } from "@/api/httpError";
import type { DexDto } from "@/types/dtos/dex/dexDto";
import { dexDtoToModel } from "@/types/mappers/dex/dexMapper";
import type { Dex } from "@/types/models/dex/dex";
import { ME_DEX } from "@/utils/apiURL/apiURL";

export default class DexService {
  static async get(): Promise<Dex> {
    const response = await httpClient.get<DexDto>(ME_DEX());
    if (response.data === null) throw new HttpError(response.status, "Empty dex");
    return dexDtoToModel(response.data);
  }
}
