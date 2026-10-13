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
import { RoutePathEnum, buildBeerDetailPath } from "@/types/enums/routing/routePathEnum";
import type { Beer } from "@/types/models/beer/beer";

const mockBeer = vi.hoisted(() => ({ useBeerQuery: vi.fn() }));

vi.mock("@/pages/beerDetail/hooks/useBeerQuery", () => mockBeer);

const mockWishlist = vi.hoisted(() => ({ useWishlistToggle: vi.fn(), toggleWishlist: vi.fn() }));

vi.mock("@/pages/beerDetail/hooks/useWishlistToggle", () => ({ useWishlistToggle: mockWishlist.useWishlistToggle }));

const mockHistory = vi.hoisted(() => ({ useBeerCheckinsQuery: vi.fn() }));

vi.mock("@/pages/beerDetail/hooks/useBeerCheckinsQuery", () => mockHistory);

const CHIMAY: Beer = {
  id: 1,
  name: "Chimay Rouge",
  breweryName: "Bières de Chimay",
  country: "BE",
  styleId: 4,
  styleName: "Dubbel trappiste",
  family: BeerFamilyEnum.TRAPPIST,
  abv: 7,
  aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.CARAMEL, BeerAromaEnum.SPICY, BeerAromaEnum.MALTY],
  formats: [BeerFormatEnum.BOTTLE],
  description: "Une trappiste cuivrée aux notes de fruits mûrs.",
  drunk: false,
  checkinCount: 0,
  inWishlist: false,
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

const PathnameProbe = () => <output aria-label="pathname">{useLocation().pathname}</output>;

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
    mockWishlist.useWishlistToggle.mockReturnValue({ toggleWishlist: mockWishlist.toggleWishlist, isPending: false });
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

  it("asks for the beer of the id in the url", () => {
    renderDetail("/bieres/42");

    expect(mockBeer.useBeerQuery).toHaveBeenCalledWith(42);
  });

  it("shows the whole sheet of Chimay Rouge in French", () => {
    renderDetail();

    expect(screen.getByRole("heading", { level: 1, name: "Chimay Rouge" })).toBeInTheDocument();
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
    ["Fruité", "Caramel", "Épicé", "Malté"].forEach((aroma) => expect(screen.getByText(aroma)).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Formats" })).toBeInTheDocument();
    expect(screen.getByText("Bouteille")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Description" })).toBeInTheDocument();
    expect(screen.getByText(CHIMAY.description)).toBeInTheDocument();
  });

  it("omits the family, the aromas and the formats when the beer has none", () => {
    stubQuery({ data: { ...CHIMAY, family: null, aromas: [], formats: [] } });

    renderDetail();

    expect(screen.getByText("Dubbel trappiste")).toBeInTheDocument();
    expect(screen.queryByText("Trappiste")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Arômes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Formats" })).not.toBeInTheDocument();
  });

  it("shows the labels in English while the style name and the description stay French", async () => {
    await act(async () => {
      await i18n.changeLanguage("en");
    });

    renderDetail();

    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    ["Brewery", "Country", "Style", "Strength", "Description"].forEach((label) =>
      expect(screen.getByText(label)).toBeInTheDocument(),
    );
    expect(screen.getByRole("heading", { name: "Aromas" })).toBeInTheDocument();
    expect(screen.getByText("Belgium")).toBeInTheDocument();
    expect(screen.getByText("Trappist")).toBeInTheDocument();
    ["Fruity", "Caramel", "Spicy", "Malty", "Bottle"].forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
    expect(screen.getByText("Dubbel trappiste")).toBeInTheDocument();
    expect(screen.getByText(CHIMAY.description)).toBeInTheDocument();
    expect(screen.queryByText("Retour")).not.toBeInTheDocument();
  });

  it("gives the Retour button a large ghost touch target", () => {
    renderDetail();

    expect(screen.getByRole("button", { name: "Retour" }).className).toContain("button--ghost");
    expect(screen.getByRole("button", { name: "Retour" }).className).toContain("button--lg");
  });

  it("goes back to the grid with its filters when the sheet was opened from it", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path={RoutePathEnum.ENCYCLOPEDIA} element={<GridWithLink />} />
        <Route path={RoutePathEnum.BEER_DETAIL} element={<BeerDetailPage />} />
      </Routes>,
      { initialPath: "/?family=trappist" },
    );

    await user.click(screen.getByRole("link", { name: "open Chimay" }));
    expect(screen.getByRole("heading", { level: 1, name: "Chimay Rouge" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retour" }));

    expect(screen.getByLabelText("location")).toHaveTextContent("?family=trappist");
  });

  it("leads to the encyclopedia when the sheet was opened directly by its link", async () => {
    const user = userEvent.setup();
    renderDetail();

    await user.click(screen.getByRole("button", { name: "Retour" }));

    expect(screen.getByText("encyclopedia grid")).toBeInTheDocument();
    expect(screen.getByLabelText("pathname")).toHaveTextContent(/^\/$/);
    expect(screen.queryByRole("heading", { level: 1, name: "Chimay Rouge" })).not.toBeInTheDocument();
  });

  it("shows a skeleton while the beer loads, with no title and no empty state", () => {
    stubQuery({ data: undefined, isPending: true });

    const { container } = renderDetail();

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("tells that the beer is unknown, with a link to the encyclopedia, for a null answer", () => {
    stubQuery({ data: null });

    const { container } = renderDetail("/bieres/99");

    expect(screen.getByRole("heading", { name: "Bière inconnue" })).toBeInTheDocument();
    expect(screen.getByText("Cette bière n'est pas dans l'encyclopédie.")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="mascot"]')).toHaveAttribute("data-mood", "confused");
    expect(screen.getByRole("link", { name: "Retour à l'Encyclopédie" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each(["abc", "0", "-1", "1.5", "12abc"])("sends no request and tells the beer is unknown for the id %s", (rawId) => {
    stubQuery({ data: undefined, isPending: true });

    renderDetail(`/bieres/${rawId}`);

    expect(mockBeer.useBeerQuery).toHaveBeenCalledWith(null);
    expect(mockBeer.useBeerQuery).not.toHaveBeenCalledWith(expect.any(Number));
    expect(screen.getByRole("heading", { name: "Bière inconnue" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à l'Encyclopédie" })).toHaveAttribute("href", "/");
  });

  it("shows a danger alert with Réessayer on a server error and retries", async () => {
    const user = userEvent.setup();
    stubQuery({ data: undefined, isError: true });

    renderDetail();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Impossible de charger cette bière.");
    expect(screen.queryByRole("heading", { name: "Bière inconnue" })).not.toBeInTheDocument();
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

    expect(screen.getByRole("heading", { level: 1, name: longName }).className).toContain("break-words");
    const brewery = screen.getByText(longName, { selector: "dd" });
    expect(brewery.className).toContain("break-words");
    expect(brewery.parentElement?.className).toContain("min-w-0");
  });

  describe("checkin history", () => {
    it("mounts Mon historique after the description for a known beer, asking for its checkins", () => {
      renderDetail();

      expect(mockHistory.useBeerCheckinsQuery).toHaveBeenCalledWith(CHIMAY.id);
      const description = screen.getByRole("heading", { name: "Description" });
      const history = screen.getByRole("heading", { name: "Mon historique" });
      expect(description.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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

      expect(screen.queryByRole("heading", { name: "Mon historique" })).not.toBeInTheDocument();
      expect(mockHistory.useBeerCheckinsQuery).not.toHaveBeenCalled();
    });

    it("is absent while the beer loads and when it fails to load", () => {
      stubQuery({ data: undefined, isPending: true });
      const { unmount } = renderDetail();
      expect(screen.queryByRole("heading", { name: "Mon historique" })).not.toBeInTheDocument();
      unmount();

      stubQuery({ data: undefined, isPending: false, isError: true });
      renderDetail();
      expect(screen.queryByRole("heading", { name: "Mon historique" })).not.toBeInTheDocument();
    });
  });

  describe("wishlist toggle", () => {
    it("shows an unpressed To taste toggle under the title for a beer outside the wishlist", () => {
      renderDetail();

      const toggle = screen.getByRole("button", { name: "À goûter" });
      expect(toggle).toHaveAttribute("aria-pressed", "false");
      expect(toggle).toBeEnabled();
      expect(mockWishlist.useWishlistToggle).toHaveBeenCalledWith(1);
      const title = screen.getByRole("heading", { level: 1, name: "Chimay Rouge" });
      expect(title.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
      expect(screen.getByRole("button", { name: "À goûter" })).toHaveAttribute("aria-pressed", "true");

      stubQuery({ data: { ...CHIMAY, inWishlist: false } });
      rerender(
        <Routes>
          <Route path={RoutePathEnum.BEER_DETAIL} element={<BeerDetailPage />} />
        </Routes>,
      );

      expect(screen.getByRole("button", { name: "À goûter" })).toHaveAttribute("aria-pressed", "false");
    });

    it("disables the toggle and sends nothing while a toggle is pending", async () => {
      mockWishlist.useWishlistToggle.mockReturnValue({ toggleWishlist: mockWishlist.toggleWishlist, isPending: true });
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

      expect(screen.getByRole("button", { name: "To taste" })).toBeInTheDocument();
    });

    it.each([
      ["an unknown beer id", { data: null }],
      ["a loading beer", { data: undefined, isPending: true }],
      ["a failed load", { data: undefined, isError: true }],
    ])("shows no toggle for %s", (_label, overrides) => {
      stubQuery(overrides);

      renderDetail();

      expect(screen.queryByRole("button", { name: "À goûter" })).not.toBeInTheDocument();
    });
  });

  describe("checkin sheet", () => {
    it("puts the « Je l'ai bue » button in the actions row, before « À goûter »", () => {
      renderDetail();

      const open = screen.getByRole("button", { name: "Je l'ai bue" });
      const toggle = screen.getByRole("button", { name: "À goûter" });
      expect(open.parentElement).toBe(toggle.parentElement);
      expect(open.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("opens the sheet of this beer when the button is pressed", async () => {
      const user = userEvent.setup();
      renderDetail();

      await user.click(screen.getByRole("button", { name: "Je l'ai bue" }));

      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByRole("heading", { name: "Je l'ai bue : Chimay Rouge" })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "Enregistrer" })).toBeInTheDocument();
    });

    it("labels the button I drank it in English", async () => {
      await act(async () => {
        await i18n.changeLanguage("en");
      });

      renderDetail();

      expect(screen.getByRole("button", { name: "I drank it" })).toBeInTheDocument();
    });

    it.each([
      ["an unknown beer id", { data: null }],
      ["a loading beer", { data: undefined, isPending: true }],
      ["a failed load", { data: undefined, isError: true }],
    ])("shows no button for %s", (_label, overrides) => {
      stubQuery(overrides);

      renderDetail();

      expect(screen.queryByRole("button", { name: "Je l'ai bue" })).not.toBeInTheDocument();
    });
  });
});
