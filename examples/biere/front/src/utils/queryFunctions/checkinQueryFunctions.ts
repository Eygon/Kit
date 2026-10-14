import CheckinService from "@/api/checkins/checkinService";
import type { CheckinChanges } from "@/types/models/checkin/checkinChanges";
import type { NewCheckin } from "@/types/models/checkin/newCheckin";

export const fetchCheckinPage = (beerId: number | null, page: number) => CheckinService.getPage(beerId, page);

export const createCheckin = (newCheckin: NewCheckin) => CheckinService.create(newCheckin);

export const updateCheckin = ({ checkinId, changes }: { checkinId: number; changes: CheckinChanges }) =>
  CheckinService.update(checkinId, changes);

export const deleteCheckin = (checkinId: number) => CheckinService.remove(checkinId);
