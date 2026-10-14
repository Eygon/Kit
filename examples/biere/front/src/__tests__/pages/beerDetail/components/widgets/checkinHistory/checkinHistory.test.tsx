import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import i18n from "@/i18n/i18n";
import { CheckinHistory } from "@/pages/beerDetail/components/widgets/checkinHistory/checkinHistory";
import type { Checkin } from "@/types/models/checkin/checkin";

const mockHistory = vi.hoisted(() => ({
  useBeerCheckinsQuery: vi.fn(),
  fetchNextPage: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("@/pages/beerDetail/hooks/useBeerCheckinsQuery", () => ({
  useBeerCheckinsQuery: mockHistory.useBeerCheckinsQuery,
}));

const buildCheckin = (overrides: Partial<Checkin>): Checkin => ({
  id: 1,
  beerId: 7,
  beerName: "Orval",
  drankAt: "2026-10-12T12:00:00.000Z",
  place: "Chez Paul",
  rating: 4.5,
  aromas: [],
  format: null,
  price: null,
  comment: "",
  photoId: null,
  venueId: null,
  ...overrides,
});

const THREE_CHECKINS = [
  buildCheckin({
    id: 3,
    drankAt: "2026-10-12T12:00:00.000Z",
    place: "Chez Paul",
    rating: 4.5,
  }),
  buildCheckin({
    id: 2,
    drankAt: "2026-09-05T12:00:00.000Z",
    place: "La Cave",
    rating: null,
  }),
  buildCheckin({
    id: 1,
    drankAt: "2026-08-01T12:00:00.000Z",
    place: "Le Zinc",
    rating: 3,
  }),
];

const stubHistory = (overrides: Record<string, unknown> = {}) => {
  mockHistory.useBeerCheckinsQuery.mockReturnValue({
    checkins: THREE_CHECKINS,
    total: 3,
    isPending: false,
    isError: false,
    refetch: mockHistory.refetch,
    fetchNextPage: mockHistory.fetchNextPage,
    hasNextPage: false,
    isFetchingNextPage: false,
    ...overrides,
  });
};

describe("CheckinHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHistory.refetch.mockResolvedValue(undefined);
    mockHistory.fetchNextPage.mockResolvedValue(undefined);
    stubHistory();
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await i18n.changeLanguage("fr");
  });

  it("asks for the history of the beer it is given", () => {
    renderWithProviders(<CheckinHistory beerId={7} />);

    expect(mockHistory.useBeerCheckinsQuery).toHaveBeenCalledWith(7);
  });

  it("lists three tastings under Mon historique, most recent first, each with its date, place and rating", () => {
    renderWithProviders(<CheckinHistory beerId={7} />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Mon historique" }),
    ).toBeInTheDocument();
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("12/10/2026");
    expect(items[0]).toHaveTextContent("Chez Paul");
    expect(items[0]).toHaveTextContent("★ 4,5");
    expect(within(items[0]).getByText("Note : 4,5 sur 5")).toHaveClass(
      "sr-only",
    );
    expect(items[1]).toHaveTextContent("05/09/2026");
    expect(items[1]).toHaveTextContent("La Cave");
    expect(items[2]).toHaveTextContent("01/08/2026");
    expect(items[2]).toHaveTextContent("Le Zinc");
    expect(items[2]).toHaveTextContent("★ 3");
  });

  it("shows a tasting made near midnight UTC on the day of the phone time zone", () => {
    vi.stubEnv("TZ", "Europe/Paris");
    stubHistory({
      checkins: [buildCheckin({ drankAt: "2026-10-12T23:30:00.000Z" })],
      total: 1,
    });

    renderWithProviders(<CheckinHistory beerId={7} />);

    const item = within(screen.getByRole("list")).getAllByRole("listitem")[0];
    expect(item).toHaveTextContent("13/10/2026");
    expect(item).not.toHaveTextContent("12/10/2026");
  });

  it("lists the tastings without the beer name nor a link, since the page is already the beer", () => {
    renderWithProviders(<CheckinHistory beerId={7} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("list")).getAllByRole("listitem")[0],
    ).not.toHaveTextContent("Orval");
  });

  it("shows nothing for a tasting without a rating", () => {
    renderWithProviders(<CheckinHistory beerId={7} />);

    const item = within(screen.getByRole("list")).getAllByRole("listitem")[1];
    expect(item).not.toHaveTextContent("★");
    expect(within(item).queryByText(/Note :/)).not.toBeInTheDocument();
  });

  it("puts the rating in an amber highlight pill", () => {
    renderWithProviders(<CheckinHistory beerId={7} />);

    const pill = screen.getByText("★ 4,5");
    expect(pill.closest(".bg-highlight")).not.toBeNull();
    expect(pill.closest(".text-highlight-foreground")).not.toBeNull();
  });

  it("formats the date and the rating in English", async () => {
    await act(async () => {
      await i18n.changeLanguage("en");
    });

    renderWithProviders(<CheckinHistory beerId={7} />);

    expect(
      screen.getByRole("heading", { level: 2, name: "My history" }),
    ).toBeInTheDocument();
    const first = within(screen.getByRole("list")).getAllByRole("listitem")[0];
    expect(first).toHaveTextContent("10/12/26");
    expect(first).toHaveTextContent("★ 4.5");
    expect(within(first).getByText("Rating: 4.5 out of 5")).toBeInTheDocument();
  });

  it("lets a long unbroken place wrap", () => {
    const place = "Brasserie-Artisanale-du-Mont-Blanc-".repeat(4);
    stubHistory({ checkins: [buildCheckin({ place })], total: 1 });

    renderWithProviders(<CheckinHistory beerId={7} />);

    expect(screen.getByText(place)).toHaveClass("break-words");
  });

  it("offers Voir plus while a next page exists, and asks for it on press", async () => {
    stubHistory({ hasNextPage: true, total: 25 });
    const user = userEvent.setup();

    renderWithProviders(<CheckinHistory beerId={7} />);
    await user.click(screen.getByRole("button", { name: "Voir plus" }));

    expect(mockHistory.fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("sends a single request for two presses in the same tick", async () => {
    stubHistory({ hasNextPage: true, total: 25 });
    mockHistory.fetchNextPage.mockReturnValue(new Promise(() => undefined));
    const user = userEvent.setup();

    renderWithProviders(<CheckinHistory beerId={7} />);
    await user.dblClick(screen.getByRole("button", { name: "Voir plus" }));

    expect(mockHistory.fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("marks Voir plus pending while the next page loads", () => {
    stubHistory({ hasNextPage: true, isFetchingNextPage: true, total: 25 });

    renderWithProviders(<CheckinHistory beerId={7} />);

    expect(screen.getByRole("button", { name: "Voir plus" })).toHaveAttribute(
      "data-pending",
      "true",
    );
  });

  it("removes Voir plus once every tasting is loaded", () => {
    renderWithProviders(<CheckinHistory beerId={7} />);

    expect(
      screen.queryByRole("button", { name: "Voir plus" }),
    ).not.toBeInTheDocument();
  });

  it("invites to press Je l'ai bue, without a list, when there is no tasting", () => {
    stubHistory({ checkins: [], total: 0 });

    renderWithProviders(<CheckinHistory beerId={7} />);

    const empty = screen.getByText(
      "Pas encore de dégustation : appuyez sur « Je l'ai bue ».",
    );
    expect(empty).toHaveClass("text-muted");
    expect(
      screen.getByRole("heading", { level: 2, name: "Mon historique" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows three row skeletons while loading, with no list, no empty text and no alert", () => {
    stubHistory({ checkins: [], total: 0, isPending: true });

    const { container } = renderWithProviders(<CheckinHistory beerId={7} />);

    expect(container.querySelectorAll(".skeleton")).toHaveLength(3);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Pas encore de dégustation/),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a danger alert with Réessayer on error and retries", async () => {
    stubHistory({ checkins: [], total: 0, isError: true });
    const user = userEvent.setup();

    renderWithProviders(<CheckinHistory beerId={7} />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Impossible de charger votre historique.");
    expect(
      screen.queryByText(/Pas encore de dégustation/),
    ).not.toBeInTheDocument();
    await user.click(within(alert).getByRole("button", { name: "Réessayer" }));
    expect(mockHistory.refetch).toHaveBeenCalledTimes(1);
  });

  it("keeps the loaded tastings and offers Réessayer when loading the next page fails", async () => {
    stubHistory({ isError: true, hasNextPage: true, total: 25 });
    const user = userEvent.setup();

    renderWithProviders(<CheckinHistory beerId={7} />);

    expect(
      within(screen.getByRole("list")).getAllByRole("listitem"),
    ).toHaveLength(3);
    await user.click(
      within(screen.getByRole("alert")).getByRole("button", {
        name: "Réessayer",
      }),
    );
    expect(mockHistory.fetchNextPage).toHaveBeenCalledTimes(1);
    expect(mockHistory.refetch).not.toHaveBeenCalled();
  });

  it("links the venue of a tasting to the map and leaves a free place as text", () => {
    stubHistory({
      checkins: [
        buildCheckin({ id: 2, place: "Delirium Café", venueId: 42 }),
        buildCheckin({ id: 1, place: "Chez moi", venueId: null }),
      ],
    });
    renderWithProviders(<CheckinHistory beerId={7} />);

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByRole("link", { name: "Delirium Café" })).toHaveAttribute("href", "/carte?venue=42");
    expect(within(items[1]).queryByRole("link")).not.toBeInTheDocument();
    expect(within(items[1]).getByText("Chez moi")).toBeInTheDocument();
  });

  it("shows a thumbnail only for the tastings that have a photo", () => {
    stubHistory({
      checkins: [
        buildCheckin({
          id: 3,
          place: "Chez Paul",
          photoId: "0b6f1c1e-6a34-4c8e-9f3a-2f6d7b1c9a10",
        }),
        buildCheckin({ id: 2, place: "La Cave", photoId: null }),
        buildCheckin({
          id: 1,
          place: "Le Zinc",
          photoId: "7c1d2e3f-1a2b-4c3d-8e9f-0a1b2c3d4e5f",
        }),
      ],
    });
    renderWithProviders(<CheckinHistory beerId={7} />);

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(
      within(items[0]).getByRole("img", { name: "Photo de la dégustation" }),
    ).toHaveAttribute(
      "src",
      expect.stringMatching(
        /\/api\/v1\/photos\/0b6f1c1e-6a34-4c8e-9f3a-2f6d7b1c9a10$/,
      ),
    );
    expect(within(items[1]).queryByRole("img")).not.toBeInTheDocument();
    expect(
      within(items[1]).queryByRole("button", { name: "Agrandir la photo" }),
    ).not.toBeInTheDocument();
    expect(
      within(items[2]).getByRole("img", { name: "Photo de la dégustation" }),
    ).toHaveAttribute(
      "src",
      expect.stringMatching(
        /\/api\/v1\/photos\/7c1d2e3f-1a2b-4c3d-8e9f-0a1b2c3d4e5f$/,
      ),
    );
    expect(
      screen.getAllByRole("button", { name: "Agrandir la photo" }),
    ).toHaveLength(2);
  });

  it("opens the tasting photo large in a dialog from the history", async () => {
    const user = userEvent.setup();
    stubHistory({
      checkins: [
        buildCheckin({
          id: 3,
          photoId: "0b6f1c1e-6a34-4c8e-9f3a-2f6d7b1c9a10",
        }),
      ],
    });
    renderWithProviders(<CheckinHistory beerId={7} />);

    await user.click(screen.getByRole("button", { name: "Agrandir la photo" }));

    expect(
      await screen.findByRole("dialog", { name: "Photo de la dégustation" }),
    ).toBeInTheDocument();
  });
});
