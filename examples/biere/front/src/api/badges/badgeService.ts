import { httpClient } from "@/api/httpClient";
import type { BadgeDto } from "@/types/dtos/badge/badgeDto";
import { badgeDtosToModels } from "@/types/mappers/badge/badgeMapper";
import type { Badge } from "@/types/models/badge/badge";
import { ME_BADGES } from "@/utils/apiURL/apiURL";

export default class BadgeService {
  static async getAll(): Promise<Badge[]> {
    const response = await httpClient.get<BadgeDto[]>(ME_BADGES());
    if (response.data === null) return [];
    return badgeDtosToModels(response.data);
  }
}
