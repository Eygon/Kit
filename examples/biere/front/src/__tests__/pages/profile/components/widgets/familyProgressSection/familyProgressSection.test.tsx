import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "@/i18n/i18n";
import { FamilyProgressSection } from "@/pages/profile/components/widgets/familyProgressSection/familyProgressSection";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import type { Dex } from "@/types/models/dex/dex";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const FAMILY_ENGLISH_LABELS = [
  "Lager",
  "Pilsner",
  "Pale Ale",
  "IPA",
  "Blonde",
  "Amber",
  "Brown",
  "Stout",
  "Porter",
  "Witbier",
  "Weizen",
  "Saison",
  "Trappist",
  "Abbey",
  "Belgian Strong",
  "Sour / Lambic",
  "Fruit beer",
  "Non-alcoholic",
];

const FAMILIES = Object.values(BeerFamilyEnum);

const buildDex = (discoveredOf: (index: number) => number, discovered: number, total: number): Dex => ({
  discovered,
  total,
  families: FAMILIES.map((family, index) => ({ family, discovered: discoveredOf(index), total: index + 5 })),
  beers: [],
});

const PROGRESS_DEX = buildDex((index) => (index % 4) + 1, 42, 120);
const EMPTY_DEX = buildDex(() => 0, 0, 120);

const onRetry = vi.fn();

const renderSection = (props: { dex?: Dex | null; isPending?: boolean; isError?: boolean } = {}) =>
  renderWithProviders(
    <FamilyProgressSection
      dex={props.dex === undefined ? PROGRESS_DEX : props.dex}
      isPending={props.isPending ?? false}
      isError={props.isError ?? false}
      onRetry={onRetry}
    />,
  );

describe("FamilyProgressSection", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("en");
  });

  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("shows its title and the discovered total as a summary", () => {
    renderSection();

    expect(screen.getByRole("heading", { level: 2, name: "Progress" })).toBeInTheDocument();
    expect(screen.getByText("42 / 120 discovered")).toBeInTheDocument();
  });

  it("lists one ring per family in the order received, each labelled with its translated family", () => {
    renderSection();

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(18);
    items.forEach((item, index) => {
      const discovered = (index % 4) + 1;
      const total = index + 5;
      const label = `${FAMILY_ENGLISH_LABELS[index]} ${discovered} / ${total}`;
      expect(within(item).getByText(label)).toBeInTheDocument();
      expect(
        within(item).getByRole("progressbar", { name: `${FAMILY_ENGLISH_LABELS[index]}: ${discovered} of ${total}` }),
      ).toBeInTheDocument();
    });
  });

  it("fills each ring with the discovered share of its family", () => {
    renderSection({ dex: buildDex(() => 3, 54, 120) });

    const ring = screen.getByRole("progressbar", { name: "Lager: 3 of 5" });
    expect(ring).toHaveAttribute("aria-valuenow", "3");
    expect(ring).toHaveAttribute("aria-valuemax", "5");
  });

  it("keeps the order of the families even when the discoveries are unsorted", () => {
    const reversed = { ...PROGRESS_DEX, families: [...PROGRESS_DEX.families].reverse() };
    renderSection({ dex: reversed });

    const first = screen.getAllByRole("listitem")[0];
    expect(within(first).getByText(/^Non-alcoholic /)).toBeInTheDocument();
  });

  it("shows 0 / 120 and 18 empty rings for a user without any tasting, with no empty state", () => {
    renderSection({ dex: EMPTY_DEX });

    expect(screen.getByText("0 / 120 discovered")).toBeInTheDocument();
    const rings = screen.getAllByRole("progressbar");
    expect(rings).toHaveLength(18);
    rings.forEach((ring) => expect(ring).toHaveAttribute("aria-valuenow", "0"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps a ring renderable when a family has no beer at all", () => {
    const noBeerDex: Dex = { discovered: 0, total: 0, families: [{ family: BeerFamilyEnum.LAGER, discovered: 0, total: 0 }], beers: [] };
    renderSection({ dex: noBeerDex });

    expect(screen.getByRole("progressbar", { name: "Lager: 0 of 0" })).toHaveAttribute("aria-valuemax", "1");
  });

  it("shows 18 ring skeletons and no summary while loading", () => {
    renderSection({ dex: null, isPending: true });

    expect(screen.getAllByTestId("family-progress-skeleton")).toHaveLength(18);
    expect(screen.queryByText(/discovered/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an alert with a retry button that reads the progress again on error", async () => {
    renderSection({ dex: null, isError: true });

    expect(screen.getByRole("alert")).toHaveTextContent("Progress unavailable.");
    expect(screen.queryAllByRole("progressbar")).toHaveLength(0);
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows the alert when there is no progress without a reported error", () => {
    renderSection({ dex: null });

    expect(screen.getByRole("alert")).toHaveTextContent("Progress unavailable.");
  });

  it("lays the rings out on two columns on a phone without any fixed width", () => {
    renderSection();

    const list = screen.getByRole("list");
    expect(list).toHaveClass("grid", "grid-cols-2", "gap-3", "md:grid-cols-3");
    expect(list.className).not.toMatch(/w-\[|min-w-\[/);
  });

  it("translates the labels to french", async () => {
    await i18n.changeLanguage("fr");
    renderSection();

    expect(screen.getByRole("heading", { level: 2, name: "Progression" })).toBeInTheDocument();
    expect(screen.getByText("42 / 120 découvertes")).toBeInTheDocument();
    expect(screen.getByText("Lager 1 / 5")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Lager : 1 sur 5" })).toBeInTheDocument();
  });
});
