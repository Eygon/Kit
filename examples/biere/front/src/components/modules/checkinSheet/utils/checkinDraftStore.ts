import type { CheckinFormValues } from "@/components/modules/checkinSheet/types/checkinFormValues";

const drafts = new Map<string, CheckinFormValues>();

const getDraftKey = (userId: number, beerId: number): string => `${userId}:${beerId}`;

export const getCheckinDraft = (userId: number, beerId: number): CheckinFormValues | null =>
  drafts.get(getDraftKey(userId, beerId)) ?? null;

export const saveCheckinDraft = (userId: number, beerId: number, values: CheckinFormValues): void => {
  drafts.set(getDraftKey(userId, beerId), values);
};

export const clearCheckinDraft = (userId: number, beerId: number): void => {
  drafts.delete(getDraftKey(userId, beerId));
};

export const isBlankCheckinForm = (values: CheckinFormValues): boolean =>
  values.place === "" &&
  values.venueId === null &&
  values.rating === 0 &&
  values.aromas.length === 0 &&
  values.format === "" &&
  Number.isNaN(values.price) &&
  values.comment === "" &&
  values.photo === null;
