import { renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { createTestQueryClient, renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { VenueBeerList } from "@/pages/map/components/widgets/venueBeerList/venueBeerList";
import { VenueListDrawer } from "@/pages/map/components/widgets/venueListDrawer/venueListDrawer";
import { useVenueBeersQuery } from "@/pages/map/hooks/useVenueBeersQuery";
import { useVenuesQuery } from "@/pages/map/hooks/useVenuesQuery";
import { EMPTY_VENUE_QUERY } from "@/types/mappers/venue/venueQueryMapper";

vi.mock("@heroui/react", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  toast: { danger: vi.fn() },
}));

const failingFetch = () => vi.fn(async () => new Response(JSON.stringify({ message: "boom" }), { status: 500 }));

const VenuesHarness = () => {
  const { venues, isPending, isError, refetch } = useVenuesQuery(EMPTY_VENUE_QUERY);
  return (
    <VenueListDrawer
      venues={venues}
      isPending={isPending}
      isError={isError}
      onRetry={() => void refetch()}
      onSelectVenue={vi.fn()}
    />
  );
};

describe("venue reads with the real service and a failing API", () => {
  beforeEach(() => {
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", failingFetch());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("flags isError on useVenuesQuery for a 500 answer", async () => {
    const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
      <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useVenuesQuery(EMPTY_VENUE_QUERY), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.venues).toEqual([]);
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("flags isError on useVenueBeersQuery for a 500 answer", async () => {
    const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
      <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useVenueBeersQuery(12), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.beers).toEqual([]);
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("US9 AC3 shows the alert Impossible de charger les lieux with Réessayer, not the empty panel", async () => {
    const user = userEvent.setup();
    renderWithProviders(<VenuesHarness />);

    await user.click(screen.getByRole("button", { name: /^Lieux/ }));
    const dialog = await screen.findByRole("dialog", { name: "Lieux" });

    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent("Impossible de charger les lieux.");
    expect(within(alert).getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
    expect(within(dialog).queryByText("Aucun lieu ici")).not.toBeInTheDocument();
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("US15 AC3 shows the alert Impossible de charger les bières with Réessayer, not the empty panel", async () => {
    renderWithProviders(<VenueBeerList venueId={12} />);

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent("Impossible de charger les bières.");
    expect(within(alert).getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
    expect(toast.danger).not.toHaveBeenCalled();
  });
});
