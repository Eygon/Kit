export const getCountryName = (code: string, language: string): string => {
  try {
    return new Intl.DisplayNames([language], { type: "region", fallback: "code" }).of(code) ?? code;
  } catch {
    return code;
  }
};
