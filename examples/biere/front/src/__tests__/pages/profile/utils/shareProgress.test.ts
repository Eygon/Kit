import { ShareOutcomeEnum } from "@/pages/profile/types/shareOutcomeEnum";
import { shareProgress } from "@/pages/profile/utils/shareProgress";

const asNavigator = (value: unknown) => value as Navigator;

describe("shareProgress", () => {
  it("exposes the four outcomes with their string values", async () => {

    expect(ShareOutcomeEnum).toEqual({
      SHARED: "shared",
      CANCELLED: "cancelled",
      COPIED: "copied",
      FAILED: "failed",
    });
  });

  it("hands the text to the native share and reports SHARED", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);

    const outcome = await shareProgress("hello", asNavigator({ share, clipboard: { writeText } }));

    expect(outcome).toBe(ShareOutcomeEnum.SHARED);
    expect(share).toHaveBeenCalledWith({ text: "hello" });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("reports CANCELLED without touching the clipboard when the sheet is dismissed", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("dismissed", "AbortError"));
    const writeText = vi.fn().mockResolvedValue(undefined);

    const outcome = await shareProgress("hello", asNavigator({ share, clipboard: { writeText } }));

    expect(outcome).toBe(ShareOutcomeEnum.CANCELLED);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to the clipboard when the native share rejects with another error", async () => {
    const share = vi.fn().mockRejectedValue(new TypeError("not allowed"));
    const writeText = vi.fn().mockResolvedValue(undefined);

    const outcome = await shareProgress("hello", asNavigator({ share, clipboard: { writeText } }));

    expect(outcome).toBe(ShareOutcomeEnum.COPIED);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("copies to the clipboard when the native share is absent", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    const outcome = await shareProgress("hello", asNavigator({ clipboard: { writeText } }));

    expect(outcome).toBe(ShareOutcomeEnum.COPIED);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("reports FAILED when the clipboard refuses", async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError"));

    const outcome = await shareProgress("hello", asNavigator({ clipboard: { writeText } }));

    expect(outcome).toBe(ShareOutcomeEnum.FAILED);
  });

  it("reports FAILED without throwing when the native share fails and the clipboard refuses", async () => {
    const share = vi.fn().mockRejectedValue(new TypeError("not allowed"));
    const writeText = vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError"));

    await expect(shareProgress("hello", asNavigator({ share, clipboard: { writeText } }))).resolves.toBe(ShareOutcomeEnum.FAILED);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("reports FAILED without throwing when the native share fails and there is no clipboard", async () => {
    const share = vi.fn().mockRejectedValue(new TypeError("not allowed"));

    await expect(shareProgress("hello", asNavigator({ share }))).resolves.toBe(ShareOutcomeEnum.FAILED);
  });

  it("reports FAILED when neither the native share nor the clipboard exists", async () => {

    const outcome = await shareProgress("hello", asNavigator({}));

    expect(outcome).toBe(ShareOutcomeEnum.FAILED);
  });
});
