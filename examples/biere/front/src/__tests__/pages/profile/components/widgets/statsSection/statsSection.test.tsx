import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "@/i18n/i18n";
import { StatsSection } from "@/pages/profile/components/widgets/statsSection/statsSection";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import type { Stats } from "@/types/models/stats/stats";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const STATS: Stats = {
  checkinCount: 14,
  discoveredCount: 9,
  averageAbv: 6.5,
  countries: [
    { country: "BE", count: 5 },
    { country: "FR", count: 4 },
  ],
  favoriteFamily: BeerFamilyEnum.IPA,
  averageRating: 4.5,
  currentStreak: 1,
  bestStreak: 6,
  monthlyCheckins: [],
};

const EMPTY_STATS: Stats = {
  checkinCount: 0,
  discoveredCount: 0,
  averageAbv: null,
  countries: [],
  favoriteFamily: null,
  averageRating: null,
  currentStreak: 0,
  bestStreak: 0,
  monthlyCheckins: [],
};

const onRetry = vi.fn();

const renderSection = (props: { stats?: Stats | null; isPending?: boolean; isError?: boolean } = {}) =>
  renderWithProviders(
    <StatsSection
      stats={props.stats === undefined ? STATS : props.stats}
      isPending={props.isPending ?? false}
      isError={props.isError ?? false}
      onRetry={onRetry}
    />,
  );

const valueOf = (label: string) => {
  const term = screen.getByText(label, { selector: "dt" });
  return term.nextElementSibling as HTMLElement;
};

describe("StatsSection", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("fr");
  });

  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("shows a heading and every value next to its label in french with decimals in french format", () => {
    renderSection();

    expect(screen.getByRole("heading", { level: 2, name: "Statistiques" })).toBeInTheDocument();
    expect(valueOf("Dégustations")).toHaveTextContent("14");
    expect(valueOf("Bières découvertes")).toHaveTextContent("9");
    expect(valueOf("Degré moyen").textContent?.replace(/\s/g, " ")).toBe("6,5 %");
    expect(valueOf("Note moyenne")).toHaveTextContent("4,5 / 5");
    expect(valueOf("Famille préférée")).toHaveTextContent("IPA");
    expect(valueOf("Série en cours")).toHaveTextContent("1 jour");
    expect(valueOf("Meilleure série")).toHaveTextContent("6 jours");
  });

  it("shows the same values in english with decimals in english format and translated family and countries", async () => {
    await i18n.changeLanguage("en");
    renderSection({ stats: { ...STATS, favoriteFamily: BeerFamilyEnum.WITBIER } });

    expect(screen.getByRole("heading", { level: 2, name: "Statistics" })).toBeInTheDocument();
    expect(valueOf("Tastings")).toHaveTextContent("14");
    expect(valueOf("Beers discovered")).toHaveTextContent("9");
    expect(valueOf("Average strength").textContent?.replace(/\s/g, " ")).toBe("6.5 %");
    expect(valueOf("Average rating")).toHaveTextContent("4.5 / 5");
    expect(valueOf("Favourite family")).toHaveTextContent("Witbier");
    expect(valueOf("Current streak")).toHaveTextContent("1 day");
    expect(valueOf("Best streak")).toHaveTextContent("6 days");
    expect(screen.getByText("Countries tasted")).toBeInTheDocument();
    expect(screen.getByText("Belgium · 5")).toBeInTheDocument();
    expect(screen.getByText("France · 4")).toBeInTheDocument();
  });

  it("translates the favourite family and the countries to french", () => {
    renderSection({ stats: { ...STATS, favoriteFamily: BeerFamilyEnum.WITBIER } });

    expect(valueOf("Famille préférée")).toHaveTextContent("Blanche");
    expect(screen.getByText("Pays goûtés")).toBeInTheDocument();
    expect(screen.getByText("Belgique · 5")).toBeInTheDocument();
    expect(screen.getByText("France · 4")).toBeInTheDocument();
  });

  it("rounds a long average rating to one decimal", () => {
    renderSection({ stats: { ...STATS, averageRating: 3.46 } });

    expect(valueOf("Note moyenne")).toHaveTextContent("3,5 / 5");
  });

  it("keeps the counters and streaks at 0 and shows a dash for every missing value without any tasting", () => {
    renderSection({ stats: EMPTY_STATS });

    expect(valueOf("Dégustations")).toHaveTextContent("0");
    expect(valueOf("Bières découvertes")).toHaveTextContent("0");
    expect(valueOf("Série en cours")).toHaveTextContent("0 jour");
    expect(valueOf("Meilleure série")).toHaveTextContent("0 jour");
    expect(valueOf("Degré moyen")).toHaveTextContent("—");
    expect(valueOf("Note moyenne")).toHaveTextContent("—");
    expect(valueOf("Famille préférée")).toHaveTextContent("—");
    const countries = screen.getByText("Pays goûtés").parentElement as HTMLElement;
    expect(within(countries).getByText("—")).toBeInTheDocument();
    expect(within(countries).queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows 7 tile skeletons and no value while loading", () => {
    renderSection({ stats: null, isPending: true });

    expect(screen.getAllByTestId("stats-skeleton")).toHaveLength(7);
    expect(screen.queryByText("Dégustations")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an alert with a retry button that reads the stats again on error", async () => {
    renderSection({ stats: null, isError: true });

    expect(screen.getByRole("alert")).toHaveTextContent("Statistiques indisponibles.");
    expect(screen.getByRole("alert").className).toContain("alert--danger");
    expect(screen.queryByText("Dégustations")).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Réessayer" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows the alert when there are no stats without a reported error", () => {
    renderSection({ stats: null });

    expect(screen.getByRole("alert")).toHaveTextContent("Statistiques indisponibles.");
  });

  it("lays the tiles out on two columns and wraps a long country list without any fixed width", () => {
    const many = Array.from({ length: 30 }, (_, index) => ({ country: `${String.fromCharCode(65 + index)}X`, count: 30 - index }));
    renderSection({ stats: { ...STATS, countries: many } });

    const grid = screen.getByText("Dégustations", { selector: "dt" }).closest("dl") as HTMLElement;
    expect(grid).toHaveClass("grid", "grid-cols-2", "gap-3");
    const list = screen.getByRole("list");
    expect(list).toHaveClass("flex", "flex-wrap", "gap-2");
    expect(within(list).getAllByRole("listitem")).toHaveLength(30);
    expect(list.className).not.toMatch(/w-\[|min-w-\[|overflow-x/);
    within(list)
      .getAllByRole("listitem")
      .forEach((item) => expect(item.className).not.toMatch(/whitespace-nowrap|w-\[|min-w-\[|overflow-x/));
  });

  it("writes every value in the display font and every label in the muted colour", () => {
    renderSection();

    expect(valueOf("Dégustations")).toHaveClass("font-display");
    expect(screen.getByText("Dégustations", { selector: "dt" })).toHaveClass("text-muted");
  });
  it("mounts the monthly histogram under the grid with its twelve bars", () => {
    const monthlyCheckins = Array.from({ length: 12 }, (_, index) => ({
      month: `2026-${String(index + 1).padStart(2, "0")}`,
      count: index,
    }));
    renderSection({ stats: { ...STATS, monthlyCheckins } });

    const heading = screen.getByRole("heading", { level: 3, name: "12 derniers mois" });
    const bars = within(heading.parentElement as HTMLElement).getAllByRole("listitem");
    expect(bars).toHaveLength(12);
    expect(bars[11]).toHaveAccessibleName("décembre 2026 : 11 dégustations");
    const grid = screen.getByText("Dégustations", { selector: "dt" }).closest("dl") as HTMLElement;
    expect(grid.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows no histogram when no month is received and none while loading or on error", () => {
    const { unmount } = renderSection();
    expect(screen.queryByRole("heading", { level: 3, name: "12 derniers mois" })).not.toBeInTheDocument();
    unmount();
    renderSection({ stats: null, isPending: true });
    expect(screen.queryByRole("heading", { level: 3, name: "12 derniers mois" })).not.toBeInTheDocument();
  });
});
