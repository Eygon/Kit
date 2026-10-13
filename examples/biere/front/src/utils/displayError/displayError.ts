import { toast } from "@heroui/react";
import i18n from "@/i18n/i18n";
import { getErrorTranslationKey } from "@/utils/displayError/getErrorTranslationKey";

export const DisplayError = (error: unknown, resolveKey: (error: unknown) => string = getErrorTranslationKey): void => {
  toast.danger(i18n.t(resolveKey(error)));
};
