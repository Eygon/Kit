const POSITIVE_INTEGER_PATTERN = /^\d+$/;

export const parseUserId = (raw: string | string[] | undefined): number | null => {
  if (typeof raw !== "string" || !POSITIVE_INTEGER_PATTERN.test(raw.trim())) {
    return null;
  }
  const userId = Number(raw.trim());
  return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
};
