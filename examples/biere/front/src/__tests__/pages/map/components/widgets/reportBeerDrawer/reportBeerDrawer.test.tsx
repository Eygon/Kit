import { toast } from "@heroui/react";
import type { QueryClient } from "@tanstack/react-query";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTestQueryClient, renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { ReportBeerDrawer } from "@/pages/map/components/widgets/reportBeerDrawer/reportBeerDrawer";
import { API_BASE_URL } from "@/config/apiConfig";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

vi.mock("@heroui/react", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  toast: { success: vi.fn(), danger: vi.fn() },
}));

const API = `${API_BASE_URL}/api/v1`;
const mockFetch = vi.fn();
const onOpenChange = vi.fn();

const beerDto = (id: number, name: string, breweryName: string) => ({
  id,
  name,
  breweryName,
  country: "BE",
  styleId: 12,
  styleName: "Trappiste",
  family: "trappist",
  abv: 6.2,
  aromas: [],
  formats: [],
  description: "",
  drunk: false,
  checkinCount: 0,
  inWishlist: false,
});

const pageDto = (items: ReturnType<typeof beerDto>[]) => ({
  items,
  total: items.length,
  page: 1,
  size: 10,
  facets: { families: [], countries: [], formats: [] },
});

const created = {
  beerId: 7,
  beerName: "Orval",
  breweryName: "Orval",
  styleName: "Trappiste",
  family: "trappist",
  status: "unknown",
  lastConfirmedAt: null,
  recentVoterCount: 0,
  nextVoteAt: null,
  drunk: false,
  checkinCount: 0,
  lastCheckinAt: null,
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

type Routes = Readonly<{ search?: () => Response; report?: () => Response }>;

const routeFetch = ({ search, report }: Routes) => {
  mockFetch.mockImplementation(async (_url: string, init?: RequestInit) => {
    if (init?.method === "POST") return report?.() ?? json(created, 201);
    return (
      search?.() ??
      json(pageDto([beerDto(7, "Orval", "Brasserie d'Orval"), beerDto(8, "Orvalus", "Brasserie Imaginaire")]))
    );
  });
};

const postCalls = () => mockFetch.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === "POST");
const searchCalls = () => mockFetch.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method !== "POST");

const renderDrawer = (queryClient: QueryClient = createTestQueryClient()) => {
  renderWithProviders(<ReportBeerDrawer venueId={12} isOpen onOpenChange={onOpenChange} />, { queryClient });
  return screen.findByRole("dialog", { name: "Signaler une bière" });
};

describe("ReportBeerDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens a bottom sheet titled Signaler une bière with a search field, a hint and a Fermer button", async () => {
    const dialog = await renderDrawer();

    expect(dialog.closest('[data-placement="bottom"]')).not.toBeNull();
    expect(within(dialog).getByRole("heading", { name: "Signaler une bière" })).toBeInTheDocument();
    expect(within(dialog).getByRole("searchbox", { name: "Rechercher une bière" })).toBeInTheDocument();
    expect(within(dialog).getByText("Saisissez au moins 2 caractères.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Fermer" })).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("renders no dialog while it is closed", async () => {
    renderWithProviders(<ReportBeerDrawer venueId={12} isOpen={false} onOpenChange={onOpenChange} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onOpenChange(false) from the Fermer button", async () => {
    const user = userEvent.setup();
    const dialog = await renderDrawer();

    await user.click(within(dialog).getByRole("button", { name: "Fermer" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("AC1 searches orv after the debounce, once, and lists the beers as buttons with their brewery", async () => {
    routeFetch({});
    const user = userEvent.setup();
    const dialog = await renderDrawer();

    await user.type(within(dialog).getByRole("searchbox"), "orv");

    const orval = await within(dialog).findByRole("button", { name: /Orval.*Brasserie d'Orval/ });
    expect(orval).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Orvalus.*Brasserie Imaginaire/ })).toBeInTheDocument();
    expect(within(dialog).queryByText("Saisissez au moins 2 caractères.")).not.toBeInTheDocument();
    expect(searchCalls()).toHaveLength(1);
    const url = new URL(searchCalls()[0][0] as string);
    expect(url.pathname).toBe("/api/v1/beers");
    expect(url.searchParams.get("q")).toBe("orv");
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("size")).toBe("10");
  });

  it("does not search under two characters", async () => {
    routeFetch({});
    const user = userEvent.setup();
    const dialog = await renderDrawer();

    await user.type(within(dialog).getByRole("searchbox"), "o");
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(mockFetch).not.toHaveBeenCalled();
    expect(within(dialog).getByText("Saisissez au moins 2 caractères.")).toBeInTheDocument();
  });

  it("AC1 choosing Orval posts its id for the venue, shows one toast, closes the sheet and reloads the venue beers", async () => {
    routeFetch({});
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const user = userEvent.setup();
    const dialog = await renderDrawer(client);
    await user.type(within(dialog).getByRole("searchbox"), "orv");

    await user.click(await within(dialog).findByRole("button", { name: /Orval.*Brasserie d'Orval/ }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(postCalls()).toHaveLength(1);
    const [url, init] = postCalls()[0] as [string, RequestInit];
    expect(url).toBe(`${API}/venues/12/beers`);
    expect(JSON.parse(init.body as string)).toEqual({ beerId: 7 });
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Bière signalée");
    expect(toast.danger).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: venueKeys.beers(12) });
  });

  it("AC2 choosing a beer already listed shows one toast Cette bière est déjà signalée ici and no success", async () => {
    routeFetch({ report: () => json({ message: "already linked" }, 409) });
    const user = userEvent.setup();
    const dialog = await renderDrawer();
    await user.type(within(dialog).getByRole("searchbox"), "orv");

    await user.click(await within(dialog).findByRole("button", { name: /Orval.*Brasserie d'Orval/ }));

    await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
    expect(toast.danger).toHaveBeenCalledWith("Cette bière est déjà signalée ici");
    expect(toast.success).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(within(dialog).getByRole("button", { name: /Orval.*Brasserie d'Orval/ })).toBeEnabled();
  });

  it("keeps the sheet open and the results after a failure other than 409, with the generic toast only", async () => {
    routeFetch({ report: () => json({ message: "boom" }, 500) });
    const user = userEvent.setup();
    const dialog = await renderDrawer();
    await user.type(within(dialog).getByRole("searchbox"), "orv");

    await user.click(await within(dialog).findByRole("button", { name: /Orval.*Brasserie d'Orval/ }));

    await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
    expect(toast.danger).toHaveBeenCalledWith("Une erreur est survenue. Réessayez.");
    expect(toast.success).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(within(dialog).getByRole("button", { name: /Orvalus/ })).toBeInTheDocument();
  });

  it("sends a single request when the same beer is pressed twice in the same tick", async () => {
    routeFetch({});
    const user = userEvent.setup();
    const dialog = await renderDrawer();
    await user.type(within(dialog).getByRole("searchbox"), "orv");
    const orval = await within(dialog).findByRole("button", { name: /Orval.*Brasserie d'Orval/ });

    await user.dblClick(orval);

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(postCalls()).toHaveLength(1);
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it("sends a single request when the same beer is clicked twice before any render", async () => {
    routeFetch({});
    const user = userEvent.setup();
    const dialog = await renderDrawer();
    await user.type(within(dialog).getByRole("searchbox"), "orv");
    const orval = await within(dialog).findByRole("button", { name: /Orval.*Brasserie d'Orval/ });

    fireEvent.click(orval);
    fireEvent.click(orval);

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(postCalls()).toHaveLength(1);
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it("lets the same beer be pressed again after a failure, and posts a second time", async () => {
    routeFetch({ report: () => json({ message: "boom" }, 500) });
    const user = userEvent.setup();
    const dialog = await renderDrawer();
    await user.type(within(dialog).getByRole("searchbox"), "orv");
    await user.click(await within(dialog).findByRole("button", { name: /Orval.*Brasserie d'Orval/ }));
    await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
    expect(postCalls()).toHaveLength(1);
    routeFetch({});

    await user.click(within(dialog).getByRole("button", { name: /Orval.*Brasserie d'Orval/ }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(postCalls()).toHaveLength(2);
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it("disables every result while the report is in flight and sends no second request for another beer", async () => {
    let resolveReport: (response: Response) => void = () => undefined;
    mockFetch.mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") return new Promise<Response>((resolve) => (resolveReport = resolve));
      return json(pageDto([beerDto(7, "Orval", "Brasserie d'Orval"), beerDto(8, "Orvalus", "Brasserie Imaginaire")]));
    });
    const user = userEvent.setup();
    const dialog = await renderDrawer();
    await user.type(within(dialog).getByRole("searchbox"), "orv");
    await user.click(await within(dialog).findByRole("button", { name: /Orval.*Brasserie d'Orval/ }));

    await waitFor(() => expect(within(dialog).getByRole("button", { name: /Orvalus/ })).toBeDisabled());
    expect(within(dialog).getByRole("button", { name: /Orval.*Brasserie d'Orval/ })).toBeDisabled();
    await user.click(within(dialog).getByRole("button", { name: /Orvalus/ }));
    expect(postCalls()).toHaveLength(1);
    resolveReport(json(created, 201));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("forgets the typed search when the sheet is closed from its Fermer button", async () => {
    routeFetch({});
    const user = userEvent.setup();
    const dialog = await renderDrawer();
    await user.type(within(dialog).getByRole("searchbox"), "orv");
    await within(dialog).findByRole("button", { name: /Orval.*Brasserie d'Orval/ });

    await user.click(within(dialog).getByRole("button", { name: "Fermer" }));

    expect(within(dialog).getByRole("searchbox")).toHaveValue("");
    expect(within(dialog).getByText("Saisissez au moins 2 caractères.")).toBeInTheDocument();
  });

  it("AC3 shows the searching mascot with Aucune bière trouvée when the search has no result", async () => {
    routeFetch({ search: () => json(pageDto([])) });
    const user = userEvent.setup();
    const dialog = await renderDrawer();

    await user.type(within(dialog).getByRole("searchbox"), "zzz");

    expect(await within(dialog).findByRole("heading", { name: "Aucune bière trouvée" })).toBeInTheDocument();
    expect(within(dialog).getByText("Essayez un autre nom.")).toBeInTheDocument();
    expect(dialog.querySelector('[data-slot="mascot"]')?.getAttribute("data-mood")).toBe("searching");
    expect(within(dialog).queryByRole("button", { name: /Brasserie/ })).not.toBeInTheDocument();
  });

  it("shows three skeleton rows in a busy container, with no alert and no mascot, while the search is in flight", async () => {
    mockFetch.mockImplementation(() => new Promise<Response>(() => undefined));
    const user = userEvent.setup();
    const dialog = await renderDrawer();

    await user.type(within(dialog).getByRole("searchbox"), "orv");

    await waitFor(() => expect(dialog.querySelector("[aria-busy=\"true\"]")).not.toBeNull());
    expect(dialog.querySelector("[aria-busy=\"true\"]")?.querySelectorAll(".skeleton")).toHaveLength(3);
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    expect(dialog.querySelector("[data-slot=\"mascot\"]")).toBeNull();
    expect(within(dialog).queryByText("Saisissez au moins 2 caractères.")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /Brasserie/ })).not.toBeInTheDocument();
  });

  it("shows no mascot while the search has results or is below two characters", async () => {
    routeFetch({});
    const user = userEvent.setup();
    const dialog = await renderDrawer();
    expect(dialog.querySelector('[data-slot="mascot"]')).toBeNull();

    await user.type(within(dialog).getByRole("searchbox"), "orv");
    await within(dialog).findByRole("button", { name: /Orval.*Brasserie d'Orval/ });

    expect(dialog.querySelector('[data-slot="mascot"]')).toBeNull();
  });

  it("shows an alert with a retry button when the search fails, and retries the same term", async () => {
    routeFetch({ search: () => json({ message: "boom" }, 500) });
    const user = userEvent.setup();
    const dialog = await renderDrawer();
    await user.type(within(dialog).getByRole("searchbox"), "orv");

    const alert = await within(dialog).findByRole("alert");
    expect(within(alert).getByText("Impossible de chercher les bières.")).toBeInTheDocument();
    routeFetch({});
    await user.click(within(alert).getByRole("button", { name: "Réessayer" }));

    expect(await within(dialog).findByRole("button", { name: /Orval.*Brasserie d'Orval/ })).toBeInTheDocument();
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("clears the results and shows the hint again when the search is emptied", async () => {
    routeFetch({});
    const user = userEvent.setup();
    const dialog = await renderDrawer();
    await user.type(within(dialog).getByRole("searchbox"), "orv");
    await within(dialog).findByRole("button", { name: /Orval.*Brasserie d'Orval/ });

    await user.click(within(dialog).getByRole("button", { name: "Effacer la recherche" }));

    await waitFor(() =>
      expect(within(dialog).queryByRole("button", { name: /Orval.*Brasserie d'Orval/ })).not.toBeInTheDocument(),
    );
    expect(within(dialog).getByText("Saisissez au moins 2 caractères.")).toBeInTheDocument();
  });

  it("keeps a very long beer name and brewery wrapped inside a bounded scrolling list", async () => {
    const long = "Mot".repeat(60);
    routeFetch({ search: () => json(pageDto([beerDto(9, long, long)])) });
    const user = userEvent.setup();
    const dialog = await renderDrawer();

    await user.type(within(dialog).getByRole("searchbox"), "mot");

    const button = await within(dialog).findByRole("button", { name: new RegExp(long) });
    expect(within(button).getAllByText(long).every((node) => node.className.includes("break-words"))).toBe(true);
    expect(button.className).toContain("min-h-11");
    const body = dialog.querySelector(".drawer__body");
    expect(body?.className).toContain("overflow-y-auto");
    expect(body?.className).toMatch(/max-h-\[\d+dvh\]/);
  });
});
