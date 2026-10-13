import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BeerFilterChip } from "@/pages/map/components/elements/beerFilterChip/beerFilterChip";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const mockBeer = vi.hoisted(() => ({ useFilteredBeerQuery: vi.fn() }));

vi.mock("@/pages/map/hooks/useFilteredBeerQuery", () => mockBeer);

const renderChip = async (state: Record<string, unknown>, onRemove = vi.fn()) => {
  mockBeer.useFilteredBeerQuery.mockReturnValue(state);
  renderWithProviders(<BeerFilterChip beerId={7} onRemove={onRemove} />);
  return onRemove;
};

describe("BeerFilterChip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AC1 reads the beer of the id and shows its name in an accent chip", async () => {
    await renderChip({ data: { id: 7, name: "Orval" }, isPending: false, isError: false });

    expect(mockBeer.useFilteredBeerQuery).toHaveBeenCalledWith(7);
    const label = screen.getByText("Où boire : Orval");
    expect(label.closest(".chip")).toHaveClass("chip--accent");
    expect(screen.queryByTestId("beer-filter-chip-skeleton")).not.toBeInTheDocument();
  });

  it("AC4 shows a loading block instead of the name while the beer loads", async () => {
    await renderChip({ data: undefined, isPending: true, isError: false });

    expect(screen.getByTestId("beer-filter-chip-skeleton")).toBeInTheDocument();
    expect(screen.queryByText(/Où boire/)).not.toBeInTheDocument();
    expect(screen.queryByText("Bière inconnue")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retirer le filtre bière" })).toBeInTheDocument();
  });

  it("AC3 says Bière inconnue for an unknown beer and keeps it removable", async () => {
    const user = userEvent.setup();
    const onRemove = await renderChip({ data: null, isPending: false, isError: false });

    expect(screen.getByText("Bière inconnue")).toBeInTheDocument();
    expect(screen.queryByText(/Où boire/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retirer le filtre bière" }));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("AC3 says Bière inconnue when the beer cannot be read", async () => {
    await renderChip({ data: undefined, isPending: false, isError: true });

    expect(screen.getByText("Bière inconnue")).toBeInTheDocument();
    expect(screen.queryByTestId("beer-filter-chip-skeleton")).not.toBeInTheDocument();
  });

  it("calls onRemove once when the remove button is pressed", async () => {
    const user = userEvent.setup();
    const onRemove = await renderChip({ data: { id: 7, name: "Orval" }, isPending: false, isError: false });

    await user.click(screen.getByRole("button", { name: "Retirer le filtre bière" }));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
