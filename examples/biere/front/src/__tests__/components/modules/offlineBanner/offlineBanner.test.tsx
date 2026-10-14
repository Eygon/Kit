import { act, screen } from "@testing-library/react";
import { OfflineBanner } from "@/components/modules/offlineBanner/offlineBanner";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const OFFLINE_TEXT = "Vous êtes hors ligne";

const setNavigatorOnline = (isOnline: boolean) => vi.spyOn(navigator, "onLine", "get").mockReturnValue(isOnline);

const dispatchNetworkEvent = (type: "online" | "offline") => {
  act(() => {
    window.dispatchEvent(new Event(type));
  });
};

describe("OfflineBanner", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders an empty polite status zone while online", () => {
    renderWithProviders(<OfflineBanner />);

    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(screen.queryByText(OFFLINE_TEXT)).not.toBeInTheDocument();
  });

  it("keeps the status zone out of the layout flow above the tab bar", () => {
    renderWithProviders(<OfflineBanner />);

    const status = screen.getByRole("status");
    expect(status).toHaveClass("pointer-events-none", "fixed", "inset-x-0", "z-50", "bottom-[calc(5rem+env(safe-area-inset-bottom))]");
  });

  it("shows the offline message inside the status zone when the network drops", () => {
    renderWithProviders(<OfflineBanner />);

    setNavigatorOnline(false);
    dispatchNetworkEvent("offline");

    expect(screen.getByRole("status")).toHaveTextContent(OFFLINE_TEXT);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("removes the message but keeps the status zone when the network returns", () => {
    renderWithProviders(<OfflineBanner />);
    setNavigatorOnline(false);
    dispatchNetworkEvent("offline");
    expect(screen.getByText(OFFLINE_TEXT)).toBeInTheDocument();

    setNavigatorOnline(true);
    dispatchNetworkEvent("online");

    expect(screen.queryByText(OFFLINE_TEXT)).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("shows the message on the first render when the browser is already offline", () => {
    setNavigatorOnline(false);

    renderWithProviders(<OfflineBanner />);

    expect(screen.getByRole("status")).toHaveTextContent(OFFLINE_TEXT);
  });

  it("follows the current state through repeated cuts and returns, without stacking banners", () => {
    renderWithProviders(<OfflineBanner />);

    [false, true, false, false, true, false, true].forEach((isOnline) => {
      setNavigatorOnline(isOnline);
      dispatchNetworkEvent(isOnline ? "online" : "offline");

      expect(screen.getAllByRole("status")).toHaveLength(1);
      if (isOnline) {
        expect(screen.queryByText(OFFLINE_TEXT)).not.toBeInTheDocument();
        expect(screen.getByRole("status")).toBeEmptyDOMElement();
      } else {
        expect(screen.getAllByText(OFFLINE_TEXT)).toHaveLength(1);
      }
    });
  });
});
