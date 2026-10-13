import type { CreatedCheckinDto } from "@/types/dtos/checkin/createdCheckinDto";
import { checkinDtoToModel } from "@/types/mappers/checkin/checkinMapper";
import type { CreatedCheckin } from "@/types/models/checkin/createdCheckin";

export const createdCheckinDtoToModel = (dto: CreatedCheckinDto): CreatedCheckin => ({
  checkin: checkinDtoToModel(dto.checkin),
  isFirstDiscovery: dto.isFirstDiscovery,
});
