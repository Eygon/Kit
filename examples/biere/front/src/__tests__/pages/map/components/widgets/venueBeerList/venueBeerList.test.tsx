import { useQuery } from "@tanstack/react-query";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router";
import { VenueBeerList } from "@/pages/map/components/widgets/venueBeerList/venueBeerList";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import type { VenueBeer } from "@/types/models/venue/venueBeer";
import { voteVenueBeer } from "@/utils/queryFunctions/venueQueryFunctions";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

const LONG_NAME = "Brasserie-Artisanale-Du-Mont-Blanc-Et-Des-Alpes-Sans-Aucun-Espace-Dans-Son-Nom-Tres-Tres-Long-Vraiment";

const mockQuery = vi.hoisted(() => ({
  useVenueBeersQuery: vi.fn(),
}));

vi.mock("@/pages/map/hooks/useVenueBeersQuery", () => mockQuery);

vi.mock("@/utils/queryFunctions/venueQueryFunctions", () => ({
  voteVenueBeer: vi.fn(),
}));

const NOW = new Date("2026-10-13T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const refetch = vi.fn();

const beer = (beerId: number, family: BeerFamilyEnum | null, overrides: Partial<VenueBeer> = {}): VenueBeer => ({
  beerId,
  beerName: `Bière ${beerId}`,
  breweryName: `Brasserie ${beerId}`,
  styleName: "Style",
  family,
  status: AvailabilityStatusEnum.CONFIRMED,
  lastConfirmedAt: null,
  recentVoterCount: 0,
  nextVoteAt: null,
  drunk: false,
  checkinCount: 0,
  lastCheckinAt: null,
  ...overrides,
});

const givenQuery = (state: Partial<{ beers: VenueBeer[]; isPending: boolean; isError: boolean }>) => {
  mockQuery.useVenueBeersQuery.mockReturnValue({ beers: [], isPending: false, isError: false, refetch, ...state });
};

const renderList = (venueId = 12, initialPath = "/carte") => renderWithProviders(<VenueBeerList venueId={venueId} />, { initialPath });

describe("VenueBeerList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads the beers of the venue it is given", () => {
    givenQuery({ beers: [beer(1, BeerFamilyEnum.IPA)] });

    renderList(42);

    expect(mockQuery.useVenueBeersQuery).toHaveBeenCalledWith(42);
  });

  it("AC1 lists the 3 IPA and the 2 Stout in two family groups, in the received order, each with name, brewery and badge", () => {
    givenQuery({
      beers: [
        beer(3, BeerFamilyEnum.IPA),
        beer(1, BeerFamilyEnum.IPA),
        beer(2, BeerFamilyEnum.IPA),
        beer(5, BeerFamilyEnum.STOUT, { status: AvailabilityStatusEnum.GONE }),
        beer(4, BeerFamilyEnum.STOUT, { status: AvailabilityStatusEnum.UNKNOWN }),
      ],
    });

    renderList();

    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toEqual(["IPA", "Stout"]);
    const lists = screen.getAllByRole("list");
    expect(lists).toHaveLength(2);
    const ipaItems = within(lists[0]).getAllByRole("listitem");
    const stoutItems = within(lists[1]).getAllByRole("listitem");
    expect(ipaItems.map((item) => within(item).getByText(/^Bière \d$/).textContent)).toEqual(["Bière 3", "Bière 1", "Bière 2"]);
    expect(stoutItems.map((item) => within(item).getByText(/^Bière \d$/).textContent)).toEqual(["Bière 5", "Bière 4"]);
    expect(within(ipaItems[0]).getByText("Brasserie 3")).toBeInTheDocument();
    expect(within(ipaItems[0]).getByText("Confirmée")).toBeInTheDocument();
    expect(within(stoutItems[0]).getByText("Brasserie 5")).toBeInTheDocument();
    expect(within(stoutItems[0]).getByText("Épuisée")).toBeInTheDocument();
    expect(within(stoutItems[1]).getByText("Inconnue")).toBeInTheDocument();
  });

  it("AC1 opens a new group when a family comes back after another one", () => {
    givenQuery({ beers: [beer(1, BeerFamilyEnum.IPA), beer(2, BeerFamilyEnum.STOUT), beer(3, BeerFamilyEnum.IPA)] });

    renderList();

    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(["IPA", "Stout", "IPA"]);
  });

  it("titles a group of beers without family Autres", () => {
    givenQuery({ beers: [beer(1, BeerFamilyEnum.IPA), beer(2, null)] });

    renderList();

    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(["IPA", "Autres"]);
  });

  it("AC2 shows the badge Peut-être épuisée with its ? glyph for a maybe gone beer, and only for it", () => {
    givenQuery({
      beers: [
        beer(1, BeerFamilyEnum.IPA, { status: AvailabilityStatusEnum.MAYBE_GONE }),
        beer(2, BeerFamilyEnum.IPA, { status: AvailabilityStatusEnum.CONFIRMED }),
      ],
    });

    renderList();

    const items = screen.getAllByRole("listitem");
    const badge = within(items[0]).getByText("Peut-être épuisée").closest(".chip");
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain("?");
    expect(within(items[1]).queryByText("Peut-être épuisée")).not.toBeInTheDocument();
    expect(screen.getAllByText("Peut-être épuisée")).toHaveLength(1);
  });

  it("AC3 shows loading blocks and nothing else while the beers load", () => {
    givenQuery({ isPending: true });

    renderList();

    expect(screen.getAllByTestId("venue-beer-skeleton").length).toBeGreaterThan(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByText("Aucune bière signalée ici")).not.toBeInTheDocument();
  });

  it("AC3 shows the alert Impossible de charger les bières. with Réessayer that refetches", async () => {
    const user = userEvent.setup();
    givenQuery({ isError: true });

    renderList();

    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("alert--danger");
    expect(within(alert).getByText("Impossible de charger les bières.")).toBeInTheDocument();
    expect(screen.queryByTestId("venue-beer-skeleton")).not.toBeInTheDocument();
    await user.click(within(alert).getByRole("button", { name: "Réessayer" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("AC3 shows the searching mascot, Aucune bière signalée ici and its invitation when the venue has no beer", () => {
    givenQuery({ beers: [] });

    const { container } = renderList();

    expect(screen.getByText("Aucune bière signalée ici")).toBeInTheDocument();
    expect(screen.getByText("Soyez le premier à en signaler une.")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="mascot"][data-mood="searching"]')).not.toBeNull();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("AC1 shows under each beer the stamp of its own state, after the brewery and before the availability badge", () => {
    givenQuery({
      beers: [
        beer(1, BeerFamilyEnum.IPA, { drunk: true, checkinCount: 3, lastCheckinAt: new Date("2026-10-12T12:00:00.000Z") }),
        beer(2, BeerFamilyEnum.IPA, { drunk: false }),
        beer(3, BeerFamilyEnum.IPA, { drunk: true, checkinCount: 1, lastCheckinAt: null }),
      ],
    });

    renderList();

    const [first, second, third] = screen.getAllByRole("listitem");
    expect(within(first).getByText("Déjà bue")).toBeInTheDocument();
    expect(within(first).getByText(/^Bue 3 fois · dernière fois le /)).toBeInTheDocument();
    expect(within(second).getByText("À découvrir")).toBeInTheDocument();
    expect(within(second).queryByText("Déjà bue")).not.toBeInTheDocument();
    expect(within(third).getByText("Déjà bue")).toBeInTheDocument();
    expect(within(third).getByText("Bue 1 fois")).toBeInTheDocument();
    const brewery = within(first).getByText("Brasserie 1");
    const stamp = within(first).getByText("Déjà bue");
    const badge = within(first).getByText("Confirmée");
    expect(brewery.compareDocumentPosition(stamp) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(stamp.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("wraps a very long beer and brewery name", () => {
    givenQuery({ beers: [beer(1, BeerFamilyEnum.IPA, { beerName: LONG_NAME, breweryName: LONG_NAME })] });

    renderList();

    const nodes = screen.getAllByText(LONG_NAME);
    expect(nodes).toHaveLength(2);
    expect(nodes.every((node) => node.className.includes("break-words"))).toBe(true);
    expect(screen.getByRole("listitem").className).toContain("min-w-0");
  });

  describe("discovery summary and undrunk filter", () => {
    const tenBeers = () => [
      beer(1, BeerFamilyEnum.IPA, { drunk: true, checkinCount: 1 }),
      beer(2, BeerFamilyEnum.IPA),
      beer(3, BeerFamilyEnum.IPA),
      beer(4, BeerFamilyEnum.IPA),
      beer(5, BeerFamilyEnum.STOUT, { drunk: true, checkinCount: 2 }),
      beer(6, BeerFamilyEnum.STOUT),
      beer(7, BeerFamilyEnum.STOUT),
      beer(8, BeerFamilyEnum.STOUT, { drunk: true, checkinCount: 1 }),
      beer(9, BeerFamilyEnum.IPA),
      beer(10, null),
    ];
    const SWITCH_NAME = "Bières que je n'ai pas encore bues";

    const LocationProbe = () => {
      const location = useLocation();
      return <output aria-label="search">{location.search}</output>;
    };

    it("AC1 says 7 bières à découvrir ici above the groups and shows the switch off", () => {
      givenQuery({ beers: tenBeers() });

      renderList();

      expect(screen.getByText("7 bières à découvrir ici")).toBeInTheDocument();
      expect(screen.getByRole("switch", { name: SWITCH_NAME })).not.toBeChecked();
      expect(screen.getAllByRole("listitem")).toHaveLength(10);
      const counter = screen.getByText("7 bières à découvrir ici");
      const firstHeading = screen.getAllByRole("heading", { level: 3 })[0];
      expect(counter.compareDocumentPosition(firstHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("AC2 keeps the 7 undrunk beers grouped by family, writes the parameter and keeps the counter when the switch is turned on", async () => {
      const user = userEvent.setup();
      givenQuery({ beers: tenBeers() });
      renderWithProviders(
        <>
          <VenueBeerList venueId={12} />
          <LocationProbe />
        </>,
        { initialPath: "/carte?type=bar" },
      );

      await user.click(screen.getByRole("switch", { name: SWITCH_NAME }));

      expect(screen.getByLabelText("search").textContent).toBe("?type=bar&undrunk=1");
      expect(screen.getByRole("switch", { name: SWITCH_NAME })).toBeChecked();
      expect(screen.getAllByRole("listitem")).toHaveLength(7);
      expect(screen.queryByText("Déjà bue")).not.toBeInTheDocument();
      expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(["IPA", "Stout", "IPA", "Autres"]);
      expect(screen.getByText("7 bières à découvrir ici")).toBeInTheDocument();
    });

    it("AC2 shows every beer again when the switch is turned off", async () => {
      const user = userEvent.setup();
      givenQuery({ beers: tenBeers() });

      renderList(12, "/carte?undrunk=1");
      expect(screen.getAllByRole("listitem")).toHaveLength(7);

      await user.click(screen.getByRole("switch", { name: SWITCH_NAME }));

      expect(screen.getAllByRole("listitem")).toHaveLength(10);
    });

    it("AC3 shows the switch active and the filtered list from the address, for any venue", () => {
      givenQuery({ beers: tenBeers() });

      renderList(99, "/carte?undrunk=1&type=bar");

      expect(mockQuery.useVenueBeersQuery).toHaveBeenCalledWith(99);
      expect(screen.getByRole("switch", { name: SWITCH_NAME })).toBeChecked();
      expect(screen.getAllByRole("listitem")).toHaveLength(7);
    });

    it("AC4 says Tu as déjà goûté toutes les bières d'ici when every beer is drunk", () => {
      givenQuery({ beers: [beer(1, BeerFamilyEnum.IPA, { drunk: true }), beer(2, BeerFamilyEnum.STOUT, { drunk: true })] });

      renderList();

      expect(screen.getByText("Tu as déjà goûté toutes les bières d'ici")).toBeInTheDocument();
      expect(screen.getAllByRole("listitem")).toHaveLength(2);
    });

    it("AC4 shows the captured mascot, Rien de nouveau ici and its description when the switch is active and every beer is drunk", () => {
      givenQuery({ beers: [beer(1, BeerFamilyEnum.IPA, { drunk: true }), beer(2, BeerFamilyEnum.STOUT, { drunk: true })] });

      const { container } = renderList(12, "/carte?undrunk=1");

      expect(screen.getByText("Rien de nouveau ici")).toBeInTheDocument();
      expect(screen.getByText("Désactivez le filtre pour revoir toutes les bières du lieu.")).toBeInTheDocument();
      expect(container.querySelector('[data-slot="mascot"][data-mood="captured"]')).not.toBeNull();
      expect(container.querySelectorAll('[data-slot="mascot"]')).toHaveLength(1);
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
      expect(screen.getByText("Tu as déjà goûté toutes les bières d'ici")).toBeInTheDocument();
      expect(screen.getByRole("switch", { name: SWITCH_NAME })).toBeChecked();
    });

    it("AC4 lets the user turn the filter off from the empty state", async () => {
      const user = userEvent.setup();
      givenQuery({ beers: [beer(1, BeerFamilyEnum.IPA, { drunk: true })] });

      renderList(12, "/carte?undrunk=1");
      await user.click(screen.getByRole("switch", { name: SWITCH_NAME }));

      expect(screen.queryByText("Rien de nouveau ici")).not.toBeInTheDocument();
      expect(screen.getAllByRole("listitem")).toHaveLength(1);
    });

    it("AC5 keeps the current empty state without counter nor switch for a venue without beer, even with the filter active", () => {
      givenQuery({ beers: [] });

      renderList(12, "/carte?undrunk=1");

      expect(screen.getByText("Aucune bière signalée ici")).toBeInTheDocument();
      expect(screen.queryByText("Rien de nouveau ici")).not.toBeInTheDocument();
      expect(screen.queryByRole("switch")).not.toBeInTheDocument();
      expect(screen.queryByText(/à découvrir ici/)).not.toBeInTheDocument();
      expect(screen.queryByText("Tu as déjà goûté toutes les bières d'ici")).not.toBeInTheDocument();
    });

    it("E2 counts every beer as to discover for a user who has drunk nothing", () => {
      givenQuery({ beers: [beer(1, BeerFamilyEnum.IPA), beer(2, BeerFamilyEnum.IPA), beer(3, BeerFamilyEnum.STOUT)] });

      renderList();

      expect(screen.getByText("3 bières à découvrir ici")).toBeInTheDocument();
      expect(screen.getAllByText("À découvrir")).toHaveLength(3);
    });

    it("AC6 uses the singular for a venue with one undrunk beer", () => {
      givenQuery({ beers: [beer(1, BeerFamilyEnum.IPA), beer(2, BeerFamilyEnum.IPA, { drunk: true })] });

      renderList();

      expect(screen.getByText("1 bière à découvrir ici")).toBeInTheDocument();
    });

    it("shows neither counter nor switch while loading or on error", () => {
      givenQuery({ isPending: true });
      const { unmount } = renderList();
      expect(screen.queryByRole("switch")).not.toBeInTheDocument();
      unmount();

      givenQuery({ isError: true });
      renderList();
      expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    });
  });

  describe("availability detail and votes", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(NOW);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("AC1 reads Confirmée il y a 2 jours par 5 personnes under a beer confirmed 2 days ago by 5 voters", () => {
      givenQuery({
        beers: [beer(1, BeerFamilyEnum.IPA, { lastConfirmedAt: new Date(NOW.getTime() - 2 * DAY_MS), recentVoterCount: 5 })],
      });

      renderList();

      const item = screen.getByRole("listitem");
      expect(within(item).getByText("Confirmée il y a 2 jours par 5 personnes")).toBeInTheDocument();
    });

    it("AC1 reads aujourd'hui and the singular for a confirmation of today by one voter", () => {
      givenQuery({
        beers: [beer(1, BeerFamilyEnum.IPA, { lastConfirmedAt: new Date(NOW.getTime() - HOUR_MS), recentVoterCount: 1 })],
      });

      renderList();

      expect(screen.getByText("Confirmée aujourd'hui par 1 personne")).toBeInTheDocument();
    });

    it("AC2 reads Jamais confirmée alone, or followed by the recent voters, each under its own beer", () => {
      givenQuery({
        beers: [
          beer(1, BeerFamilyEnum.IPA, { lastConfirmedAt: null, recentVoterCount: 0 }),
          beer(2, BeerFamilyEnum.IPA, { lastConfirmedAt: null, recentVoterCount: 3 }),
        ],
      });

      renderList();

      const items = screen.getAllByRole("listitem");
      expect(within(items[0]).getByText("Jamais confirmée")).toBeInTheDocument();
      expect(within(items[0]).queryByText(/récemment/)).not.toBeInTheDocument();
      expect(within(items[1]).getByText("Jamais confirmée · 3 personnes récemment")).toBeInTheDocument();
    });

    it("shows the two vote buttons of every beer, named after it", () => {
      givenQuery({ beers: [beer(1, BeerFamilyEnum.IPA), beer(2, BeerFamilyEnum.STOUT)] });

      renderList();

      const items = screen.getAllByRole("listitem");
      expect(within(items[0]).getByRole("button", { name: "Toujours là : Bière 1" })).toBeInTheDocument();
      expect(within(items[0]).getByRole("button", { name: "Plus là : Bière 1" })).toBeInTheDocument();
      expect(within(items[1]).getByRole("button", { name: "Toujours là : Bière 2" })).toBeInTheDocument();
      expect(within(items[1]).getByRole("button", { name: "Plus là : Bière 2" })).toBeInTheDocument();
    });

    it("AC4 disables the buttons of the beer voted 3 hours ago only, with the waiting text in its item", () => {
      givenQuery({
        beers: [
          beer(1, BeerFamilyEnum.IPA, { nextVoteAt: new Date(NOW.getTime() + 21 * HOUR_MS) }),
          beer(2, BeerFamilyEnum.IPA),
        ],
      });

      renderList();

      const items = screen.getAllByRole("listitem");
      expect(within(items[0]).getByRole("button", { name: "Toujours là : Bière 1" })).toBeDisabled();
      expect(within(items[0]).getByRole("button", { name: "Plus là : Bière 1" })).toBeDisabled();
      expect(within(items[0]).getByText("Vous pourrez revoter dans 21 h")).toBeInTheDocument();
      expect(within(items[1]).getByRole("button", { name: "Toujours là : Bière 2" })).toBeEnabled();
      expect(within(items[1]).queryByText(/Vous pourrez revoter/)).not.toBeInTheDocument();
    });

    it("AC3 votes for the venue of the list, then the status and the detail of the beer show the response", async () => {
      const user = userEvent.setup();
      const initial = [
        beer(1, BeerFamilyEnum.IPA, { status: AvailabilityStatusEnum.MAYBE_GONE }),
        beer(2, BeerFamilyEnum.IPA, { status: AvailabilityStatusEnum.UNKNOWN }),
      ];
      mockQuery.useVenueBeersQuery.mockImplementation((venueId: number) => {
        const { data } = useQuery({ queryKey: venueKeys.beers(venueId), queryFn: () => initial, staleTime: Infinity });
        return { beers: data ?? [], isPending: data === undefined, isError: false, refetch };
      });
      vi.mocked(voteVenueBeer).mockResolvedValue(
        beer(1, BeerFamilyEnum.IPA, {
          status: AvailabilityStatusEnum.CONFIRMED,
          lastConfirmedAt: NOW,
          recentVoterCount: 6,
          nextVoteAt: new Date(NOW.getTime() + 24 * HOUR_MS),
        }),
      );

      renderList(42);
      const [first, second] = await screen.findAllByRole("listitem");
      expect(within(first).getByText("Peut-être épuisée")).toBeInTheDocument();
      expect(within(first).getByText("Jamais confirmée")).toBeInTheDocument();

      await user.click(within(first).getByRole("button", { name: "Toujours là : Bière 1" }));

      expect(voteVenueBeer).toHaveBeenCalledWith(42, 1, "still");
      await waitFor(() => expect(within(first).getByText("Confirmée aujourd'hui par 6 personnes")).toBeInTheDocument());
      expect(within(first).getByText("Confirmée")).toBeInTheDocument();
      expect(within(first).queryByText("Peut-être épuisée")).not.toBeInTheDocument();
      expect(within(first).getByText("Vous pourrez revoter dans 24 h")).toBeInTheDocument();
      expect(within(second).getByText("Inconnue")).toBeInTheDocument();
      expect(within(second).getByRole("button", { name: "Toujours là : Bière 2" })).toBeEnabled();
    });

    it("AC6 keeps the stamp of the voted beer when its row is replaced by the response, and leaves the others alone", async () => {
      const user = userEvent.setup();
      const lastCheckinAt = new Date("2026-10-12T12:00:00.000Z");
      const initial = [
        beer(1, BeerFamilyEnum.IPA, { drunk: true, checkinCount: 3, lastCheckinAt }),
        beer(2, BeerFamilyEnum.IPA, { drunk: false }),
      ];
      mockQuery.useVenueBeersQuery.mockImplementation((venueId: number) => {
        const { data } = useQuery({ queryKey: venueKeys.beers(venueId), queryFn: () => initial, staleTime: Infinity });
        return { beers: data ?? [], isPending: data === undefined, isError: false, refetch };
      });
      vi.mocked(voteVenueBeer).mockResolvedValue(
        beer(1, BeerFamilyEnum.IPA, {
          status: AvailabilityStatusEnum.CONFIRMED,
          lastConfirmedAt: NOW,
          recentVoterCount: 6,
          nextVoteAt: new Date(NOW.getTime() + 24 * HOUR_MS),
          drunk: true,
          checkinCount: 3,
          lastCheckinAt,
        }),
      );

      renderList(42);
      const [first, second] = await screen.findAllByRole("listitem");
      expect(within(first).getByText("Déjà bue")).toBeInTheDocument();

      await user.click(within(first).getByRole("button", { name: "Toujours là : Bière 1" }));

      await waitFor(() => expect(within(first).getByText("Confirmée aujourd'hui par 6 personnes")).toBeInTheDocument());
      expect(within(first).getByText("Déjà bue")).toBeInTheDocument();
      expect(within(first).getByText(/^Bue 3 fois · dernière fois le /)).toBeInTheDocument();
      expect(within(second).getByText("À découvrir")).toBeInTheDocument();
    });
  });
});
