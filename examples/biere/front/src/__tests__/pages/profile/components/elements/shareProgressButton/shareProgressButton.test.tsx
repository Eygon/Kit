import { toast } from "@heroui/react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "@/i18n/i18n";
import { ShareProgressButton } from "@/pages/profile/components/elements/shareProgressButton/shareProgressButton";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const renderButton = (props: { discovered: number; total: number; isDisabled?: boolean }) =>
  renderWithProviders(<ShareProgressButton isDisabled={false} {...props} />);

const stubBrowser = (share: unknown, writeText: unknown) => {
  Object.defineProperty(navigator, "share", { value: share, configurable: true });
  Object.defineProperty(navigator, "clipboard", { value: writeText === undefined ? undefined : { writeText }, configurable: true });
};

describe("ShareProgressButton", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.spyOn(toast, "success").mockImplementation(() => "toast-id");
    vi.spyOn(toast, "warning").mockImplementation(() => "toast-id");
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, "share");
    Reflect.deleteProperty(navigator, "clipboard");
    await i18n.changeLanguage("fr");
  });

  it("shares the french text with the rounded percentage", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    stubBrowser(share, vi.fn());
    renderButton({ discovered: 42, total: 120 });

    await user.click(screen.getByRole("button", { name: "Partager" }));

    expect(share).toHaveBeenCalledWith({ text: "J'ai découvert 42 bières sur Mousse (35 %)" });
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it.each([
    { discovered: 40, percent: 33 },
    { discovered: 50, percent: 42 },
  ])("rounds $discovered / 120 to the nearest integer ($percent %)", async ({ discovered, percent }) => {
    const share = vi.fn().mockResolvedValue(undefined);
    stubBrowser(share, vi.fn());
    renderButton({ discovered, total: 120 });

    await user.click(screen.getByRole("button", { name: "Partager" }));

    expect(share).toHaveBeenCalledWith({ text: `J'ai découvert ${discovered} bières sur Mousse (${percent} %)` });
  });

  it("shares the english text when the app is in english", async () => {
    await i18n.changeLanguage("en");
    const share = vi.fn().mockResolvedValue(undefined);
    stubBrowser(share, vi.fn());
    renderButton({ discovered: 42, total: 120 });

    await user.click(screen.getByRole("button", { name: "Share" }));

    expect(share).toHaveBeenCalledWith({ text: "I discovered 42 beers on Mousse (35%)" });
  });

  it("writes one beer in the singular", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    stubBrowser(share, vi.fn());
    renderButton({ discovered: 1, total: 120 });

    await user.click(screen.getByRole("button", { name: "Partager" }));

    expect(share).toHaveBeenCalledWith({ text: "J'ai découvert 1 bière sur Mousse (1 %)" });
  });

  it("reports 0 % when the catalog is empty", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    stubBrowser(share, vi.fn());
    renderButton({ discovered: 0, total: 0 });

    await user.click(screen.getByRole("button", { name: "Partager" }));

    expect(share).toHaveBeenCalledWith({ text: "J'ai découvert 0 bière sur Mousse (0 %)" });
  });

  it("stays silent when the native share is cancelled", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("dismissed", "AbortError"));
    const writeText = vi.fn();
    stubBrowser(share, writeText);
    renderButton({ discovered: 42, total: 120 });

    await user.click(screen.getByRole("button", { name: "Partager" }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(writeText).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Partager" })).toBeEnabled();
  });

  it("copies the text and confirms with a toast when there is no native share", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubBrowser(undefined, writeText);
    renderButton({ discovered: 42, total: 120 });

    await user.click(screen.getByRole("button", { name: "Partager" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Copié dans le presse-papiers."));
    expect(writeText).toHaveBeenCalledWith("J'ai découvert 42 bières sur Mousse (35 %)");
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it("copies the text when the native share fails for another reason", async () => {
    const share = vi.fn().mockRejectedValue(new TypeError("not allowed"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubBrowser(share, writeText);
    renderButton({ discovered: 42, total: 120 });

    await user.click(screen.getByRole("button", { name: "Partager" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Copié dans le presse-papiers."));
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  it("warns when nothing is available to share", async () => {
    stubBrowser(undefined, undefined);
    renderButton({ discovered: 42, total: 120 });

    await user.click(screen.getByRole("button", { name: "Partager" }));

    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith("Impossible de partager."));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("warns when the clipboard refuses", async () => {
    stubBrowser(undefined, vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError")));
    renderButton({ discovered: 42, total: 120 });

    await user.click(screen.getByRole("button", { name: "Partager" }));

    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith("Impossible de partager."));
  });

  it("warns and becomes usable again when the native share fails and the clipboard refuses", async () => {
    const share = vi.fn().mockRejectedValue(new TypeError("not allowed"));
    stubBrowser(share, vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError")));
    renderButton({ discovered: 42, total: 120 });

    await user.click(screen.getByRole("button", { name: "Partager" }));

    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith("Impossible de partager."));
    expect(toast.success).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("button", { name: "Partager" })).not.toHaveAttribute("data-pending", "true"));
  });

  it("ignores a second press while the share is pending", async () => {
    let finish: () => void = () => undefined;
    const share = vi.fn().mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    stubBrowser(share, vi.fn());
    renderButton({ discovered: 42, total: 120 });

    await user.click(screen.getByRole("button", { name: "Partager" }));
    await user.click(screen.getByRole("button", { name: "Partager" }));

    expect(share).toHaveBeenCalledTimes(1);
    finish();
    await waitFor(() => expect(screen.getByRole("button", { name: "Partager" })).not.toHaveAttribute("data-pending", "true"));
  });

  it("is inactive and shares nothing when disabled", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    stubBrowser(share, vi.fn());
    renderButton({ discovered: 0, total: 0, isDisabled: true });

    const button = screen.getByRole("button", { name: "Partager" });
    await user.click(button);

    expect(button).toBeDisabled();
    expect(share).not.toHaveBeenCalled();
  });
});
