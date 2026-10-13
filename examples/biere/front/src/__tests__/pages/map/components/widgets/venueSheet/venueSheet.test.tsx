import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { VenueSheet } from "@/pages/map/components/widgets/venueSheet/venueSheet";
import type { Venue } from "@/types/models/venue/venue";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";
import { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";

const mockQuery = vi.hoisted(() => ({
  useVenueBeersQuery: vi.fn(),
}));

vi.mock("@/pages/map/hooks/useVenueBeersQuery", () => mockQuery);

const VENUE: Venue = {
  id: 1,
  name: "La Fine Mousse",
  type: VenueTypeEnum.BAR,
  city: "Lyon",
  address: "12 rue de la Bière",
  latitude: 48.85,
  longitude: 2.35,
  description: "Vingt pressions en rotation.",
  distanceKm: null,
  status: AvailabilityStatusEnum.CONFIRMED,
};

const onClose = vi.fn();

const renderSheet = (venue: Venue | null) => renderWithProviders(<VenueSheet venue={venue} onClose={onClose} />);

describe("VenueSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.useVenueBeersQuery.mockReturnValue({ beers: [], isPending: false, isError: false, refetch: vi.fn() });
  });

  it("renders no dialog while no venue is selected", () => {
    renderSheet(null);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("AC1 opens a bottom sheet titled with the venue name showing Bar, address, city and description", async () => {
    renderSheet(VENUE);

    const dialog = await screen.findByRole("dialog", { name: "La Fine Mousse" });

    expect(dialog.closest('[data-placement="bottom"]')).not.toBeNull();
    expect(within(dialog).getByRole("heading", { name: "La Fine Mousse" })).toBeInTheDocument();
    expect(within(dialog).getByText("Bar")).toBeInTheDocument();
    expect(within(dialog).getByText("Adresse")).toBeInTheDocument();
    expect(within(dialog).getByText("12 rue de la Bière")).toBeInTheDocument();
    expect(within(dialog).getByText("Ville")).toBeInTheDocument();
    expect(within(dialog).getByText("Lyon")).toBeInTheDocument();
    expect(within(dialog).getByText("Vingt pressions en rotation.")).toBeInTheDocument();
  });

  it("translates the venue type", async () => {
    renderSheet({ ...VENUE, type: VenueTypeEnum.SHOP });

    const dialog = await screen.findByRole("dialog", { name: "La Fine Mousse" });

    expect(within(dialog).getByText("Cave")).toBeInTheDocument();
    expect(within(dialog).queryByText("Bar")).not.toBeInTheDocument();
  });

  it("AC3 calls onClose from the Fermer button", async () => {
    const user = userEvent.setup();
    renderSheet(VENUE);

    const dialog = await screen.findByRole("dialog", { name: "La Fine Mousse" });
    await user.click(within(dialog).getByRole("button", { name: "Fermer" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("AC3 calls onClose when Escape is pressed", async () => {
    const user = userEvent.setup();
    renderSheet(VENUE);

    await screen.findByRole("dialog", { name: "La Fine Mousse" });
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("AC4 shows no city line and no description when they are empty, and no empty row", async () => {
    renderSheet({ ...VENUE, city: "", description: "" });

    const dialog = await screen.findByRole("dialog", { name: "La Fine Mousse" });

    expect(within(dialog).queryByText("Ville")).not.toBeInTheDocument();
    expect(within(dialog).getByText("Adresse")).toBeInTheDocument();
    expect(within(dialog).queryByText("Vingt pressions en rotation.")).not.toBeInTheDocument();
    expect(dialog.querySelectorAll("dd:empty, p:empty, li:empty")).toHaveLength(0);
  });

  it("AC4 shows no address line and no type when they are empty", async () => {
    renderSheet({ ...VENUE, address: "", type: null, city: "", description: "" });

    const dialog = await screen.findByRole("dialog", { name: "La Fine Mousse" });

    expect(within(dialog).queryByText("Adresse")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Ville")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Bar")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Fermer" })).toBeInTheDocument();
  });

  it("wraps a very long name and description", async () => {
    const long = "Mot".repeat(60);
    renderSheet({ ...VENUE, name: long, description: long });

    const dialog = await screen.findByRole("dialog", { name: long });

    expect(within(dialog).getAllByText(long).every((node) => node.className.includes("break-words"))).toBe(true);
  });

  it("AC1 US15 shows a Bières section with the beers of the venue grouped by family inside the scrolling body", async () => {
    mockQuery.useVenueBeersQuery.mockReturnValue({
      beers: [
        {
          beerId: 7,
          beerName: "Houblon Chouffe",
          breweryName: "Chouffe",
          styleName: "Double IPA",
          family: BeerFamilyEnum.IPA,
          status: AvailabilityStatusEnum.MAYBE_GONE,
          lastConfirmedAt: null,
          recentVoterCount: 0,
          nextVoteAt: null,
        },
      ],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderSheet(VENUE);

    const dialog = await screen.findByRole("dialog", { name: "La Fine Mousse" });
    const section = within(dialog).getByRole("heading", { name: "Bières" }).closest("section");

    expect(section).not.toBeNull();
    expect(mockQuery.useVenueBeersQuery).toHaveBeenCalledWith(VENUE.id);
    expect(within(section as HTMLElement).getByRole("heading", { name: "IPA" })).toBeInTheDocument();
    expect(within(section as HTMLElement).getByText("Houblon Chouffe")).toBeInTheDocument();
    expect(within(section as HTMLElement).getByText("Peut-être épuisée")).toBeInTheDocument();
    const body = section?.closest(".drawer__body");
    expect(body?.className).toContain("max-h-[70dvh]");
    expect(body?.className).toContain("overflow-y-auto");
  });

  it("AC3 US15 shows the empty beer state inside the sheet when the venue has no beer", async () => {
    renderSheet(VENUE);

    const dialog = await screen.findByRole("dialog", { name: "La Fine Mousse" });

    expect(within(dialog).getByText("Aucune bière signalée ici")).toBeInTheDocument();
  });

  it("does not read any beers while no venue is selected", () => {
    renderSheet(null);

    expect(mockQuery.useVenueBeersQuery).not.toHaveBeenCalled();
  });
});
