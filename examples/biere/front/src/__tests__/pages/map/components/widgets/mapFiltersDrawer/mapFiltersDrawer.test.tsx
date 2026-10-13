import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MapFiltersDrawer } from "@/pages/map/components/widgets/mapFiltersDrawer/mapFiltersDrawer";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import {
  AVAILABILITY_STATUS_GLYPHS,
  AVAILABILITY_STATUS_MARKER_CLASSES,
  AvailabilityStatusEnum,
} from "@/types/enums/venue/availabilityStatusEnum";
import { VENUE_TYPE_MARKER_SHAPE_CLASSES, VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";
import { EMPTY_MAP_FILTERS } from "@/types/mappers/venue/mapFiltersMapper";
import type { MapFilters } from "@/types/models/venue/mapFilters";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const onApply = vi.fn();

const EMPTY: MapFilters = { types: [], family: null, beerId: null, confirmedOnly: false, radiusKm: null };

const renderDrawer = (appliedFilters: MapFilters = EMPTY, hasPosition = false) => {
  return renderWithProviders(<MapFiltersDrawer appliedFilters={appliedFilters} hasPosition={hasPosition} onApply={onApply} />);
};

const openDrawer = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: /^Filtres/ }));
  return screen.findByRole("dialog", { name: "Filtres" });
};

describe("MapFiltersDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a closed Filtres button with no count badge when no filter is active", async () => {
    renderDrawer();

    expect(screen.getByRole("button", { name: "Filtres" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText(/filtres? actifs?/)).not.toBeInTheDocument();
  });

  it("opens a bottom sheet titled Filtres with the type, family, confirmed and radius controls", async () => {
    const user = userEvent.setup();
    renderDrawer();

    const dialog = await openDrawer(user);

    expect(within(dialog).getByRole("heading", { name: "Filtres" })).toBeInTheDocument();
    expect(dialog.closest('[data-placement="bottom"]')).not.toBeNull();
    const types = within(within(dialog).getByRole("group", { name: "Type de lieu" })).getAllByRole("checkbox");
    expect(types.map((type) => type.closest("label")?.textContent)).toEqual(["Bar", "Cave", "Brasserie"]);
    expect(within(dialog).getByRole("button", { name: /Famille de bière/ })).toHaveTextContent("Toutes");
    expect(within(dialog).getByRole("switch", { name: "Disponibilité confirmée seulement" })).not.toBeChecked();
    expect(within(dialog).getByRole("button", { name: /Rayon/ })).toBeInTheDocument();
  });

  it("lays the confirmed-only switch out beside its label in one clickable row", async () => {
    const user = userEvent.setup();
    renderDrawer();
    const dialog = await openDrawer(user);

    const toggle = within(dialog).getByRole("switch", { name: "Disponibilité confirmée seulement" });
    const row = toggle.closest('[data-slot="switch-content"]');
    expect(row).toHaveClass("flex-row", "min-h-11", "w-full");
    expect(row).toContainElement(within(dialog).getByText("Disponibilité confirmée seulement"));
    expect(row?.querySelector('[data-slot="switch-control"]')).not.toBeNull();
  });

  it("AC1 applies the type, family and confirmed choices the user made", async () => {
    const user = userEvent.setup();
    renderDrawer();
    const dialog = await openDrawer(user);

    await user.click(within(dialog).getByRole("checkbox", { name: "Cave" }));
    await user.click(within(dialog).getByRole("button", { name: /Famille de bière/ }));
    await user.click(screen.getByRole("option", { name: "Stout" }));
    await user.click(within(dialog).getByRole("switch", { name: "Disponibilité confirmée seulement" }));
    await user.click(within(dialog).getByRole("button", { name: "Appliquer" }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({
      types: [VenueTypeEnum.SHOP],
      family: BeerFamilyEnum.STOUT,
      beerId: null,
      confirmedOnly: true,
      radiusKm: null,
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("AC1 keeps the beer of the address when the user applies other choices", async () => {
    const user = userEvent.setup();
    renderDrawer({ ...EMPTY, beerId: 7 });
    const dialog = await openDrawer(user);

    await user.click(within(dialog).getByRole("checkbox", { name: "Bar" }));
    await user.click(within(dialog).getByRole("button", { name: "Appliquer" }));

    expect(onApply).toHaveBeenCalledWith({ ...EMPTY, types: [VenueTypeEnum.BAR], beerId: 7 });
  });

  it("opens with the applied filters ticked and chooses Toutes to clear the family", async () => {
    const user = userEvent.setup();
    renderDrawer({ ...EMPTY, types: [VenueTypeEnum.BREWERY], family: BeerFamilyEnum.IPA, confirmedOnly: true });
    const dialog = await openDrawer(user);

    expect(within(dialog).getByRole("checkbox", { name: "Brasserie" })).toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: "Bar" })).not.toBeChecked();
    expect(within(dialog).getByRole("button", { name: /Famille de bière/ })).toHaveTextContent("IPA");
    expect(within(dialog).getByRole("switch", { name: "Disponibilité confirmée seulement" })).toBeChecked();

    await user.click(within(dialog).getByRole("button", { name: /Famille de bière/ }));
    await user.click(screen.getByRole("option", { name: "Toutes" }));
    await user.click(within(dialog).getByRole("button", { name: "Appliquer" }));

    expect(onApply).toHaveBeenCalledWith({ ...EMPTY, types: [VenueTypeEnum.BREWERY], confirmedOnly: true });
  });

  it("drops the unapplied choices when the sheet is closed and opened again", async () => {
    const user = userEvent.setup();
    renderDrawer();
    const dialog = await openDrawer(user);
    await user.click(within(dialog).getByRole("checkbox", { name: "Bar" }));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Filtres" }));

    expect(within(await screen.findByRole("dialog", { name: "Filtres" })).getByRole("checkbox", { name: "Bar" })).not.toBeChecked();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("AC2 disables the radius and explains Autour de moi when there is no position", async () => {
    const user = userEvent.setup();
    renderDrawer(EMPTY, false);
    const dialog = await openDrawer(user);

    const radius = within(dialog).getByRole("button", { name: /Rayon/ });
    expect(radius).toBeDisabled();
    expect(within(dialog).getByText("Utilisez Autour de moi pour choisir un rayon.")).toBeInTheDocument();
  });

  it("AC2 offers 1, 2, 5 and 10 km with a position and applies the chosen radius", async () => {
    const user = userEvent.setup();
    renderDrawer(EMPTY, true);
    const dialog = await openDrawer(user);

    const radius = within(dialog).getByRole("button", { name: /Rayon/ });
    expect(radius).toBeEnabled();
    expect(within(dialog).queryByText("Utilisez Autour de moi pour choisir un rayon.")).not.toBeInTheDocument();
    await user.click(radius);
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["1 km", "2 km", "5 km", "10 km"]);
    await user.click(screen.getByRole("option", { name: "5 km" }));
    await user.click(within(dialog).getByRole("button", { name: "Appliquer" }));

    expect(onApply).toHaveBeenCalledWith({ ...EMPTY, radiusKm: 5 });
  });

  it("AC3 shows the number of active filters on the Filtres button", async () => {
    renderDrawer({ ...EMPTY, types: [VenueTypeEnum.BAR, VenueTypeEnum.SHOP], family: BeerFamilyEnum.STOUT, confirmedOnly: true });

    expect(screen.getByText("4 filtres actifs")).toBeInTheDocument();
    expect(screen.getByText("4", { selector: "[aria-hidden='true']" })).toBeInTheDocument();
  });

  it("AC3 says one active filter in the singular", async () => {
    renderDrawer({ ...EMPTY, confirmedOnly: true });

    expect(screen.getByText("1 filtre actif")).toBeInTheDocument();
  });

  it("AC3 clears every choice with Réinitialiser, including the beer, and applies the empty filters", async () => {
    const user = userEvent.setup();
    renderDrawer(
      { types: [VenueTypeEnum.BAR], family: BeerFamilyEnum.STOUT, beerId: 7, confirmedOnly: true, radiusKm: 2 },
      true,
    );
    const dialog = await openDrawer(user);

    await user.click(within(dialog).getByRole("button", { name: "Réinitialiser" }));

    expect(within(dialog).getByRole("checkbox", { name: "Bar" })).not.toBeChecked();
    expect(within(dialog).getByRole("button", { name: /Famille de bière/ })).toHaveTextContent("Toutes");
    expect(within(dialog).getByRole("switch", { name: "Disponibilité confirmée seulement" })).not.toBeChecked();
    expect(onApply).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Appliquer" }));
    expect(onApply).toHaveBeenCalledWith(EMPTY_MAP_FILTERS);
  });

  it("AC5 shows the shape of every place type with its label in the legend", async () => {
    const user = userEvent.setup();
    renderDrawer();
    const dialog = await openDrawer(user);

    const legend = within(dialog).getByRole("region", { name: "Légende" });
    const labels: Record<VenueTypeEnum, string> = {
      [VenueTypeEnum.BAR]: "Bar",
      [VenueTypeEnum.SHOP]: "Cave",
      [VenueTypeEnum.BREWERY]: "Brasserie",
    };
    Object.values(VenueTypeEnum).forEach((type) => {
      const item = within(legend).getByTestId(`legend-type-${type}`);
      expect(item).toHaveTextContent(labels[type]);
      const swatch = within(item).getByTestId("legend-swatch");
      VENUE_TYPE_MARKER_SHAPE_CLASSES[type].split(" ").forEach((shapeClass) => expect(swatch).toHaveClass(shapeClass));
    });
  });

  it("AC5 shows the background and the glyph of every state with its label in the legend", async () => {
    const user = userEvent.setup();
    renderDrawer();
    const dialog = await openDrawer(user);

    const legend = within(dialog).getByRole("region", { name: "Légende" });
    const labels: Record<AvailabilityStatusEnum, string> = {
      [AvailabilityStatusEnum.CONFIRMED]: "Confirmée",
      [AvailabilityStatusEnum.MAYBE_GONE]: "Peut-être épuisée",
      [AvailabilityStatusEnum.GONE]: "Épuisée",
      [AvailabilityStatusEnum.UNKNOWN]: "Inconnue",
    };
    Object.values(AvailabilityStatusEnum).forEach((status) => {
      const item = within(legend).getByTestId(`legend-status-${status}`);
      expect(item).toHaveTextContent(labels[status]);
      const swatch = within(item).getByTestId("legend-swatch");
      AVAILABILITY_STATUS_MARKER_CLASSES[status].split(" ").forEach((stateClass) => expect(swatch).toHaveClass(stateClass));
      expect(swatch).toHaveTextContent(AVAILABILITY_STATUS_GLYPHS[status]);
    });
  });

  it("scrolls inside a bounded body so the Appliquer button stays reachable", async () => {
    const user = userEvent.setup();
    renderDrawer();
    const dialog = await openDrawer(user);

    const body = within(dialog).getByRole("checkbox", { name: "Bar" }).closest(".overflow-y-auto");
    expect(body).not.toBeNull();
    expect(body?.className).toContain("max-h-[60dvh]");
  });
});
