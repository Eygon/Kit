export enum AvailabilityStatusEnum {
  CONFIRMED = "confirmed",
  MAYBE_GONE = "maybeGone",
  GONE = "gone",
  UNKNOWN = "unknown",
}

export const AVAILABILITY_STATUS_RANK: Readonly<Record<AvailabilityStatusEnum, number>> = {
  [AvailabilityStatusEnum.CONFIRMED]: 0,
  [AvailabilityStatusEnum.MAYBE_GONE]: 1,
  [AvailabilityStatusEnum.UNKNOWN]: 2,
  [AvailabilityStatusEnum.GONE]: 3,
};

export const isAvailabilityStatus = (value: string): value is AvailabilityStatusEnum =>
  Object.values(AvailabilityStatusEnum).includes(value as AvailabilityStatusEnum);
