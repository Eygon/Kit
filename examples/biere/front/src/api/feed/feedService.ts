import { httpClient } from "@/api/httpClient";
import { HttpError } from "@/api/httpError";
import type { FeedPageDto } from "@/types/dtos/feed/feedPageDto";
import { feedPageDtoToModel } from "@/types/mappers/feed/feedPageMapper";
import type { FeedPage } from "@/types/models/feed/feedPage";
import { ME_FEED } from "@/utils/apiURL/apiURL";

export default class FeedService {
  static async getPage(page: number): Promise<FeedPage> {
    const response = await httpClient.get<FeedPageDto>(`${ME_FEED()}?page=${page}`);
    if (response.data === null) throw new HttpError(response.status, "Empty feed page");
    return feedPageDtoToModel(response.data);
  }
}
