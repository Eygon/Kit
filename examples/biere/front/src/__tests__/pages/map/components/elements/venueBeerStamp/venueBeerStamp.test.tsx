import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import i18n from "@/i18n/i18n";
import { VenueBeerStamp } from "@/pages/map/components/elements/venueBeerStamp/venueBeerStamp";
import type { VenueBeerStampProps } from "@/pages/map/types/venueBeerStamp";

const LAST_CHECKIN = new Date("2026-10-12T12:00:00.000Z");

const renderStamp = (props: Partial<VenueBeerStampProps> = {}) =>
  renderWithProviders(<VenueBeerStamp drunk checkinCount={3} lastCheckinAt={LAST_CHECKIN} {...props} />);

describe("VenueBeerStamp", () => {
  beforeEach(async () => {
    vi.stubEnv("TZ", "Europe/Paris");
    await i18n.changeLanguage("fr");
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await i18n.changeLanguage("fr");
  });

  it("AC1 writes Déjà bue on a tilted accent chip and the count with the last date in french", () => {
    renderStamp();

    const chip = screen.getByText("Déjà bue").closest(".chip");
    expect(chip).not.toBeNull();
    expect(chip?.className).toContain("chip--accent");
    expect(chip?.className).toContain("-rotate-3");
    expect(screen.getByText("Bue 3 fois · dernière fois le 12 oct. 2026")).toBeInTheDocument();
    expect(screen.queryByText("À découvrir")).not.toBeInTheDocument();
  });

  it("AC1 writes Already tasted and the english count with the last date in english", async () => {
    await i18n.changeLanguage("en");

    renderStamp();

    expect(screen.getByText("Already tasted")).toBeInTheDocument();
    expect(screen.getByText("Tasted 3 times · last on Oct 12, 2026")).toBeInTheDocument();
  });

  it("AC2 writes the count in the singular for a beer tasted once, in both languages", async () => {
    const { unmount } = renderStamp({ checkinCount: 1, lastCheckinAt: null });
    expect(screen.getByText("Bue 1 fois")).toBeInTheDocument();
    unmount();
    await i18n.changeLanguage("en");

    renderStamp({ checkinCount: 1, lastCheckinAt: LAST_CHECKIN });

    expect(screen.getByText("Tasted 1 time · last on Oct 12, 2026")).toBeInTheDocument();
  });

  it.each([
    [1, "Tasted 1 time"],
    [2, "Tasted 2 times"],
  ])("AC4 writes only the english count when the last date is unknown (%i)", async (checkinCount, text) => {
    await i18n.changeLanguage("en");

    renderStamp({ checkinCount, lastCheckinAt: null });

    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByText(/last on/)).not.toBeInTheDocument();
  });

  it("AC3 writes À découvrir on an untilted default chip and no count for a beer not drunk", () => {
    renderStamp({ drunk: false, checkinCount: 0, lastCheckinAt: null });

    const chip = screen.getByText("À découvrir").closest(".chip");
    expect(chip).not.toBeNull();
    expect(chip?.className).toContain("chip--default");
    expect(chip?.className).not.toContain("-rotate-3");
    expect(screen.queryByText("Déjà bue")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Bue /)).not.toBeInTheDocument();
  });

  it("AC3 writes To discover in english for a beer not drunk", async () => {
    await i18n.changeLanguage("en");

    renderStamp({ drunk: false, checkinCount: 0, lastCheckinAt: null });

    expect(screen.getByText("To discover")).toBeInTheDocument();
  });

  it("AC4 shows only the count when the last date is unknown", () => {
    renderStamp({ checkinCount: 2, lastCheckinAt: null });

    expect(screen.getByText("Déjà bue")).toBeInTheDocument();
    expect(screen.getByText("Bue 2 fois")).toBeInTheDocument();
    expect(screen.queryByText(/dernière fois/)).not.toBeInTheDocument();
  });

  it("writes the last date in the day of the phone time zone", () => {
    renderStamp({ lastCheckinAt: new Date("2026-10-12T23:30:00.000Z") });

    expect(screen.getByText("Bue 3 fois · dernière fois le 13 oct. 2026")).toBeInTheDocument();
  });
});
