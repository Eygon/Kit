import { ShareOutcomeEnum } from "@/pages/profile/types/shareOutcomeEnum";

const isAbortError = (error: unknown): boolean => error instanceof DOMException && error.name === "AbortError";

const copyToClipboard = async (text: string, browser: Navigator): Promise<ShareOutcomeEnum> => {
  if (typeof browser.clipboard?.writeText !== "function") return ShareOutcomeEnum.FAILED;
  try {
    await browser.clipboard.writeText(text);
    return ShareOutcomeEnum.COPIED;
  } catch {
    return ShareOutcomeEnum.FAILED;
  }
};

export const shareProgress = async (text: string, browser: Navigator = navigator): Promise<ShareOutcomeEnum> => {
  if (typeof browser.share !== "function") return copyToClipboard(text, browser);
  try {
    await browser.share({ text });
    return ShareOutcomeEnum.SHARED;
  } catch (error) {
    return isAbortError(error) ? ShareOutcomeEnum.CANCELLED : copyToClipboard(text, browser);
  }
};
