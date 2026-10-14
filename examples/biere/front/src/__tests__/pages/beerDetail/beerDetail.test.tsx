import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, Route, Routes, useLocation } from "react-router";
import { afterEach } from "vitest";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import i18n from "@/i18n/i18n";
import { BeerDetailPage } from "@/pages/beerDetail/beerDetail";
import { BeerAromaEnum } from "@/types/enums/beer/beerAromaEnum";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { BeerFormatEnum } from "@/types/enums/beer/beerFormatEnum";
import {
  RoutePathEnum,
  buildBeerDetailPath,
} from "@/types/enums/routing/routePathEnum";
import type { Beer } from "@/types/models/beer/beer";

const mockBeer = vi.hoisted(() => ({ useBeerQuery: vi.fn() }));

vi.mock("@/pages/beerDetail/hooks/useBeerQuery", () => mockBeer);

const mockWishlist = vi.hoisted(() => ({
  useWishlistToggle: vi.fn(),
  toggleWishlist: vi.fn(),
}));

vi.mock("@/pages/beerDetail/hooks/useWishlistToggle", () => ({
  useWishlistToggle: mockWishlist.useWishlistToggle,
}));

const mockHistory = vi.hoisted(() => ({ useBeerCheckinsQuery: vi.fn() }));

vi.mock("@/pages/beerDetail/hooks/useBeerCheckinsQuery", () => mockHistory);

const mockReviews = vi.hoisted(() => ({ useBeerReviewsQuery: vi.fn() }));

vi.mock("@/pages/beerDetail/hooks/useBeerReviewsQuery", () => mockReviews);

const mockVenues = vi.hoisted(() => ({ useBeerVenuesQuery: vi.fn() }));

vi.mock("@/pages/beerDetail/hooks/useBeerVenuesQuery", () => mockVenues);

const mockMyCollections = vi.hoisted(() => ({
  useMyCollectionsQuery: vi.fn(),
}));

vi.mock(
  "@/pages/beerDetail/hooks/useMyCollectionsQuery",
  () => mockMyCollections,
);

const mockMembership = vi.hoisted(() => ({
  useCollectionMembershipToggle: vi.fn(),
  toggleMembership: vi.fn(),
  isTogglePending: vi.fn(),
}));

vi.mock("@/pages/beerDetail/hooks/useCollectionMembershipToggle", () => ({
  useCollectionMembershipToggle: mockMembership.useCollectionMembershipToggle,
}));

const CHIMAY: Beer = {
  id: 1,
  name: "Chimay Rouge",
  breweryName: "Bières de Chimay",
  country: "BE",
  styleId: 4,
  styleName: "Dubbel trappiste",
  family: BeerFamilyEnum.TRAPPIST,
  abv: 7,
  aromas: [
    BeerAromaEnum.FRUITY,
    BeerAromaEnum.CARAMEL,
    BeerAromaEnum.SPICY,
    BeerAromaEnum.MALTY,
  ],
  formats: [BeerFormatEnum.BOTTLE],
  description: "Une trappiste cuivrée aux notes de fruits mûrs.",
  drunk: false,
  checkinCount: 0,
  inWishlist: false,
  bitternessLevel: 4,
  colorLevel: 3,
  styleColorRange: null,
  averageRating: null,
  reviewCount: 0,
  ratingDistribution: [],
  criteria: [],
};

const refetch = vi.fn();

const stubQuery = (overrides: Record<string, unknown> = {}) => {
  mockBeer.useBeerQuery.mockReturnValue({
    data: CHIMAY,
    isPending: false,
    isError: false,
    refetch,
    ...overrides,
  });
};

const PathnameProbe = () => (
  <output aria-label="pathname">{useLocation().pathname}</output>
);

const renderDetail = (initialPath = buildBeerDetailPath(1)) =>
  renderWithProviders(
    <Routes>
      <Route path={RoutePathEnum.BEER_DETAIL} element={<BeerDetailPage />} />
      <Route
        path="*"
        element={
          <>
            <p>encyclopedia grid</p>
            <PathnameProbe />
          </>
        }
      />
    </Routes>,
    { initialPath },
  );

const GridWithLink = () => {
  const location = useLocation();
  return (
    <>
      <output aria-label="location">{location.search}</output>
      <Link to={buildBeerDetailPath(1)}>open Chimay</Link>
    </>
  );
};

describe("BeerDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refetch.mockResolvedValue(undefined);
    stubQuery();
    mockWishlist.useWishlistToggle.mockReturnValue({
      toggleWishlist: mockWishlist.toggleWishlist,
      isPending: false,
    });
    mockMyCollections.useMyCollectionsQuery.mockReturnValue({
      collections: [
        {
          id: null,
          kind: "wishlist",
          name: "",
          beerCount: 1,
          containsBeer: true,
        },
        {
          id: 5,
          kind: "custom",
          name: "Trappistes",
          beerCount: 0,
          containsBeer: false,
        },
      ],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    mockMembership.isTogglePending.mockReturnValue(false);
    mockMembership.useCollectionMembershipToggle.mockReturnValue({
      toggleMembership: mockMembership.toggleMembership,
      isTogglePending: mockMembership.isTogglePending,
    });
    mockVenues.useBeerVenuesQuery.mockReturnValue({
      venues: [],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    mockReviews.useBeerReviewsQuery.mockReturnValue({
      mine: null,
      reviews: [],
      total: 0,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mockHistory.useBeerCheckinsQuery.mockReturnValue({
      checkins: [],
      total: 0,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
  });

  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("mounts the reviews section between the description and the history", () => {
    stubQuery({
      data: {
        ...CHIMAY,
        averageRating: 3.5,
        reviewCount: 12,
        ratingDistribution: [1, 2, 3, 4, 5].map((stars) => ({
          stars,
          count: stars,
        })),
        criteria: [{ criterion: "sweetness", average: 2.7, count: 3 }],
      },
    });
    renderDetail();

    const description = screen.getByRole("heading", { name: "Description" });
    const reviews = screen.getByRole("heading", { level: 2, name: "Avis" });
    const history = screen.getByRole("heading", { name: "Mon historique" });
    expect(screen.getByText("3,5")).toBeInTheDocument();
    expect(screen.getByText("Douceur 2,7 / 5 · Sèche")).toBeInTheDocument();
    expect(
      description.compareDocumentPosition(reviews) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      reviews.compareDocumentPosition(history) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("asks for the beer of the id in the url", () => {
    renderDetail("/bieres/42");

    expect(mockBeer.useBeerQuery).toHaveBeenCalledWith(42);
  });

  it("shows the whole sheet of Chimay Rouge in French", () => {
    renderDetail();

    expect(
      screen.getByRole("heading", { level: 1, name: "Chimay Rouge" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Brasserie")).toBeInTheDocument();
    expect(screen.getByText("Bières de Chimay")).toBeInTheDocument();
    expect(screen.getByText("Pays")).toBeInTheDocument();
    expect(screen.getByText("Belgique")).toBeInTheDocument();
    expect(screen.getByText("Style")).toBeInTheDocument();
    expect(screen.getByText("Dubbel trappiste")).toBeInTheDocument();
    expect(screen.getByText("Trappiste")).toBeInTheDocument();
    expect(screen.getByText("Degré")).toBeInTheDocument();
    expect(screen.getByText(/^7\s%$/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Arômes" })).toBeInTheDocument();
    ["Fruité", "Caramel", "Épicé", "Malté"].forEach((aroma) =>
      expect(screen.getByText(aroma)).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("heading", { name: "Formats" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Bouteille")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Description" }),
    ).toBeInTheDocument();
    expect(screen.getByText(CHIMAY.description)).toBeInTheDocument();
  });

  it("omits the family, the aromas and the formats when the beer has none", () => {
    stubQuery({ data: { ...CHIMAY, family: null, aromas: [], formats: [] } });

    renderDetail();

    expect(screen.getByText("Dubbel trappiste")).toBeInTheDocument();
    expect(screen.queryByText("Trappiste")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Arômes" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Formats" }),
    ).not.toBeInTheDocument();
  });

  it("shows the labels in English while the style name and the description stay French", async () => {
    await act(async () => {
      await i18n.changeLanguage("en");
    });

    renderDetail();

    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    ["Brewery", "Country", "Style", "Strength", "Description"].forEach(
      (label) => expect(screen.getByText(label)).toBeInTheDocument(),
    );
    expect(screen.getByRole("heading", { name: "Aromas" })).toBeInTheDocument();
    expect(screen.getByText("Belgium")).toBeInTheDocument();
    expect(screen.getByText("Trappist")).toBeInTheDocument();
    ["Fruity", "Caramel", "Spicy", "Malty", "Bottle"].forEach((label) =>
      expect(screen.getByText(label)).toBeInTheDocument(),
    );
    expect(screen.getByText("Dubbel trappiste")).toBeInTheDocument();
    expect(screen.getByText(CHIMAY.description)).toBeInTheDocument();
    expect(screen.queryByText("Retour")).not.toBeInTheDocument();
  });

  it("gives the Retour button a large ghost touch target", () => {
    renderDetail();

    expect(screen.getByRole("button", { name: "Retour" }).className).toContain(
      "button--ghost",
    );
    expect(screen.getByRole("button", { name: "Retour" }).className).toContain(
      "button--lg",
    );
  });

  it("goes back to the grid with its filters when the sheet was opened from it", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path={RoutePathEnum.ENCYCLOPEDIA} element={<GridWithLink />} />
        <Route path={RoutePathEnum.BEER_DETAIL} element={<BeerDetailPage />} />
      </Routes>,
      { initialPath: "/bieres?family=trappist" },
    );

    await user.click(screen.getByRole("link", { name: "open Chimay" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Chimay Rouge" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retour" }));

    expect(screen.getByLabelText("location")).toHaveTextContent(
      "?family=trappist",
    );
  });

  it("leads to the encyclopedia when the sheet was opened directly by its link", async () => {
    const user = userEvent.setup();
    renderDetail();

    await user.click(screen.getByRole("button", { name: "Retour" }));

    expect(screen.getByText("encyclopedia grid")).toBeInTheDocument();
    expect(screen.getByLabelText("pathname")).toHaveTextContent(/^\/bieres$/);
    expect(
      screen.queryByRole("heading", { level: 1, name: "Chimay Rouge" }),
    ).not.toBeInTheDocument();
  });

  it("shows a skeleton while the beer loads, with no title and no empty state", () => {
    stubQuery({ data: undefined, isPending: true });

    const { container } = renderDetail();

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not show the reviews section for an unknown beer", () => {
    stubQuery({ data: null });

    renderDetail("/bieres/99");

    expect(
      screen.getByRole("heading", { name: "Bière inconnue" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Avis" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Avis" }),
    ).not.toBeInTheDocument();
  });

  it("tells that the beer is unknown, with a link to the encyclopedia, for a null answer", () => {
    stubQuery({ data: null });

    const { container } = renderDetail("/bieres/99");

    expect(
      screen.getByRole("heading", { name: "Bière inconnue" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Cette bière n'est pas dans l'encyclopédie."),
    ).toBeInTheDocument();
    expect(container.querySelector('[data-slot="mascot"]')).toHaveAttribute(
      "data-mood",
      "confused",
    );
    expect(
      screen.getByRole("link", { name: "Retour à l'Encyclopédie" }),
    ).toHaveAttribute("href", "/bieres");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each(["abc", "0", "-1", "1.5", "12abc"])(
    "sends no request and tells the beer is unknown for the id %s",
    (rawId) => {
      stubQuery({ data: undefined, isPending: true });

      renderDetail(`/bieres/${rawId}`);

      expect(mockBeer.useBeerQuery).toHaveBeenCalledWith(null);
      expect(mockBeer.useBeerQuery).not.toHaveBeenCalledWith(
        expect.any(Number),
      );
      expect(
        screen.getByRole("heading", { name: "Bière inconnue" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Retour à l'Encyclopédie" }),
      ).toHaveAttribute("href", "/bieres");
    },
  );

  it("shows a danger alert with Réessayer on a server error and retries", async () => {
    const user = userEvent.setup();
    stubQuery({ data: undefined, isError: true });

    renderDetail();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Impossible de charger cette bière.");
    expect(
      screen.queryByRole("heading", { name: "Bière inconnue" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
  });

  it("shows a beer at 0 % as 0 %", () => {
    stubQuery({ data: { ...CHIMAY, abv: 0 } });

    renderDetail();

    expect(screen.getByText(/^0\s%$/)).toBeInTheDocument();
  });

  it("lets a 42-character name and brewery wrap instead of overflowing", () => {
    const longName = "Chimay-Rouge-Grande-Reserve-Brasserie-Abbaye";
    stubQuery({ data: { ...CHIMAY, name: longName, breweryName: longName } });

    renderDetail();

    expect(
      screen.getByRole("heading", { level: 1, name: longName }).className,
    ).toContain("break-words");
    const brewery = screen.getByText(longName, { selector: "dd" });
    expect(brewery.className).toContain("break-words");
    expect(brewery.parentElement?.className).toContain("min-w-0");
  });

  describe("where to drink", () => {
    it("mounts Où en boire at the end of the sheet for a known beer, asking for its venues", () => {
      renderDetail();

      expect(mockVenues.useBeerVenuesQuery).toHaveBeenCalledWith(CHIMAY.id);
      const history = screen.getByRole("heading", { name: "Mon historique" });
      const whereToDrink = screen.getByRole("heading", { name: "Où en boire" });
      expect(
        history.compareDocumentPosition(whereToDrink) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("lists three of the five venues of the beer with a link to the map on it", () => {
      mockVenues.useBeerVenuesQuery.mockReturnValue({
        venues: [1, 2, 3, 4, 5].map((venueId) => ({
          venueId,
          venueName: `Lieu ${venueId}`,
          venueType: "bar",
          city: "Paris",
          address: "1 rue de la Bière",
          latitude: 48.85,
          longitude: 2.35,
          status: "confirmed",
          lastConfirmedAt: null,
          recentVoterCount: 0,
          distanceKm: null,
        })),
        isPending: false,
        isError: false,
        refetch: vi.fn(),
      });

      renderDetail();

      ["Lieu 1", "Lieu 2", "Lieu 3"].forEach((name) =>
        expect(screen.getByText(name)).toBeInTheDocument(),
      );
      expect(screen.queryByText("Lieu 4")).not.toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Voir sur la carte" }),
      ).toHaveAttribute("href", "/carte?beer=1");
    });

    it("keeps the whole sheet intact and shows an alert in the section when the venues fail", () => {
      mockVenues.useBeerVenuesQuery.mockReturnValue({
        venues: [],
        isPending: false,
        isError: true,
        refetch: vi.fn(),
      });

      renderDetail();

      expect(
        screen.getByRole("heading", { level: 1, name: "Chimay Rouge" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Description" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Mon historique" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Impossible de charger les lieux.",
      );
    });

    it("does not ask for venues for an unknown beer", () => {
      stubQuery({ data: null });

      renderDetail();

      expect(mockVenues.useBeerVenuesQuery).not.toHaveBeenCalled();
      expect(
        screen.queryByRole("heading", { name: "Où en boire" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("reviews list", () => {
    const REVIEW = {
      id: 9,
      beerId: 1,
      authorId: 3,
      authorName: "Carol",
      authorAvatar: "hop",
      rating: 4,
      text: "Très belle trappiste",
      sweetness: null,
      acidity: null,
      body: null,
      createdAt: "2026-10-10T12:00:00.000Z",
      updatedAt: "2026-10-12T12:00:00.000Z",
      isMine: false,
    };

    it("asks for the reviews of the displayed beer and lists them under the summary", () => {
      mockReviews.useBeerReviewsQuery.mockReturnValue({
        mine: {
          ...REVIEW,
          id: 8,
          authorName: "Moi",
          text: "Mon texte",
          isMine: true,
        },
        reviews: [REVIEW],
        total: 1,
        isPending: false,
        isError: false,
        refetch: vi.fn(),
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      });

      renderDetail();

      expect(mockReviews.useBeerReviewsQuery).toHaveBeenCalledWith(CHIMAY.id);
      const section = screen.getByRole("region", { name: "Avis" });
      expect(within(section).getByText("Carol")).toBeInTheDocument();
      expect(
        within(section).getByText("Très belle trappiste"),
      ).toBeInTheDocument();
      expect(within(section).getByText("Mon avis")).toBeInTheDocument();
    });

    it("shows the empty reviews state when nobody reviewed the beer", () => {
      renderDetail();

      expect(
        screen.getByRole("heading", { name: "Aucun avis pour l'instant" }),
      ).toBeInTheDocument();
    });

    it("asks for no reviews for an unknown beer", () => {
      stubQuery({ data: null });

      renderDetail();

      expect(mockReviews.useBeerReviewsQuery).not.toHaveBeenCalled();
    });
  });

  describe("checkin history", () => {
    it("mounts Mon historique after the description for a known beer, asking for its checkins", () => {
      renderDetail();

      expect(mockHistory.useBeerCheckinsQuery).toHaveBeenCalledWith(CHIMAY.id);
      const description = screen.getByRole("heading", { name: "Description" });
      const history = screen.getByRole("heading", { name: "Mon historique" });
      expect(
        description.compareDocumentPosition(history) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("shows the tastings of the beer in the sheet", () => {
      mockHistory.useBeerCheckinsQuery.mockReturnValue({
        checkins: [
          {
            id: 1,
            beerId: 1,
            beerName: "Chimay Rouge",
            drankAt: "2026-10-12T12:00:00.000Z",
            place: "Chez Paul",
            rating: 4.5,
            aromas: [],
            format: null,
            price: null,
            comment: "",
            photoId: null,
          },
        ],
        total: 1,
        isPending: false,
        isError: false,
        refetch: vi.fn(),
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      });

      renderDetail();

      expect(screen.getByText("Chez Paul")).toBeInTheDocument();
      expect(screen.getByText("★ 4,5")).toBeInTheDocument();
    });

    it("is absent for an unknown beer", () => {
      stubQuery({ data: null });

      renderDetail();

      expect(
        screen.queryByRole("heading", { name: "Mon historique" }),
      ).not.toBeInTheDocument();
      expect(mockHistory.useBeerCheckinsQuery).not.toHaveBeenCalled();
    });

    it("is absent while the beer loads and when it fails to load", () => {
      stubQuery({ data: undefined, isPending: true });
      const { unmount } = renderDetail();
      expect(
        screen.queryByRole("heading", { name: "Mon historique" }),
      ).not.toBeInTheDocument();
      unmount();

      stubQuery({ data: undefined, isPending: false, isError: true });
      renderDetail();
      expect(
        screen.queryByRole("heading", { name: "Mon historique" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("wishlist toggle", () => {
    it("shows an unpressed To taste toggle under the title for a beer outside the wishlist", () => {
      renderDetail();

      const toggle = screen.getByRole("button", { name: "À goûter" });
      expect(toggle).toHaveAttribute("aria-pressed", "false");
      expect(toggle).toBeEnabled();
      expect(mockWishlist.useWishlistToggle).toHaveBeenCalledWith(1);
      const title = screen.getByRole("heading", {
        level: 1,
        name: "Chimay Rouge",
      });
      expect(
        title.compareDocumentPosition(toggle) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("asks to add the beer when pressed from the released state", async () => {
      const user = userEvent.setup();
      renderDetail();

      await user.click(screen.getByRole("button", { name: "À goûter" }));

      expect(mockWishlist.toggleWishlist).toHaveBeenCalledTimes(1);
      expect(mockWishlist.toggleWishlist).toHaveBeenCalledWith(true);
    });

    it("shows the toggle pressed for a beer in the wishlist and asks to remove it when pressed", async () => {
      stubQuery({ data: { ...CHIMAY, inWishlist: true } });
      const user = userEvent.setup();
      renderDetail();

      const toggle = screen.getByRole("button", { name: "À goûter" });
      expect(toggle).toHaveAttribute("aria-pressed", "true");

      await user.click(toggle);

      expect(mockWishlist.toggleWishlist).toHaveBeenCalledTimes(1);
      expect(mockWishlist.toggleWishlist).toHaveBeenCalledWith(false);
    });

    it("follows the beer of the query when inWishlist goes back to false after a failure", () => {
      stubQuery({ data: { ...CHIMAY, inWishlist: true } });
      const { rerender } = renderDetail();
      expect(screen.getByRole("button", { name: "À goûter" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      stubQuery({ data: { ...CHIMAY, inWishlist: false } });
      rerender(
        <Routes>
          <Route
            path={RoutePathEnum.BEER_DETAIL}
            element={<BeerDetailPage />}
          />
        </Routes>,
      );

      expect(screen.getByRole("button", { name: "À goûter" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });

    it("disables the toggle and sends nothing while a toggle is pending", async () => {
      mockWishlist.useWishlistToggle.mockReturnValue({
        toggleWishlist: mockWishlist.toggleWishlist,
        isPending: true,
      });
      const user = userEvent.setup();
      renderDetail();

      const toggle = screen.getByRole("button", { name: "À goûter" });
      expect(toggle).toBeDisabled();

      await user.click(toggle);

      expect(mockWishlist.toggleWishlist).not.toHaveBeenCalled();
    });

    it("labels the toggle To taste in English", async () => {
      await act(async () => {
        await i18n.changeLanguage("en");
      });

      renderDetail();

      expect(
        screen.getByRole("button", { name: "To taste" }),
      ).toBeInTheDocument();
    });

    it.each([
      ["an unknown beer id", { data: null }],
      ["a loading beer", { data: undefined, isPending: true }],
      ["a failed load", { data: undefined, isError: true }],
    ])("shows no toggle for %s", (_label, overrides) => {
      stubQuery(overrides);

      renderDetail();

      expect(
        screen.queryByRole("button", { name: "À goûter" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("checkin sheet", () => {
    it("puts the « Je l'ai bue » button in the actions row, before « À goûter »", () => {
      renderDetail();

      const open = screen.getByRole("button", { name: "Je l'ai bue" });
      const toggle = screen.getByRole("button", { name: "À goûter" });
      expect(open.parentElement).toBe(toggle.parentElement);
      expect(
        open.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("opens the sheet of this beer when the button is pressed", async () => {
      const user = userEvent.setup();
      renderDetail();

      await user.click(screen.getByRole("button", { name: "Je l'ai bue" }));

      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByRole("heading", {
          name: "Je l'ai bue : Chimay Rouge",
        }),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByRole("button", { name: "Enregistrer" }),
      ).toBeInTheDocument();
    });

    it("labels the button I drank it in English", async () => {
      await act(async () => {
        await i18n.changeLanguage("en");
      });

      renderDetail();

      expect(
        screen.getByRole("button", { name: "I drank it" }),
      ).toBeInTheDocument();
    });

    it.each([
      ["an unknown beer id", { data: null }],
      ["a loading beer", { data: undefined, isPending: true }],
      ["a failed load", { data: undefined, isError: true }],
    ])("shows no button for %s", (_label, overrides) => {
      stubQuery(overrides);

      renderDetail();

      expect(
        screen.queryByRole("button", { name: "Je l'ai bue" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("levels", () => {
    it("shows the bitterness and the colour right after the facts", () => {
      renderDetail();

      const facts = screen.getByText("Brasserie").closest("dl") as HTMLElement;
      const levels = screen.getByText("Amertume").closest("dl") as HTMLElement;
      expect(levels).not.toBe(facts);
      expect(
        facts.compareDocumentPosition(levels) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(facts.nextElementSibling).toBe(levels);
      expect(screen.getByText("Marquée · 4 / 5")).toBeInTheDocument();
      expect(within(levels).getByText("Ambrée")).toBeInTheDocument();
    });

    it("says Non renseignée for a beer without bitterness", () => {
      stubQuery({ data: { ...CHIMAY, bitternessLevel: null } });
      renderDetail();

      const levels = screen.getByText("Amertume").closest("dl") as HTMLElement;
      expect(within(levels).getByText("Non renseignée")).toBeInTheDocument();
      expect(within(levels).queryByText(/ \/ 5/)).not.toBeInTheDocument();
    });

    it("shows two swatches and the typical range of the style when the beer has no colour", () => {
      stubQuery({
        data: {
          ...CHIMAY,
          colorLevel: null,
          styleColorRange: { min: 3, max: 4 },
        },
      });
      renderDetail();

      const levels = screen.getByText("Couleur").closest("dl") as HTMLElement;
      expect(levels.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
      expect(
        within(levels).getByText("Ambrée à brune · typique du style"),
      ).toBeInTheDocument();
    });

    it("shows one swatch and Pâle · typique du style for a range of one level", () => {
      stubQuery({
        data: {
          ...CHIMAY,
          colorLevel: null,
          styleColorRange: { min: 1, max: 1 },
        },
      });
      renderDetail();

      const levels = screen.getByText("Couleur").closest("dl") as HTMLElement;
      expect(levels.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
      expect(
        within(levels).getByText("Pâle · typique du style"),
      ).toBeInTheDocument();
    });

    it("says Non renseignée twice when neither level nor range is known", () => {
      stubQuery({
        data: {
          ...CHIMAY,
          bitternessLevel: null,
          colorLevel: null,
          styleColorRange: null,
        },
      });
      renderDetail();

      const levels = screen.getByText("Amertume").closest("dl") as HTMLElement;
      expect(within(levels).getAllByText("Non renseignée")).toHaveLength(2);
    });

    it("keeps the words in English", async () => {
      await i18n.changeLanguage("en");
      stubQuery({
        data: {
          ...CHIMAY,
          colorLevel: null,
          styleColorRange: { min: 3, max: 4 },
        },
      });
      renderDetail();

      expect(screen.getByText("Pronounced · 4 / 5")).toBeInTheDocument();
      expect(
        screen.getByText("Amber to brown · typical of the style"),
      ).toBeInTheDocument();
    });

    it("does not show the levels while the beer is loading or unknown", () => {
      stubQuery({ data: undefined, isPending: true });
      const { unmount } = renderDetail();
      expect(screen.queryByText("Amertume")).not.toBeInTheDocument();
      unmount();

      stubQuery({ data: null, isPending: false });
      renderDetail();
      expect(screen.queryByText("Amertume")).not.toBeInTheDocument();
    });
  });

  describe("add to a collection", () => {
    it("shows an add to a collection button in the actions row, after the wishlist toggle", () => {
      renderDetail();

      const toggle = screen.getByRole("button", { name: "À goûter" });
      const open = screen.getByRole("button", {
        name: "Ajouter à une collection",
      });

      expect(
        toggle.compareDocumentPosition(open) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(toggle.parentElement).toBe(open.parentElement);
    });

    it("does not read the collections of the beer before the sheet is opened", () => {
      renderDetail();

      expect(mockMyCollections.useMyCollectionsQuery).toHaveBeenCalledWith(
        1,
        false,
      );
      expect(mockMembership.useCollectionMembershipToggle).toHaveBeenCalledWith(
        1,
      );
    });

    it("opens the sheet for this beer and toggles the membership of the checked collection", async () => {
      const user = userEvent.setup();
      renderDetail();

      await user.click(
        screen.getByRole("button", { name: "Ajouter à une collection" }),
      );
      await user.click(
        await screen.findByRole("checkbox", { name: "Trappistes" }),
      );

      expect(mockMyCollections.useMyCollectionsQuery).toHaveBeenLastCalledWith(
        1,
        true,
      );
      expect(screen.getByRole("checkbox", { name: "À goûter" })).toBeChecked();
      expect(mockMembership.toggleMembership).toHaveBeenCalledTimes(1);
      expect(mockMembership.toggleMembership).toHaveBeenCalledWith(
        expect.objectContaining({ id: 5, name: "Trappistes" }),
        true,
      );
    });

    it("is not shown for an unknown beer", () => {
      stubQuery({ data: null });
      renderDetail();

      expect(
        screen.queryByRole("button", { name: "Ajouter à une collection" }),
      ).not.toBeInTheDocument();
    });
  });
});
