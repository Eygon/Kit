export const formatCheckinDate = (iso: string, language: string, timeZone?: string): string =>
  new Intl.DateTimeFormat(language, { dateStyle: "short", timeZone }).format(new Date(iso));
