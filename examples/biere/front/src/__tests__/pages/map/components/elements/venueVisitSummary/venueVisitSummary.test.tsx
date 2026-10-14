import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import i18n from "@/i18n/i18n";
import { VenueVisitSummary } from "@/pages/map/components/elements/venueVisitSummary/venueVisitSummary";
import type { VenueVisitSummaryProps } from "@/pages/map/types/venueVisitSummary";

const LAST_CHECKIN = new Date("2026-10-09T12:00:00.000Z");

const renderSummary = (props: Partial<VenueVisitSummaryProps> = {}) =>
  renderWithProviders(<VenueVisitSummary checkinCount={3} lastCheckinAt={LAST_CHECKIN} {...props} />);

describe("VenueVisitSummary", () => {
  beforeEach(async () => {
    vi.stubEnv("TZ", "Europe/Paris");
    await i18n.changeLanguage("fr");
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await i18n.changeLanguage("fr");
  });

  it("AC1 writes the count and the last date in french", () => {
    renderSummary();

    expect(screen.getByText("Vous avez bu ici 3 fois (dernière fois le 9 oct. 2026)")).toBeInTheDocument();
  });

  it("AC1 writes the sentence in a bold wrapping paragraph", () => {
    renderSummary();

    const sentence = screen.getByText("Vous avez bu ici 3 fois (dernière fois le 9 oct. 2026)");
    expect(sentence.tagName).toBe("P");
    expect(sentence).toHaveClass("min-w-0", "break-words", "font-bold", "text-foreground");
  });

  it("AC2 writes the singular for a single check-in, with and without a date", () => {
    const { unmount } = renderSummary({ checkinCount: 1 });
    expect(screen.getByText("Vous avez bu ici 1 fois (dernière fois le 9 oct. 2026)")).toBeInTheDocument();
    unmount();

    renderSummary({ checkinCount: 1, lastCheckinAt: null });

    expect(screen.getByText("Vous avez bu ici 1 fois")).toBeInTheDocument();
  });

  it("writes only the count when the last date is unknown", () => {
    renderSummary({ checkinCount: 4, lastCheckinAt: null });

    expect(screen.getByText("Vous avez bu ici 4 fois")).toBeInTheDocument();
    expect(screen.queryByText(/dernière fois/)).not.toBeInTheDocument();
  });

  it("AC3 renders nothing when there is no check-in, even with a date", () => {
    const { container } = renderSummary({ checkinCount: 0, lastCheckinAt: null });
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/Vous avez bu ici/)).not.toBeInTheDocument();
  });

  it("AC3 renders nothing for a zero count even when a last date is given", () => {
    const { container } = renderSummary({ checkinCount: 0 });

    expect(container).toBeEmptyDOMElement();
  });

  it("AC5 writes the sentence in english, plural then singular", async () => {
    await i18n.changeLanguage("en");
    const { unmount } = renderSummary();
    expect(screen.getByText("You drank here 3 times (last on Oct 9, 2026)")).toBeInTheDocument();
    unmount();

    renderSummary({ checkinCount: 1 });
    expect(screen.getByText("You drank here 1 time (last on Oct 9, 2026)")).toBeInTheDocument();
  });

  it("AC5 writes the english count without a date", async () => {
    await i18n.changeLanguage("en");
    const { unmount } = renderSummary({ checkinCount: 2, lastCheckinAt: null });
    expect(screen.getByText("You drank here 2 times")).toBeInTheDocument();
    unmount();

    renderSummary({ checkinCount: 1, lastCheckinAt: null });
    expect(screen.getByText("You drank here 1 time")).toBeInTheDocument();
  });

  it("writes the date of the viewer timezone for an instant close to midnight", () => {
    renderSummary({ lastCheckinAt: new Date("2026-10-09T23:30:00.000Z") });

    expect(screen.getByText("Vous avez bu ici 3 fois (dernière fois le 10 oct. 2026)")).toBeInTheDocument();
  });
});
