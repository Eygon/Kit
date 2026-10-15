export enum CorrectionStatusEnum {
  OPEN = "open",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

export const CORRECTION_STATUS_LABEL_KEYS: Record<Exclude<CorrectionStatusEnum, CorrectionStatusEnum.OPEN>, string> = {
  [CorrectionStatusEnum.ACCEPTED]: "corrections.status.accepted",
  [CorrectionStatusEnum.REJECTED]: "corrections.status.rejected",
};

export const isCorrectionStatus = (value: unknown): value is CorrectionStatusEnum =>
  Object.values(CorrectionStatusEnum).some((status) => status === value);
