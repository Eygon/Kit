import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "@/i18n/i18n";
import { WishlistSection } from "@/pages/profile/components/widgets/wishlistSection/wishlistSection";
import type { WishlistItem } from "@/types/models/wishlist/wishlistItem";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const LONG_NAME = "Brasserie-Artisanale-du-Mont-Blanc-Triple-Reserve-Speciale-Edition-Limitee-2026";

const ITEMS: WishlistItem[] = [
  { beerId: 7, beerName: "Orval", addedAt: "2026-10-12T12:00:00.000Z" },
  { beerId: 9, beerName: LONG_NAME, addedAt: "2026-10-11T08:00:00.000Z" },
];

const renderSection = (props: Record<string, unknown> = {}) => {
  const handlers = { onRetry: vi.fn(), onRemove: vi.fn() };
  const { container } = renderWithProviders(
    <WishlistSection items={ITEMS} isPending={false} isError={false} pendingBeerId={null} {...handlers} {...props} />,
  );
  return { ...handlers, container };
};

describe("WishlistSection", () => {
  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("renders a heading and one row per beer with a link to its page", async () => {
    renderSection();

    expect(screen.getByRole("heading", { level: 2, name: "À goûter" })).toBeInTheDocument();
    const rows = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByRole("link", { name: "Orval" })).toHaveAttribute("href", "/bieres/7");
    expect(within(rows[1]).getByRole("link", { name: LONG_NAME })).toHaveAttribute("href", "/bieres/9");
  });

  it("names every remove button with its beer and reports the beer id on press", async () => {
    const { onRemove } = renderSection();
    const user = userEvent.setup();

    expect(screen.getAllByRole("button")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Retirer Orval des envies" }));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(7);
    expect(screen.getByRole("button", { name: `Retirer ${LONG_NAME} des envies` })).toHaveTextContent("Retirer");
  });

  it("names the remove buttons in english", async () => {
    await i18n.changeLanguage("en");
    renderSection();

    expect(screen.getByRole("heading", { level: 2, name: "To taste" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Orval from the wishlist" })).toHaveTextContent("Remove");
  });

  it("wraps a very long name and keeps the touch targets at 44px minimum", async () => {
    renderSection();

    const link = screen.getByRole("link", { name: LONG_NAME });
    expect(link).toHaveClass("break-words", "min-h-11");
    expect(link.closest("li")).toHaveClass("min-w-0");
    const button = screen.getByRole("button", { name: `Retirer ${LONG_NAME} des envies` });
    expect(button).toHaveClass("shrink-0");
    expect(button.className).toContain("button--lg");
  });

  it("shows only the pending beer as busy and presses nothing on it", async () => {
    const { onRemove } = renderSection({ pendingBeerId: 7 });
    const user = userEvent.setup();

    const pending = screen.getByRole("button", { name: "Retirer Orval des envies" });
    expect(pending).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: `Retirer ${LONG_NAME} des envies` })).not.toHaveAttribute("aria-disabled", "true");
    await user.click(pending);
    expect(onRemove).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: `Retirer ${LONG_NAME} des envies` }));
    expect(onRemove).toHaveBeenCalledWith(9);
  });

  it("shows three row skeletons while loading, with no list", async () => {
    renderSection({ items: [], isPending: true });

    expect(screen.getAllByTestId("wishlist-skeleton")).toHaveLength(3);
    expect(screen.getByRole("heading", { level: 2, name: "À goûter" })).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows the mascot empty state inviting to add beers when the wishlist is empty", async () => {
    const { container } = renderSection({ items: [] });

    expect(container.querySelector('[data-slot="mascot"][data-mood="searching"]')).not.toBeNull();

    expect(screen.getByRole("heading", { level: 2, name: "Aucune envie pour l'instant" })).toBeInTheDocument();
    expect(screen.getByText("Ajoutez des bières « À goûter » depuis l'Encyclopédie.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an alert with a retry button on a read error and reads again on press", async () => {
    const { onRetry } = renderSection({ items: [], isError: true });

    expect(screen.getByRole("alert")).toHaveTextContent("Liste d'envies indisponible.");
    expect(screen.queryByRole("heading", { name: "Aucune envie pour l'instant" })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Réessayer" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
