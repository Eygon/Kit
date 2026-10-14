import { isLanguage, LanguageEnum } from "@/types/enums/i18n/languageEnum";
import { StorageKeyEnum } from "@/types/enums/storage/storageKeyEnum";
import type { KeyValueStorage } from "@/types/storage/keyValueStorage";
import { localKeyValueStorage } from "@/utils/storage/localKeyValueStorage";

export const resolveInitialLanguage = (
  storage: KeyValueStorage = localKeyValueStorage,
  browserLanguage: string = typeof navigator === "undefined" ? "" : navigator.language,
): LanguageEnum => {
  const storedLanguage = storage.get(StorageKeyEnum.LANGUAGE);
  if (isLanguage(storedLanguage)) return storedLanguage;
  return browserLanguage.toLowerCase().startsWith(LanguageEnum.FR) ? LanguageEnum.FR : LanguageEnum.EN;
};
