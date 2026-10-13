import { httpClient } from "@/api/httpClient";
import { HttpError } from "@/api/httpError";
import type { CheckinPageDto } from "@/types/dtos/checkin/checkinPageDto";
import type { CreatedCheckinDto } from "@/types/dtos/checkin/createdCheckinDto";
import { checkinPageDtoToModel } from "@/types/mappers/checkin/checkinPageMapper";
import { checkinQueryToSearchParams } from "@/types/mappers/checkin/checkinQueryMapper";
import { createdCheckinDtoToModel } from "@/types/mappers/checkin/createdCheckinMapper";
import type { CheckinPage } from "@/types/models/checkin/checkinPage";
import type { CreatedCheckin } from "@/types/models/checkin/createdCheckin";
import type { NewCheckin } from "@/types/models/checkin/newCheckin";
import { CHECKINS } from "@/utils/apiURL/apiURL";
import { DisplayError } from "@/utils/displayError/displayError";

const CHECKIN_CREATE_TIMEOUT_MS = 30_000;

export default class CheckinService {
  static async getPage(beerId: number | null, page: number): Promise<CheckinPage> {
    const response = await httpClient.get<CheckinPageDto>(`${CHECKINS()}?${checkinQueryToSearchParams(beerId, page)}`);
    if (response.data === null) throw new HttpError(response.status, "Empty checkin page");
    return checkinPageDtoToModel(response.data);
  }

  static async create(newCheckin: NewCheckin): Promise<CreatedCheckin> {
    try {
      const formData = new FormData();
      formData.append("beerId", String(newCheckin.beerId));
      formData.append("drankAt", newCheckin.drankAt);
      formData.append("place", newCheckin.place);
      formData.append("format", newCheckin.format);
      if (newCheckin.rating !== null) formData.append("rating", String(newCheckin.rating));
      if (newCheckin.aromas.length > 0) formData.append("aromas", newCheckin.aromas.join(","));
      if (newCheckin.price !== null) formData.append("price", String(newCheckin.price));
      if (newCheckin.comment !== "") formData.append("comment", newCheckin.comment);
      const response = await httpClient.postForm<CreatedCheckinDto>(CHECKINS(), formData, {
        signal: AbortSignal.timeout(CHECKIN_CREATE_TIMEOUT_MS),
      });
      if (response.data === null) throw new HttpError(response.status, "Empty created checkin");
      return createdCheckinDtoToModel(response.data);
    } catch (error) {
      DisplayError(error);
      throw error;
    }
  }
}
