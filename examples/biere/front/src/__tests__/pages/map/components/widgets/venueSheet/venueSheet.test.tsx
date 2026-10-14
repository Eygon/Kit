import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import i18n from "@/i18n/i18n";
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
  checkinCount: 0,
  lastCheckinAt: null,
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
          drunk: false,
          checkinCount: 0,
          lastCheckinAt: null,
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

  it("US17 shows a Signaler une bière ici button in the sheet and no report sheet until it is pressed", async () => {
    renderSheet(VENUE);

    const dialog = await screen.findByRole("dialog", { name: "La Fine Mousse" });

    expect(within(dialog).getByRole("button", { name: "Signaler une bière ici" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Signaler une bière" })).not.toBeInTheDocument();
  });

  it("US17 opens the report sheet for the venue on top of the venue sheet when the button is pressed", async () => {
    const user = userEvent.setup();
    renderSheet(VENUE);
    const dialog = await screen.findByRole("dialog", { name: "La Fine Mousse" });

    await user.click(within(dialog).getByRole("button", { name: "Signaler une bière ici" }));

    const report = await screen.findByRole("dialog", { name: "Signaler une bière" });
    expect(within(report).getByRole("searchbox", { name: "Rechercher une bière" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("US17 stacks the report sheet on the venue sheet on purpose, and its Fermer button closes only the report sheet", async () => {
    const user = userEvent.setup();
    renderSheet(VENUE);
    const dialog = await screen.findByRole("dialog", { name: "La Fine Mousse" });
    await user.click(within(dialog).getByRole("button", { name: "Signaler une bière ici" }));
    const report = await screen.findByRole("dialog", { name: "Signaler une bière" });

    await user.click(within(report).getByRole("button", { name: "Fermer" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Signaler une bière", hidden: true })).not.toBeInTheDocument());
    expect(await screen.findByRole("dialog", { name: "La Fine Mousse" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("US17 closes only the report sheet on Escape", async () => {
    const user = userEvent.setup();
    renderSheet(VENUE);
    const dialog = await screen.findByRole("dialog", { name: "La Fine Mousse" });
    await user.click(within(dialog).getByRole("button", { name: "Signaler une bière ici" }));
    await screen.findByRole("dialog", { name: "Signaler une bière" });

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Signaler une bière", hidden: true })).not.toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled();
  });

  it("US17 reports the chosen beer for the id of the selected venue", async () => {
    const orval = { id: 7, name: "Orval", breweryName: "Brasserie d'Orval", country: "BE", styleId: 12, styleName: "Trappiste", family: "trappist", abv: 6.2, aromas: [], formats: [], description: "", drunk: false, checkinCount: 0, inWishlist: false };
    const created = { beerId: 7, beerName: "Orval", breweryName: "Orval", styleName: "Trappiste", family: "trappist", status: "unknown", lastConfirmedAt: null, recentVoterCount: 0, nextVoteAt: null, drunk: false, checkinCount: 0, lastCheckinAt: null };
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? new Response(JSON.stringify(created), { status: 201 })
        : new Response(JSON.stringify({ items: [orval], total: 1, page: 1, size: 10, facets: { families: [], countries: [], formats: [] } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderSheet({ ...VENUE, id: 42 });
    const dialog = await screen.findByRole("dialog", { name: "La Fine Mousse" });
    await user.click(within(dialog).getByRole("button", { name: "Signaler une bière ici" }));
    const report = await screen.findByRole("dialog", { name: "Signaler une bière" });
    await user.type(within(report).getByRole("searchbox"), "orv");

    await user.click(await within(report).findByRole("button", { name: /Orval/ }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Signaler une bière", hidden: true })).not.toBeInTheDocument());
    const posts = fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(posts).toHaveLength(1);
    expect(posts[0][0]).toMatch(/\/api\/v1\/venues\/42\/beers$/);
    expect(await screen.findByRole("dialog", { name: "La Fine Mousse" })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  describe("visit summary", () => {
    const VISITED: Venue = { ...VENUE, checkinCount: 3, lastCheckinAt: new Date("2026-10-09T12:00:00.000Z") };
    const buildBeer = (beerId: number, beerName: string, drunk: boolean) => ({
      beerId,
      beerName,
      breweryName: "Chouffe",
      styleName: "Double IPA",
      family: BeerFamilyEnum.IPA,
      status: AvailabilityStatusEnum.CONFIRMED,
      lastConfirmedAt: null,
      recentVoterCount: 0,
      nextVoteAt: null,
      drunk,
      checkinCount: drunk ? 5 : 0,
      lastCheckinAt: null,
    });

    beforeEach(async () => {
      vi.stubEnv("TZ", "Europe/Paris");
      await i18n.changeLanguage("fr");
    });

    afterEach(async () => {
      vi.unstubAllEnvs();
      await i18n.changeLanguage("fr");
    });

    it("AC1 writes the count and the last date at the very top of the body, before the type", async () => {
      renderSheet(VISITED);

      const dialog = await screen.findByRole("dialog", { name: "La Fine Mousse" });
      const sentence = within(dialog).getByText("Vous avez bu ici 3 fois (dernière fois le 9 oct. 2026)");
      const heading = within(dialog).getByRole("heading", { name: "La Fine Mousse" });

      expect(heading.compareDocumentPosition(sentence) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(sentence.compareDocumentPosition(within(dialog).getByText("Bar")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("AC2 writes the singular for one check-in", async () => {
      renderSheet({ ...VISITED, checkinCount: 1 });

      const dialog = await screen.findByRole("dialog", { name: "La Fine Mousse" });

      expect(within(dialog).getByText("Vous avez bu ici 1 fois (dernière fois le 9 oct. 2026)")).toBeInTheDocument();
    });

    it("AC3 shows no sentence when no check-in is linked to the venue", async () => {
      renderSheet({ ...VENUE, checkinCount: 0, lastCheckinAt: null });

      const dialog = await screen.findByRole("dialog", { name: "La Fine Mousse" });

      expect(within(dialog).getByRole("heading", { name: "La Fine Mousse" })).toBeInTheDocument();
      expect(within(dialog).queryByText(/Vous avez bu ici/)).not.toBeInTheDocument();
    });

    it("AC4 keeps the stamps of the beers whatever the venue count is", async () => {
      mockQuery.useVenueBeersQuery.mockReturnValue({
        beers: [buildBeer(7, "Houblon Chouffe", true), buildBeer(8, "Mc Chouffe", false)],
        isPending: false,
        isError: false,
        refetch: vi.fn(),
      });
      renderSheet({ ...VENUE, checkinCount: 0, lastCheckinAt: null });

      const dialog = await screen.findByRole("dialog", { name: "La Fine Mousse" });

      expect(within(dialog).getByText("Déjà bue")).toBeInTheDocument();
      expect(within(dialog).getByText("À découvrir")).toBeInTheDocument();
      expect(within(dialog).getByText("Bue 5 fois")).toBeInTheDocument();
      expect(within(dialog).queryByText(/Vous avez bu ici/)).not.toBeInTheDocument();
    });

    it("AC4 keeps the stamps of the beers when the venue has check-ins", async () => {
      mockQuery.useVenueBeersQuery.mockReturnValue({
        beers: [buildBeer(7, "Houblon Chouffe", true), buildBeer(8, "Mc Chouffe", false)],
        isPending: false,
        isError: false,
        refetch: vi.fn(),
      });
      renderSheet(VISITED);

      const dialog = await screen.findByRole("dialog", { name: "La Fine Mousse" });

      expect(within(dialog).getByText("Vous avez bu ici 3 fois (dernière fois le 9 oct. 2026)")).toBeInTheDocument();
      expect(within(dialog).getByText("Déjà bue")).toBeInTheDocument();
      expect(within(dialog).getByText("À découvrir")).toBeInTheDocument();
      expect(within(dialog).getByText("Bue 5 fois")).toBeInTheDocument();
    });

    it("AC5 writes the sentence in english", async () => {
      await i18n.changeLanguage("en");
      renderSheet(VISITED);

      const dialog = await screen.findByRole("dialog", { name: "La Fine Mousse" });

      expect(within(dialog).getByText("You drank here 3 times (last on Oct 9, 2026)")).toBeInTheDocument();
    });
  });
});
