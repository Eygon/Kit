import { screen } from "@testing-library/react";
import { BeerCard } from "@/pages/encyclopedia/components/elements/beerCard/beerCard";
import i18n from "@/i18n/i18n";
import type { Beer } from "@/types/models/beer/beer";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

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

  it("AC1 greys out a beer that was not drunk and shows ??? announced as not tasted yet", () => {
    renderCard();

    const label = screen.getByText("???");
    expect(label).toHaveAttribute("aria-hidden", "true");
    expect(label.className).toContain("font-display");
    expect(label.parentElement?.className).toContain("bg-default");
    expect(screen.getByText("Pas encore goûtée").className).toContain("sr-only");
    expect(screen.getByRole("link", { name: /Pas encore goûtée/ }).className).toContain("opacity-70");
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
    expect(screen.getByRole("link", { name: /Orval/ }).className).not.toContain("opacity-70");
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
});
