import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CollectionsSection } from "@/components/widgets/collectionsSection/collectionsSection";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { CollectionKindEnum } from "@/types/enums/collection/collectionKindEnum";
import type { CollectionSummary } from "@/types/models/collection/collectionSummary";
import i18n from "@/i18n/i18n";

const onRetry = vi.fn();

const WISHLIST: CollectionSummary = { id: null, kind: CollectionKindEnum.WISHLIST, name: "", beerCount: 2 };
const TRAPPISTES: CollectionSummary = { id: 5, kind: CollectionKindEnum.CUSTOM, name: "Trappistes", beerCount: 1 };

type Overrides = Partial<{
  userId: number;
  collections: CollectionSummary[];
  isPending: boolean;
  isError: boolean;
  ownerName: string;
}>;

const renderSection = (overrides: Overrides = {}) => {
  const props = { userId: 1, collections: [WISHLIST, TRAPPISTES], isPending: false, isError: false, onRetry, ...overrides };
  return renderWithProviders(<CollectionsSection {...props} />);
};

describe("CollectionsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("renders the title and one row per collection in the order received, with its count and its link", async () => {
    renderSection();

    expect(screen.getByRole("heading", { level: 2, name: "Mes collections" })).toBeInTheDocument();
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    const [first, second] = rows;
    expect(within(first).getByRole("link", { name: "À goûter" })).toHaveAttribute("href", "/profils/1/wishlist");
    expect(first).toHaveTextContent("2 bières");
    expect(within(second).getByRole("link", { name: "Trappistes" })).toHaveAttribute("href", "/profils/1/collections/5");
    expect(second).toHaveTextContent("1 bière");
    expect(second).not.toHaveTextContent("1 bières");
  });

  it("titles the section with the name of the owner when it is given, in the language of the app", async () => {
    renderSection({ ownerName: "Bob" });

    expect(screen.getByRole("heading", { level: 2, name: "Collections de Bob" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Mes collections" })).not.toBeInTheDocument();

    await i18n.changeLanguage("en");

    expect(screen.getByRole("heading", { level: 2, name: "Bob's collections" })).toBeInTheDocument();
  });

  it("builds the links from the owner of the collections", async () => {
    renderSection({ userId: 2 });

    expect(screen.getByRole("link", { name: "À goûter" })).toHaveAttribute("href", "/profils/2/wishlist");
    expect(screen.getByRole("link", { name: "Trappistes" })).toHaveAttribute("href", "/profils/2/collections/5");
  });

  it("translates the wishlist name and keeps the name of the others as received", async () => {
    await i18n.changeLanguage("en");
    renderSection({ collections: [WISHLIST, { ...TRAPPISTES, name: "Mes IPA" }] });

    expect(screen.getByRole("heading", { level: 2, name: "My collections" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "To taste" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mes IPA" })).toBeInTheDocument();
    const [first, second] = screen.getAllByRole("listitem");
    expect(within(first).getByText("2 beers")).toBeInTheDocument();
    expect(within(second).getByText("1 beer")).toBeInTheDocument();
    expect(second).not.toHaveTextContent("1 beers");
  });

  it("shows a zero count for an empty collection", async () => {
    renderSection({ collections: [{ ...TRAPPISTES, beerCount: 0 }] });

    const row = screen.getByRole("listitem");
    expect(within(row).getByText("0 bière")).toBeInTheDocument();
    expect(row).not.toHaveTextContent("0 bières");
  });

  it("shows skeletons and no list while the collections load", async () => {
    renderSection({ collections: [], isPending: true });

    expect(screen.getAllByTestId("collections-skeleton")).toHaveLength(3);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an alert with a retry button on error and reads again on press", async () => {
    renderSection({ collections: [], isError: true });

    expect(screen.getByRole("alert")).toHaveTextContent("Collections indisponibles.");
    expect(screen.queryByTestId("collections-skeleton")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Réessayer" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows the empty state when there is no collection", async () => {
    renderSection({ collections: [] });

    expect(screen.getByText("Aucune collection pour l'instant")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
