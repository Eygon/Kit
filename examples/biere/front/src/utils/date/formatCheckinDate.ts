export const formatCheckinDate = (iso: string, language: string): string =>
  new Intl.DateTimeFormat(language, { dateStyle: "short" }).format(new Date(iso));
