import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import type { VenueListDrawerProps } from "@/pages/map/types/venueListDrawer";
import type { Venue } from "@/types/models/venue/venue";
import { VenueListDrawer } from "@/pages/map/components/widgets/venueListDrawer/venueListDrawer";
import { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";
import { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";
import i18n from "@/i18n/i18n";

const VENUE_COUNT = 36;
const LONG_NAME = "Brasserie-Artisanale-Du-Mont-Blanc-Et-Des-Alpes-Sans-Aucun-Espace-Dans-Son-Nom-Tres-Tres-Long-Vraiment";

const buildVenues = async (count: number): Promise<Venue[]> => {
  const types = [VenueTypeEnum.BAR, VenueTypeEnum.SHOP, VenueTypeEnum.BREWERY];
  const statuses = [
    AvailabilityStatusEnum.CONFIRMED,
    AvailabilityStatusEnum.MAYBE_GONE,
    AvailabilityStatusEnum.GONE,
    AvailabilityStatusEnum.UNKNOWN,
  ];
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `Lieu ${index + 1}`,
    type: types[index % types.length],
    city: `Ville ${index + 1}`,
    address: `${index + 1} rue de la Bière`,
    latitude: 48.85,
    longitude: 2.35,
    description: "",
    distanceKm: null,
    checkinCount: 0,
    lastCheckinAt: null,
    status: statuses[index % statuses.length],
  }));
};

const onRetry = vi.fn();
const onSelectVenue = vi.fn();

const renderDrawer = async (overrides: Partial<VenueListDrawerProps> = {}) => {
  return renderWithProviders(
    <VenueListDrawer venues={[]} isPending={false} isError={false} onRetry={onRetry} onSelectVenue={onSelectVenue} {...overrides} />,
  );
};

const openDrawer = async (user: ReturnType<typeof userEvent.setup>, name: string | RegExp = /^Lieux/) => {
  await user.click(screen.getByRole("button", { name }));
  return screen.findByRole("dialog", { name: "Lieux" });
};

describe("VenueListDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a closed trigger counting the venues, and no dialog", async () => {
    await renderDrawer({ venues: await buildVenues(VENUE_COUNT) });

    expect(screen.getByRole("button", { name: "Lieux (36)" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the closed trigger as a secondary large button", async () => {
    await renderDrawer({ venues: await buildVenues(VENUE_COUNT) });

    const trigger = screen.getByRole("button", { name: "Lieux (36)" });

    expect(trigger.className).toContain("button--secondary");
    expect(trigger.className).toContain("button--lg");
  });

  it("AC1 lists the 36 venues in a bottom sheet titled Lieux, each with name, translated type, city and translated status", async () => {
    const user = userEvent.setup();
    await renderDrawer({ venues: await buildVenues(VENUE_COUNT) });

    const dialog = await openDrawer(user, "Lieux (36)");

    expect(within(dialog).getByRole("heading", { name: "Lieux" })).toBeInTheDocument();
    expect(dialog.closest('[data-placement="bottom"]')).not.toBeNull();
    const rows = within(dialog).getAllByRole("listitem");
    expect(rows).toHaveLength(VENUE_COUNT);
    expect(within(rows[0]).getByText("Lieu 1")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Bar")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Ville 1")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Confirmée")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Lieu 2")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Cave")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Peut-être épuisée")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Brasserie")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Épuisée")).toBeInTheDocument();
    expect(within(rows[3]).getByText("Bar")).toBeInTheDocument();
    expect(within(rows[3]).getByText("Inconnue")).toBeInTheDocument();
    expect(within(rows[35]).getByText("Lieu 36")).toBeInTheDocument();
  });

  it("shows no type for a venue of an unknown type and no city for an empty city", async () => {
    const user = userEvent.setup();
    const [venue] = await buildVenues(1);
    await renderDrawer({ venues: [{ ...venue, type: null, city: "" }] });

    const dialog = await openDrawer(user);
    const row = within(dialog).getByRole("listitem");

    expect(row).toHaveTextContent(/^Lieu 1\s*✓\s*Confirmée$/);
  });

  it("AC2 shows loading blocks shaped like the rows, and neither rows, alert nor empty panel", async () => {
    const user = userEvent.setup();
    await renderDrawer({ isPending: true });

    const dialog = await openDrawer(user);

    const skeletons = within(dialog).getAllByTestId("venue-row-skeleton");
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
    skeletons.forEach((skeleton) => {
      expect(skeleton).toHaveClass("rounded-mousse", "border-mousse", "bg-surface");
      expect(skeleton.querySelectorAll(".skeleton")).toHaveLength(2);
    });
    expect(within(dialog).queryByRole("listitem")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Aucun lieu ici")).not.toBeInTheDocument();
  });

  it("AC3 shows an alert Impossible de charger les lieux with a Réessayer button that calls onRetry", async () => {
    const user = userEvent.setup();
    await renderDrawer({ isError: true });

    const dialog = await openDrawer(user);

    const alert = within(dialog).getByRole("alert");
    expect(alert.className).toContain("alert--danger");
    expect(alert).toHaveTextContent("Impossible de charger les lieux.");
    expect(within(dialog).queryByTestId("venue-row-skeleton")).not.toBeInTheDocument();
    await user.click(within(alert).getByRole("button", { name: "Réessayer" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("AC4 shows the searching mascot panel saying no venue matches when the list is empty", async () => {
    const user = userEvent.setup();
    await renderDrawer({ venues: [] });

    const dialog = await openDrawer(user, "Lieux (0)");

    expect(within(dialog).getByRole("heading", { level: 2, name: "Aucun lieu ici" })).toBeInTheDocument();
    expect(within(dialog).getByText("Déplacez la carte ou retirez des filtres.")).toBeInTheDocument();
    expect(dialog.querySelector('[data-slot="mascot"][data-mood="searching"]')).not.toBeNull();
    expect(within(dialog).queryByRole("listitem")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("AC5 wraps a very long venue name and keeps the list inside a bounded scrolling column", async () => {
    const user = userEvent.setup();
    const venues = await buildVenues(20);
    venues[0] = { ...venues[0], name: LONG_NAME };
    await renderDrawer({ venues });

    const dialog = await openDrawer(user);
    const rows = within(dialog).getAllByRole("listitem");
    const name = within(rows[0]).getByText(LONG_NAME);
    const list = within(dialog).getByRole("list");

    expect(rows).toHaveLength(20);
    expect(name).toHaveClass("break-words");
    expect(rows[0]).toHaveClass("min-w-0");
    expect(list.parentElement).toHaveClass("overflow-y-auto");
    expect(list.parentElement?.className).toMatch(/max-h-\S+/);
    expect(list.parentElement).toHaveClass("min-w-0");
    [name, rows[0], list].forEach((element) => {
      expect(element).not.toHaveClass("whitespace-nowrap");
      expect(element).not.toHaveClass("truncate");
    });
  });

  it("shows each row status as a small badge with a decorative glyph, never amber", async () => {
    const user = userEvent.setup();
    await renderDrawer({ venues: await buildVenues(4) });

    const dialog = await openDrawer(user);
    const rows = within(dialog).getAllByRole("listitem");
    const expected = [
      ["Confirmée", "✓"],
      ["Peut-être épuisée", "?"],
      ["Épuisée", "✕"],
      ["Inconnue", "–"],
    ];

    expected.forEach(([label, glyph], index) => {
      const chip = within(rows[index]).getByText(label).closest(".chip");
      expect(chip).not.toBeNull();
      expect(chip).toHaveClass("chip--sm");
      expect(chip?.className).not.toContain("chip--warning");
      expect(within(rows[index]).getByText(glyph)).toHaveAttribute("aria-hidden", "true");
    });
  });
});

describe("VenueListDrawer selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AC1 turns each row into a full width ghost button at least 44 px high named after the venue", async () => {
    const user = userEvent.setup();
    await renderDrawer({ venues: await buildVenues(3) });

    const dialog = await openDrawer(user);
    const rows = within(dialog).getAllByRole("listitem");

    rows.forEach((row, index) => {
      const button = within(row).getByRole("button", { name: new RegExp(`^Lieu ${index + 1}`) });
      expect(button).toHaveClass("w-full", "min-h-11");
      expect(button.className).toContain("button--ghost");
      expect(button).not.toHaveClass("rounded-mousse");
      expect(button).not.toHaveClass("border-mousse");
      expect(button).not.toHaveClass("bg-surface");
    });
  });

  it("AC1 closes the drawer and hands the touched venue to onSelectVenue", async () => {
    const user = userEvent.setup();
    const venues = await buildVenues(3);
    await renderDrawer({ venues });

    const dialog = await openDrawer(user);
    await user.click(within(within(dialog).getAllByRole("listitem")[1]).getByRole("button"));

    expect(onSelectVenue).toHaveBeenCalledTimes(1);
    expect(onSelectVenue).toHaveBeenCalledWith(venues[1]);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Lieux" })).not.toBeInTheDocument());
  });

  it("does not call onSelectVenue when the drawer is only opened and closed", async () => {
    const user = userEvent.setup();
    await renderDrawer({ venues: await buildVenues(2) });

    await openDrawer(user);
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Lieux" })).not.toBeInTheDocument());
    expect(onSelectVenue).not.toHaveBeenCalled();
  });

  it("opens again after a selection", async () => {
    const user = userEvent.setup();
    await renderDrawer({ venues: await buildVenues(2) });

    const dialog = await openDrawer(user);
    await user.click(within(within(dialog).getAllByRole("listitem")[0]).getByRole("button"));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Lieux" })).not.toBeInTheDocument());
    const reopened = await openDrawer(user);

    expect(within(reopened).getAllByRole("listitem")).toHaveLength(2);
  });
});

describe("VenueListDrawer distances", () => {
  const readRowText = (row: HTMLElement) => (row.textContent ?? "").replace(/\s/g, " ");

  it("AC1 shows the distance of each row in the order received, 350 m then 1,2 km", async () => {
    const user = userEvent.setup();
    const [first, second, third] = await buildVenues(3);
    await renderDrawer({
      venues: [
        { ...first, distanceKm: 0.35 },
        { ...second, distanceKm: 1.2 },
        { ...third, distanceKm: 12.34 },
      ],
    });

    const dialog = await openDrawer(user);
    const rows = within(dialog).getAllByRole("listitem");

    expect(within(rows[0]).getByText("Lieu 1")).toBeInTheDocument();
    expect(readRowText(rows[0])).toContain("350 m");
    expect(within(rows[1]).getByText("Lieu 2")).toBeInTheDocument();
    expect(readRowText(rows[1])).toContain("1,2 km");
    expect(readRowText(rows[2])).toContain("12,3 km");
  });

  it("formats the distance in the current language", async () => {
    const user = userEvent.setup();
    const [first] = await buildVenues(1);
    await i18n.changeLanguage("en");
    try {
      await renderDrawer({ venues: [{ ...first, distanceKm: 1.2 }] });

      await user.click(screen.getByRole("button", { name: "Places (1)" }));
      const dialog = await screen.findByRole("dialog", { name: "Places" });
      const row = within(dialog).getByRole("listitem");

      expect(readRowText(row)).toContain("1.2 km");
      expect(readRowText(row)).not.toContain("1,2 km");
    } finally {
      await i18n.changeLanguage("fr");
    }
  });

  it("keeps the order of the API even when a farther venue comes first", async () => {
    const user = userEvent.setup();
    const [first, second] = await buildVenues(2);
    await renderDrawer({ venues: [{ ...first, distanceKm: 5 }, { ...second, distanceKm: 0.2 }] });

    const dialog = await openDrawer(user);
    const rows = within(dialog).getAllByRole("listitem");

    expect(within(rows[0]).getByText("Lieu 1")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Lieu 2")).toBeInTheDocument();
  });

  it("shows no distance for a venue without one", async () => {
    const user = userEvent.setup();
    const [first, second] = await buildVenues(2);
    await renderDrawer({ venues: [{ ...first, distanceKm: 0.35 }, second] });

    const dialog = await openDrawer(user);
    const rows = within(dialog).getAllByRole("listitem");

    expect(readRowText(rows[0])).toContain("350 m");
    expect(readRowText(rows[1])).not.toMatch(/\d\s?(km|m)\b/);
  });
});
