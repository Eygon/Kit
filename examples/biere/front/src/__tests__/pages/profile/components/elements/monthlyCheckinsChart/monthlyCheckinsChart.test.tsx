import { screen, within } from "@testing-library/react";
import i18n from "@/i18n/i18n";
import { MonthlyCheckinsChart } from "@/pages/profile/components/elements/monthlyCheckinsChart/monthlyCheckinsChart";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const YEAR_MONTHS = [
  { month: "2025-11", count: 3 },
  { month: "2025-12", count: 0 },
  { month: "2026-01", count: 8 },
  { month: "2026-02", count: 1 },
  { month: "2026-03", count: 4 },
  { month: "2026-04", count: 0 },
  { month: "2026-05", count: 2 },
  { month: "2026-06", count: 6 },
  { month: "2026-07", count: 7 },
  { month: "2026-08", count: 5 },
  { month: "2026-09", count: 4 },
  { month: "2026-10", count: 2 },
];

const ALL_ZERO_MONTHS = YEAR_MONTHS.map(({ month }) => ({ month, count: 0 }));

const renderChart = (months: { month: string; count: number }[]) => renderWithProviders(<MonthlyCheckinsChart months={months} />);

const barOf = (item: HTMLElement) => within(item).getByTestId("month-bar");

describe("MonthlyCheckinsChart", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("fr");
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await i18n.changeLanguage("fr");
  });

  it("shows a heading and twelve bars in the order received", () => {
    renderChart(YEAR_MONTHS);

    expect(screen.getByRole("heading", { level: 3, name: "12 derniers mois" })).toBeInTheDocument();
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(12);
    expect(items[0]).toHaveAccessibleName("novembre 2025 : 3 dégustations");
    expect(items[11]).toHaveAccessibleName("octobre 2026 : 2 dégustations");
    expect(items.map((item) => item.getAttribute("aria-label"))).toEqual([
      "novembre 2025 : 3 dégustations",
      "décembre 2025 : 0 dégustation",
      "janvier 2026 : 8 dégustations",
      "février 2026 : 1 dégustation",
      "mars 2026 : 4 dégustations",
      "avril 2026 : 0 dégustation",
      "mai 2026 : 2 dégustations",
      "juin 2026 : 6 dégustations",
      "juillet 2026 : 7 dégustations",
      "août 2026 : 5 dégustations",
      "septembre 2026 : 4 dégustations",
      "octobre 2026 : 2 dégustations",
    ]);
  });

  it("writes one capital letter per month under each bar, never truncated", () => {
    renderChart(YEAR_MONTHS);

    const items = screen.getAllByRole("listitem");
    const letters = items.map((item) => item.textContent);
    expect(letters).toEqual(["N", "D", "J", "F", "M", "A", "M", "J", "J", "A", "S", "O"]);
    expect(items[2]).toHaveClass("min-w-0");
    const label = within(items[2]).getByText("J");
    expect(label).toHaveClass("text-xs");
    expect(label).not.toHaveClass("truncate");
    expect(items[2]).toHaveAccessibleName("janvier 2026 : 8 dégustations");
  });

  it("writes the month names and the plural in english", async () => {
    await i18n.changeLanguage("en");
    renderChart(YEAR_MONTHS);

    const items = screen.getAllByRole("listitem");
    expect(screen.getByRole("heading", { level: 3, name: "Last 12 months" })).toBeInTheDocument();
    expect(items[0]).toHaveAccessibleName("November 2025: 3 tastings");
    expect(items[1]).toHaveAccessibleName("December 2025: 0 tastings");
    expect(items[3]).toHaveAccessibleName("February 2026: 1 tasting");
    expect(items.map((item) => item.textContent)).toEqual(["N", "D", "J", "F", "M", "A", "M", "J", "J", "A", "S", "O"]);
  });

  it("sizes each bar against the busiest month", () => {
    renderChart(YEAR_MONTHS);

    const items = screen.getAllByRole("listitem");
    expect(barOf(items[2])).toHaveStyle({ height: "100%" });
    expect(barOf(items[4])).toHaveStyle({ height: "50%" });
    expect(barOf(items[3])).toHaveStyle({ height: "12.5%" });
  });

  it("keeps a month at zero present with an empty bar", () => {
    renderChart(YEAR_MONTHS);

    const december = screen.getByRole("listitem", { name: "décembre 2025 : 0 dégustation" });
    expect(december).toBeInTheDocument();
    expect(barOf(december)).toHaveStyle({ height: "0%" });
  });

  it("stays readable without any division by zero when every month is at zero", () => {
    renderChart(ALL_ZERO_MONTHS);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(12);
    items.forEach((item) => {
      expect(barOf(item)).toHaveStyle({ height: "0%" });
      expect(barOf(item).getAttribute("style")).not.toMatch(/NaN|Infinity/);
      expect(item.getAttribute("aria-label")).toMatch(/ : 0 dégustation$/);
    });
  });

  it("fits the twelve bars on twelve columns without any fixed width or horizontal scroll", () => {
    renderChart(YEAR_MONTHS);

    const list = screen.getByRole("list");
    expect(list).toHaveClass("grid", "grid-cols-12", "items-end", "gap-1", "h-24");
    const fixedWidth = /w-\[|min-w-\[|overflow-x|overflow-auto|overflow-scroll/;
    expect(list.className).not.toMatch(fixedWidth);
    screen.getAllByRole("listitem").forEach((item) => {
      expect(item.className).not.toMatch(fixedWidth);
      expect(barOf(item).className).not.toMatch(fixedWidth);
    });
    expect(barOf(screen.getAllByRole("listitem")[0])).toHaveClass("bg-accent", "rounded-control");
  });

  it.each(["America/Los_Angeles", "Pacific/Auckland", "Europe/Paris"])(
    "writes the calendar month received on a phone set to %s",
    (zone) => {
      vi.stubEnv("TZ", zone);
      renderChart([
        { month: "2026-01", count: 1 },
        { month: "2026-12", count: 2 },
      ]);

      const items = screen.getAllByRole("listitem");
      expect(items[0]).toHaveAccessibleName("janvier 2026 : 1 dégustation");
      expect(items[0]).toHaveTextContent(/^J$/);
      expect(items[1]).toHaveAccessibleName("décembre 2026 : 2 dégustations");
      expect(items[1]).toHaveTextContent(/^D$/);
    },
  );
});
