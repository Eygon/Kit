export const getDeepKeys = (value: unknown, prefix = ""): string[] => {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => getDeepKeys(child, prefix ? `${prefix}.${key}` : key));
};
