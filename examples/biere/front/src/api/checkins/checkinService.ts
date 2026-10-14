import { httpClient } from "@/api/httpClient";
import { HttpError } from "@/api/httpError";
import type { CheckinDto } from "@/types/dtos/checkin/checkinDto";
import type { CheckinPageDto } from "@/types/dtos/checkin/checkinPageDto";
import type { CreatedCheckinDto } from "@/types/dtos/checkin/createdCheckinDto";
import { checkinDtoToModel } from "@/types/mappers/checkin/checkinMapper";
import { checkinPageDtoToModel } from "@/types/mappers/checkin/checkinPageMapper";
import { checkinQueryToSearchParams } from "@/types/mappers/checkin/checkinQueryMapper";
import { createdCheckinDtoToModel } from "@/types/mappers/checkin/createdCheckinMapper";
import { buildUpdateCheckinDto } from "@/types/mappers/checkin/updateCheckinDtoMapper";
import type { Checkin } from "@/types/models/checkin/checkin";
import type { CheckinChanges } from "@/types/models/checkin/checkinChanges";
import type { CheckinPage } from "@/types/models/checkin/checkinPage";
import type { CreatedCheckin } from "@/types/models/checkin/createdCheckin";
import type { NewCheckin } from "@/types/models/checkin/newCheckin";
import { CHECKIN_BY_ID, CHECKINS } from "@/utils/apiURL/apiURL";
import { DisplayError } from "@/utils/displayError/displayError";

const CHECKIN_CREATE_TIMEOUT_MS = 90_000;

export default class CheckinService {
  static async getPage(beerId: number | null, page: number): Promise<CheckinPage> {
    const response = await httpClient.get<CheckinPageDto>(`${CHECKINS()}?${checkinQueryToSearchParams(beerId, page)}`);
    if (response.data === null) throw new HttpError(response.status, "Empty checkin page");
    return checkinPageDtoToModel(response.data);
  }

  static async create(newCheckin: NewCheckin): Promise<CreatedCheckin> {
    try {
      const formData = new FormData();
      if (newCheckin.photo) formData.append("file", newCheckin.photo);
      formData.append("beerId", String(newCheckin.beerId));
      formData.append("drankAt", newCheckin.drankAt);
      formData.append("place", newCheckin.place);
      if (newCheckin.venueId !== null) formData.append("venueId", String(newCheckin.venueId));
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

  static async update(checkinId: number, changes: CheckinChanges): Promise<Checkin> {
    try {
      const response = await httpClient.patch<CheckinDto>(CHECKIN_BY_ID(checkinId), buildUpdateCheckinDto(changes));
      if (response.data === null) throw new HttpError(response.status, "Empty updated checkin");
      return checkinDtoToModel(response.data);
    } catch (error) {
      DisplayError(error);
      throw error;
    }
  }

  static async remove(checkinId: number): Promise<void> {
    try {
      await httpClient.delete(CHECKIN_BY_ID(checkinId));
    } catch (error) {
      DisplayError(error);
      throw error;
    }
  }
}
