import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VenueDiscoverySummary } from "@/pages/map/components/elements/venueDiscoverySummary/venueDiscoverySummary";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const onUndrunkOnlyChange = vi.fn();

const renderSummary = (props: Partial<{ undiscoveredCount: number; isUndrunkOnly: boolean }> = {}) => {
  return renderWithProviders(
    <VenueDiscoverySummary undiscoveredCount={7} isUndrunkOnly={false} onUndrunkOnlyChange={onUndrunkOnlyChange} {...props} />,
  );
};

describe("VenueDiscoverySummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AC1 says 7 bières à découvrir ici in a polite live region and shows the switch off", () => {
    renderSummary({ undiscoveredCount: 7 });

    const counter = screen.getByText("7 bières à découvrir ici");
    expect(counter.closest("[aria-live]")?.getAttribute("aria-live")).toBe("polite");
    expect(screen.getByRole("switch", { name: "Bières que je n'ai pas encore bues" })).not.toBeChecked();
  });

  it("AC6 uses the singular for one beer to discover", () => {
    renderSummary({ undiscoveredCount: 1 });

    expect(screen.getByText("1 bière à découvrir ici")).toBeInTheDocument();
    expect(screen.queryByText(/bières à découvrir/)).not.toBeInTheDocument();
  });

  it("AC4 says Tu as déjà goûté toutes les bières d'ici when nothing is left to discover", () => {
    renderSummary({ undiscoveredCount: 0 });

    expect(screen.getByText("Tu as déjà goûté toutes les bières d'ici")).toBeInTheDocument();
    expect(screen.queryByText(/à découvrir ici/)).not.toBeInTheDocument();
  });

  it("keeps the same live region in the DOM when the text changes", () => {
    const { rerender } = renderSummary({ undiscoveredCount: 2 });
    const region = screen.getByText("2 bières à découvrir ici").closest("[aria-live]");

    rerender(<VenueDiscoverySummary undiscoveredCount={0} isUndrunkOnly={false} onUndrunkOnlyChange={onUndrunkOnlyChange} />);

    expect(screen.getByText("Tu as déjà goûté toutes les bières d'ici").closest("[aria-live]")).toBe(region);
  });

  it("reflects the active switch", () => {
    renderSummary({ isUndrunkOnly: true });

    expect(screen.getByRole("switch", { name: "Bières que je n'ai pas encore bues" })).toBeChecked();
  });

  it("reports the new value when the switch is toggled on and off", async () => {
    const user = userEvent.setup();
    renderSummary({ isUndrunkOnly: false });

    await user.click(screen.getByRole("switch", { name: "Bières que je n'ai pas encore bues" }));

    expect(onUndrunkOnlyChange).toHaveBeenCalledWith(true);
  });

  it("reports false when the active switch is toggled", async () => {
    const user = userEvent.setup();
    renderSummary({ isUndrunkOnly: true });

    await user.click(screen.getByRole("switch", { name: "Bières que je n'ai pas encore bues" }));

    expect(onUndrunkOnlyChange).toHaveBeenCalledWith(false);
  });

  it("gives the switch a touch target of at least 44px", () => {
    renderSummary();

    const label = screen.getByText("Bières que je n'ai pas encore bues");
    expect(label.closest(".min-h-11")).not.toBeNull();
  });
});
