export const toDateOrNull = (value: string | null): Date | null => (value === null ? null : new Date(value));
