import CheckinService from "@/api/checkins/checkinService";
import type { NewCheckin } from "@/types/models/checkin/newCheckin";

export const fetchCheckinPage = (beerId: number | null, page: number) => CheckinService.getPage(beerId, page);

export const createCheckin = (newCheckin: NewCheckin) => CheckinService.create(newCheckin);
