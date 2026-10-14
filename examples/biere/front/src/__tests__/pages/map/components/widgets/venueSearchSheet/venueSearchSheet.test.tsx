import { QueryClient } from "@tanstack/react-query";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import VenueService from "@/api/venues/venueService";
import { VenueSearchSheet } from "@/pages/map/components/widgets/venueSearchSheet/venueSearchSheet";
import type { VenueSearchSheetProps } from "@/pages/map/types/venueSearchSheet";
import { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";
import { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";
import { EMPTY_VENUE_QUERY } from "@/types/mappers/venue/venueQueryMapper";
import type { Venue } from "@/types/models/venue/venue";
import type { VenueQuery } from "@/types/models/venue/venueQuery";

vi.mock("@/api/venues/venueService", () => ({
  default: { search: vi.fn() },
}));

const found = (venues: Venue[], isApproximate = false) => ({ venues, isApproximate });

const LONG_NAME = "Brasserie-Artisanale-Du-Mont-Blanc-Et-Des-Alpes-Sans-Aucun-Espace-Dans-Son-Nom-Tres-Tres-Long-Vraiment";

const buildVenue = (overrides: Partial<Venue> = {}): Venue => ({
  id: 1,
  name: "Académie de la Bière",
  type: VenueTypeEnum.BAR,
  city: "Paris",
  address: "1 rue de la Bière",
  latitude: 48.85,
  longitude: 2.35,
  description: "",
  distanceKm: null,
  checkinCount: 0,
  lastCheckinAt: null,
  status: AvailabilityStatusEnum.CONFIRMED,
  ...overrides,
});

const FILTERS: VenueQuery = {
  ...EMPTY_VENUE_QUERY,
  bounds: { north: 48.9, south: 48.8, east: 2.4, west: 2.2 },
  types: [VenueTypeEnum.BAR],
  confirmedOnly: true,
  position: { latitude: 48.85, longitude: 2.35 },
  radiusKm: 5,
};

const onSelectVenue = vi.fn();

const renderSheet = (overrides: Partial<VenueSearchSheetProps> = {}, queryClient?: QueryClient) => {
  return renderWithProviders(
    <VenueSearchSheet filterQuery={FILTERS} activeFilterCount={0} onSelectVenue={onSelectVenue} {...overrides} />,
    queryClient === undefined ? {} : { queryClient },
  );
};

const openSheet = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Rechercher un lieu" }));
  return screen.findByRole("dialog", { name: "Rechercher un lieu" });
};

const typeInSheet = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
  await user.click(screen.getByRole("searchbox", { name: "Nom d'un lieu ou d'une ville" }));
  await user.paste(text);
};

describe("VenueSearchSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (VenueService.search as Mock).mockResolvedValue(found([]));
  });

  it("AC1 shows a closed secondary large trigger with a hidden magnifier, and no dialog", async () => {
    renderSheet();

    const trigger = screen.getByRole("button", { name: "Rechercher un lieu" });

    expect(trigger.className).toContain("button--secondary");
    expect(trigger.className).toContain("button--lg");
    expect(trigger.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(VenueService.search).not.toHaveBeenCalled();
  });

  it("AC1 opens a full-screen bottom sheet with a focused search field and the invitation, and sends no request", async () => {
    const user = userEvent.setup();
    renderSheet();

    const dialog = await openSheet(user);

    expect(within(dialog).getByRole("heading", { name: "Rechercher un lieu" })).toBeInTheDocument();
    const content = dialog.closest('[data-placement="bottom"]');
    expect(content).not.toBeNull();
    expect(document.querySelector(".h-dvh")).toHaveClass("md:h-auto");
    const field = within(dialog).getByRole("searchbox", { name: "Nom d'un lieu ou d'une ville" });
    await waitFor(() => expect(field).toHaveFocus());
    expect(within(dialog).getByText("Tapez le nom d'un lieu ou d'une ville")).toBeInTheDocument();
    expect(within(dialog).queryByRole("listitem")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    expect(VenueService.search).not.toHaveBeenCalled();
  });

  it("AC2 shows row skeletons while loading, then the venues with name, type, city and distance", async () => {
    const user = userEvent.setup();
    let resolveRequest: (venues: Venue[]) => void = () => undefined;
    (VenueService.search as Mock).mockImplementation(
      () => new Promise((resolve) => (resolveRequest = (venues) => resolve(found(venues)))),
    );
    renderSheet();
    const dialog = await openSheet(user);

    await typeInSheet(user, "acad");

    const skeletons = await within(dialog).findAllByTestId("venue-search-row-skeleton");
    expect(skeletons).toHaveLength(5);
    expect(within(dialog).queryByText("Tapez le nom d'un lieu ou d'une ville")).not.toBeInTheDocument();
    resolveRequest([buildVenue({ distanceKm: 0.45 }), buildVenue({ id: 2, name: "Le Trappiste", type: null, city: "", distanceKm: null })]);

    const rows = await within(dialog).findAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(dialog).queryByTestId("venue-search-row-skeleton")).not.toBeInTheDocument();
    expect(within(rows[0]).getByText("Académie de la Bière")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Bar")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Paris")).toBeInTheDocument();
    expect(within(rows[0]).getByText(/450\s*m/)).toBeInTheDocument();
    expect(rows[1]).toHaveTextContent(/^Le Trappiste$/);
  });

  it("AC3 shows the searching empty state when nothing matches, without the filters hint when none is active", async () => {
    const user = userEvent.setup();
    renderSheet({ activeFilterCount: 0 });
    const dialog = await openSheet(user);

    await typeInSheet(user, "zzz");

    expect(await within(dialog).findByText("Aucun lieu trouvé")).toBeInTheDocument();
    expect(dialog.querySelector('[data-slot="mascot"]')).toHaveAttribute("data-mood", "searching");
    expect(within(dialog).getByText("Essayez un autre nom ou une autre ville.")).toBeInTheDocument();
    expect(within(dialog).queryByText(/filtres actifs/)).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("AC3 reminds the active map filters in the empty state", async () => {
    const user = userEvent.setup();
    renderSheet({ activeFilterCount: 2 });
    const dialog = await openSheet(user);

    await typeInSheet(user, "zzz");

    expect(await within(dialog).findByText("Aucun lieu trouvé")).toBeInTheDocument();
    expect(
      within(dialog).getByText("Aucun lieu ne correspond avec les filtres actifs. Essayez d'en retirer."),
    ).toBeInTheDocument();
    expect(within(dialog).queryByText("Essayez un autre nom ou une autre ville.")).not.toBeInTheDocument();
  });

  it("AC4 announces a server error and searches again with Réessayer", async () => {
    const user = userEvent.setup();
    (VenueService.search as Mock).mockRejectedValueOnce(new Error("server down")).mockResolvedValue(found([buildVenue()]));
    renderSheet();
    const dialog = await openSheet(user);

    await typeInSheet(user, "acad");

    const alert = await within(dialog).findByRole("alert");
    expect(alert.className).toContain("alert--danger");
    expect(alert).toHaveTextContent("Impossible de chercher les lieux.");
    expect(within(dialog).queryByTestId("venue-search-row-skeleton")).not.toBeInTheDocument();
    expect(within(alert).getByRole("button", { name: "Réessayer" }).className).toContain("button--lg");
    await user.click(within(alert).getByRole("button", { name: "Réessayer" }));

    expect(await within(dialog).findByText("Académie de la Bière")).toBeInTheDocument();
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    expect(VenueService.search).toHaveBeenCalledTimes(2);
  });

  it("AC4 shows a single error after one failed search with the production retry policy", async () => {
    const user = userEvent.setup();
    (VenueService.search as Mock).mockRejectedValue(new Error("server down"));
    const client = new QueryClient({ defaultOptions: { queries: { retry: 1, retryDelay: 1, gcTime: Infinity } } });
    renderSheet({}, client);
    const dialog = await openSheet(user);

    await typeInSheet(user, "acad");

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Impossible de chercher les lieux.");
    expect(within(dialog).getAllByRole("alert")).toHaveLength(1);
  });

  it("AC5 closes the sheet and hands the touched venue to the screen", async () => {
    const user = userEvent.setup();
    const venue = buildVenue();
    (VenueService.search as Mock).mockResolvedValue(found([venue, buildVenue({ id: 2, name: "Le Trappiste" })]));
    renderSheet();
    const dialog = await openSheet(user);
    await typeInSheet(user, "acad");

    await user.click(await within(dialog).findByRole("button", { name: /Académie de la Bière/ }));

    expect(onSelectVenue).toHaveBeenCalledTimes(1);
    expect(onSelectVenue).toHaveBeenCalledWith(venue);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps the typed text and its results when the sheet is reopened", async () => {
    const user = userEvent.setup();
    (VenueService.search as Mock).mockResolvedValue(found([buildVenue()]));
    renderSheet();
    const dialog = await openSheet(user);
    await typeInSheet(user, "acad");
    await user.click(await within(dialog).findByRole("button", { name: /Académie de la Bière/ }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    const reopened = await openSheet(user);

    expect(within(reopened).getByRole("searchbox", { name: "Nom d'un lieu ou d'une ville" })).toHaveValue("acad");
    expect(within(reopened).getByText("Académie de la Bière")).toBeInTheDocument();
  });

  it("clears the text with the clear button and goes back to the invitation", async () => {
    const user = userEvent.setup();
    (VenueService.search as Mock).mockResolvedValue(found([buildVenue()]));
    renderSheet();
    const dialog = await openSheet(user);
    expect(within(dialog).queryByRole("button", { name: "Effacer la recherche" })).not.toBeInTheDocument();
    await typeInSheet(user, "acad");
    await within(dialog).findByText("Académie de la Bière");

    expect(within(dialog).getByRole("button", { name: "Effacer la recherche" })).toHaveClass("min-h-11", "min-w-11");
    await user.click(within(dialog).getByRole("button", { name: "Effacer la recherche" }));

    expect(within(dialog).getByRole("searchbox")).toHaveValue("");
    expect(await within(dialog).findByText("Tapez le nom d'un lieu ou d'une ville")).toBeInTheDocument();
    expect(within(dialog).queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("AC6 searches with the text, the map filters and the position but not the visible area", async () => {
    const user = userEvent.setup();
    renderSheet();
    const dialog = await openSheet(user);

    await typeInSheet(user, "  acad ");

    await within(dialog).findByText("Aucun lieu trouvé");
    expect(VenueService.search).toHaveBeenCalledTimes(1);
    expect(VenueService.search).toHaveBeenCalledWith({ ...FILTERS, bounds: null, q: "acad" });
  });

  it("AC7 gives the field and every row a 44px target, caps the text at 100 characters and wraps long names", async () => {
    const user = userEvent.setup();
    (VenueService.search as Mock).mockResolvedValue(found([buildVenue({ name: LONG_NAME, city: LONG_NAME })]));
    renderSheet();
    const dialog = await openSheet(user);
    const field = within(dialog).getByRole("searchbox", { name: "Nom d'un lieu ou d'une ville" });

    await user.click(field);
    await user.paste("x".repeat(101));

    expect(field).toHaveAttribute("maxlength", "100");
    expect(field).toHaveClass("min-h-11");
    expect(field).toHaveValue("x".repeat(100));
    const row = await within(dialog).findByRole("button", { name: new RegExp(LONG_NAME) });
    expect(row).toHaveClass("min-h-11", "w-full", "min-w-0");
    expect(within(row).getAllByText(LONG_NAME)[0]).toHaveClass("break-words");
    expect(within(dialog).getByRole("listitem")).toHaveClass("min-w-0");
  });

describe("approximate results", () => {
    const MENTION = "Aucun résultat exact : voici des lieux proches";

    it("AC1 announces politely, above the list, that the places are close matches", async () => {
      const user = userEvent.setup();
      (VenueService.search as Mock).mockResolvedValue(found([buildVenue({ id: 7, name: "La Taverne de Cluny" })], true));
      renderSheet();
      const dialog = await openSheet(user);

      await typeInSheet(user, "taverne cluni");

      const mention = await within(dialog).findByText(MENTION);
      expect(mention.tagName).toBe("P");
      expect(mention).toHaveAttribute("aria-live", "polite");
      const list = within(dialog).getByRole("list");
      expect(mention.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(within(list).getByText("La Taverne de Cluny")).toBeInTheDocument();
      expect(within(dialog).getAllByText(MENTION)).toHaveLength(1);
    });

    it("AC2 shows no mention for an exact search", async () => {
      const user = userEvent.setup();
      (VenueService.search as Mock).mockResolvedValue(found([buildVenue({ id: 7, name: "La Taverne de Cluny" })]));
      renderSheet();
      const dialog = await openSheet(user);

      await typeInSheet(user, "taverne de cluny");

      expect(await within(dialog).findByText("La Taverne de Cluny")).toBeInTheDocument();
      expect(within(dialog).queryByText(MENTION)).not.toBeInTheDocument();
    });

    it("shows no mention before typing or in the empty state", async () => {
      const user = userEvent.setup();
      renderSheet();
      const dialog = await openSheet(user);
      expect(within(dialog).queryByText(MENTION)).not.toBeInTheDocument();

      await typeInSheet(user, "zzzz");

      expect(await within(dialog).findByText("Aucun lieu trouvé")).toBeInTheDocument();
      expect(within(dialog).queryByText(MENTION)).not.toBeInTheDocument();
    });

    it("shows the empty state and no mention when the search is flagged close but holds no place", async () => {
      const user = userEvent.setup();
      (VenueService.search as Mock).mockResolvedValue(found([], true));
      renderSheet();
      const dialog = await openSheet(user);

      await typeInSheet(user, "zzzz");

      expect(await within(dialog).findByText("Aucun lieu trouvé")).toBeInTheDocument();
      expect(within(dialog).queryByText(MENTION)).not.toBeInTheDocument();
      expect(within(dialog).queryByRole("listitem")).not.toBeInTheDocument();
    });

    it("keeps the close matches selectable as any other row", async () => {
      const user = userEvent.setup();
      const venue = buildVenue({ id: 7, name: "La Taverne de Cluny" });
      (VenueService.search as Mock).mockResolvedValue(found([venue], true));
      renderSheet();
      const dialog = await openSheet(user);
      await typeInSheet(user, "taverne cluni");

      await user.click(await within(dialog).findByRole("button", { name: /La Taverne de Cluny/ }));

      expect(onSelectVenue).toHaveBeenCalledTimes(1);
      expect(onSelectVenue).toHaveBeenCalledWith(venue);
    });
  });
});
