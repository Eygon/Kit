import type { CheckinPageDto } from "@/types/dtos/checkin/checkinPageDto";
import { checkinDtoToModel } from "@/types/mappers/checkin/checkinMapper";
import type { CheckinPage } from "@/types/models/checkin/checkinPage";

export const checkinPageDtoToModel = (dto: CheckinPageDto): CheckinPage => ({
  items: dto.items.map(checkinDtoToModel),
  total: dto.total,
  page: dto.page,
  size: dto.size,
});
