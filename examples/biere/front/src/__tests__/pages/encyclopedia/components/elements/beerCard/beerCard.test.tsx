import { screen } from "@testing-library/react";
import { BeerCard } from "@/pages/encyclopedia/components/elements/beerCard/beerCard";
import i18n from "@/i18n/i18n";
import type { Beer } from "@/types/models/beer/beer";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { blendOver, contrastRatio } from "@/__tests__/utils/color/contrast";
import { resolveThemeColor } from "@/__tests__/utils/color/resolveThemeColor";

const BEER: Beer = {
  id: 12,
  name: "Orval",
  breweryName: "Brasserie d'Orval",
  country: "BE",
  styleId: 3,
  styleName: "Belgian Pale Ale",
  family: null,
  abv: 11.3,
  aromas: [],
  formats: [],
  description: "",
  drunk: false,
  checkinCount: 0,
  inWishlist: false,
  bitternessLevel: null,
  colorLevel: null,
  styleColorRange: null,
  averageRating: null,
  reviewCount: 0,
  ratingDistribution: [],
  criteria: [],
};

const DRUNK_BEER: Beer = { ...BEER, drunk: true, checkinCount: 2 };
const FIRST_CHECKIN = "2026-10-12T12:00:00.000Z";

const renderCard = (beer: Beer = BEER, discoveredAt: string | null = null) =>
  renderWithProviders(<BeerCard beer={beer} discoveredAt={discoveredAt} />);

describe("BeerCard", () => {
  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("shows the name, brewery, style, degree and country in French", () => {
    renderCard();

    expect(screen.getByText("Orval")).toBeInTheDocument();
    expect(screen.getByText("Brasserie d'Orval")).toBeInTheDocument();
    expect(screen.getByText("Belgian Pale Ale")).toBeInTheDocument();
    expect(screen.getByText(/^11,3\s%$/)).toBeInTheDocument();
    expect(screen.getByText("Belgique")).toBeInTheDocument();
  });

  it("shows the country in English when the language is English", async () => {
    await i18n.changeLanguage("en");
    renderCard();

    expect(screen.getByText("Belgium")).toBeInTheDocument();
    expect(screen.getByText(/^11\.3\s%$/)).toBeInTheDocument();
  });

  it("is a real link to the beer sheet", () => {
    renderCard();

    expect(screen.getByRole("link", { name: /Orval/ })).toHaveAttribute("href", "/bieres/12");
  });

  it("keeps a touch target of at least 44px", () => {
    renderCard();

    expect(screen.getByRole("link", { name: /Orval/ }).className).toContain("min-h-11");
  });

  it("fills the height of its grid cell so the cards of a row are as tall as each other", () => {
    renderCard();

    expect(screen.getByRole("link", { name: /Orval/ }).className).toContain("h-full");
  });

  it("lets a long name wrap and truncates the other lines inside a shrinkable parent", async () => {
    const longName = "Brasserie-Artisanale-du-Mont-Blanc-Triple-Reserve-Speciale".repeat(2);
    renderCard({ ...BEER, name: longName, breweryName: longName, styleName: longName });

    const title = screen.getByRole("heading", { name: longName });
    expect(title.className).toContain("font-display");
    expect(title.className).toContain("break-words");
    expect(title.className).not.toContain("truncate");
    const brewery = screen.getAllByText(longName).find((node) => node !== title);
    expect(brewery?.className).toContain("truncate");
    expect(screen.getByRole("link").className).toContain("min-w-0");
  });

  it("renders the beer name as a level 2 heading under the page title without changing its look", () => {
    renderCard();

    const title = screen.getByRole("heading", { level: 2, name: "Orval" });
    expect(title.tagName).toBe("H2");
    expect(title.className).toContain("font-display");
    expect(title.className).toContain("text-xl");
  });

  it("keeps the secondary text of a not tasted card at 4.5:1 once the card is dimmed", () => {
    renderCard();

    const opacity = Number(/opacity-(\d+)/.exec(screen.getByRole("link").className)?.[1]) / 100;
    const paper = resolveThemeColor("var(--mousse-paper)");
    const dimmedMuted = blendOver(resolveThemeColor("var(--muted)"), opacity, paper);
    const dimmedCream = blendOver(resolveThemeColor("var(--mousse-cream)"), opacity, paper);

    expect(opacity).toBeGreaterThan(0);
    expect(contrastRatio(dimmedMuted, dimmedCream)).toBeGreaterThanOrEqual(4.5);
  });

  it("AC1 greys out a beer that was not drunk and shows ??? announced as not tasted yet", () => {
    renderCard();

    const label = screen.getByText("???");
    expect(label).toHaveAttribute("aria-hidden", "true");
    expect(label.className).toContain("font-display");
    expect(label.parentElement?.className).toContain("bg-default");
    expect(screen.getByText("Pas encore goûtée").className).toContain("sr-only");
    expect(screen.getByRole("link", { name: /Pas encore goûtée/ }).className).toContain("opacity-85");
  });

  it("AC1 keeps the name and the brewery readable and the link to the sheet on a beer not drunk", () => {
    renderCard();

    expect(screen.getByRole("heading", { name: "Orval" })).toBeInTheDocument();
    expect(screen.getByText("Brasserie d'Orval")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Orval/ })).toHaveAttribute("href", "/bieres/12");
    expect(screen.getByRole("link", { name: /Orval/ }).className).toContain("h-full");
    expect(screen.queryByText(/^Bue/)).not.toBeInTheDocument();
  });

  it("AC1 ignores a date given for a beer that was not drunk", () => {
    renderCard(BEER, FIRST_CHECKIN);

    expect(screen.getByText("???")).toBeInTheDocument();
    expect(screen.queryByText(/Bue le/)).not.toBeInTheDocument();
  });

  it("AC2 stamps a drunk beer with the date of its first tasting, slightly tilted, and removes the grey", () => {
    renderCard(DRUNK_BEER, FIRST_CHECKIN);

    const stamp = screen.getByText("Bue le 12/10/2026");
    expect(stamp.closest("[class*='-rotate-']")).not.toBeNull();
    expect(screen.queryByText("???")).not.toBeInTheDocument();
    expect(screen.queryByText("Pas encore goûtée")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Orval/ }).className).not.toContain("opacity-85");
    expect(screen.getByRole("heading", { name: "Orval" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Orval/ })).toHaveAttribute("href", "/bieres/12");
  });

  it("AC2 writes the stamp date in the English format when the language is English", async () => {
    await i18n.changeLanguage("en");
    renderCard(DRUNK_BEER, FIRST_CHECKIN);

    expect(screen.getByText("Tasted on 10/12/26")).toBeInTheDocument();
  });

  it("AC3 says Bue without a date while the progress is not loaded", () => {
    renderCard(DRUNK_BEER, null);

    expect(screen.getByText("Bue")).toBeInTheDocument();
    expect(screen.queryByText(/Bue le/)).not.toBeInTheDocument();
    expect(screen.queryByText("???")).not.toBeInTheDocument();
  });

  it("AC3 says Tasted without a date in English", async () => {
    await i18n.changeLanguage("en");
    renderCard(DRUNK_BEER, null);

    expect(screen.getByText("Tasted")).toBeInTheDocument();
  });

  it("US9 AC1 shows the average and the count on the card, with the spoken sentence", () => {
    renderCard({ ...BEER, averageRating: 4.2, reviewCount: 18 });

    expect(screen.getByText("4,2 (18)")).toBeInTheDocument();
    expect(screen.getByText("Note moyenne 4,2 sur 5, 18 avis")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Note moyenne 4,2 sur 5, 18 avis/ })).toHaveAttribute("href", "/bieres/12");
  });

  it("US9 AC1 shows the average with a decimal point in English", async () => {
    await i18n.changeLanguage("en");
    renderCard({ ...BEER, averageRating: 4.2, reviewCount: 18 });

    expect(screen.getByText("4.2 (18)")).toBeInTheDocument();
  });

  it("US9 AC2 shows one decimal for a whole average", () => {
    renderCard({ ...BEER, averageRating: 4, reviewCount: 7 });

    expect(screen.getByText("4,0 (7)")).toBeInTheDocument();
  });

  it("US9 AC3 shows a muted No reviews text for a beer without review", () => {
    renderCard();

    expect(screen.getByText("Aucun avis")).toHaveClass("text-muted");
    expect(screen.queryByText(/Note moyenne/)).not.toBeInTheDocument();
  });

  it("US9 AC4 keeps the rating inside the card content, after the country, without letting it overflow", () => {
    renderCard({ ...BEER, averageRating: 4.2, reviewCount: 18 });

    const country = screen.getByText("Belgique");
    const rating = screen.getByText("4,2 (18)");
    const content = country.parentElement as HTMLElement;
    expect(content.contains(rating)).toBe(true);
    expect(content.lastElementChild?.contains(rating)).toBe(true);
    expect(screen.getByRole("link", { name: /Orval/ }).className).toContain("h-full");
    expect(content.className).toContain("min-w-0");
    expect(rating).toHaveClass("truncate");
    expect(rating.parentElement).toHaveClass("min-w-0");
  });
});
