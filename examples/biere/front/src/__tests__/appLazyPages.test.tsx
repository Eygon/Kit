import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "@/app";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const mapChunk = vi.hoisted(() => {
  const chunk = {
    downloads: 0,
    gate: Promise.resolve(),
    settle: ((): void => undefined) as (outcome: "resolve" | "reject") => void,
    arm: () => {
      chunk.gate = new Promise<void>((resolve, reject) => {
        chunk.settle = (outcome) => (outcome === "resolve" ? resolve() : reject(new Error("chunk failed")));
      });
    },
  };
  return chunk;
});

vi.mock("@/hooks/corrections/useCorrectionBoardQuery", () => ({
  useCorrectionBoardQuery: () => ({
    board: { open: [], recentlyClosed: [], pendingCount: 0 },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/pages/journal/hooks/useJournalQuery", () => ({
  useJournalQuery: () => ({
    checkins: [],
    total: 0,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
}));

vi.mock("@/pages/map/map", async () => {
  mapChunk.downloads += 1;
  await mapChunk.gate;
  return { MapPage: () => <h1>Carte</h1> };
});

const getTab = (name: string) => screen.getByRole("link", { name });

describe("App lazy pages", () => {
  beforeEach(() => {
    mapChunk.downloads = 0;
    mapChunk.arm();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("keeps the tab bar with the Map tab current and no blank screen when the /carte chunk fails", async () => {
    renderWithProviders(<App />, { initialPath: "/carte" });
    expect(screen.getByRole("status")).toHaveTextContent("Chargement de la page…");

    await act(async () => mapChunk.settle("reject"));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(getTab("Carte")).toHaveAttribute("aria-current", "page");
    expect(getTab("Accueil")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "Carte" })).not.toBeInTheDocument();
  });

  it("shows the new page, never the abandoned one nor its failure, when the tab changes while the chunk is pending and it fails late", async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, { initialPath: "/carte" });
    expect(screen.getByRole("status")).toBeInTheDocument();

    await user.click(getTab("Journal"));
    await act(async () => mapChunk.settle("reject"));

    expect(screen.getByRole("heading", { level: 1, name: "Journal" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "Carte" })).not.toBeInTheDocument();

    mapChunk.arm();
    await user.click(getTab("Carte"));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    await act(async () => mapChunk.settle("resolve"));
    expect(await screen.findByRole("heading", { level: 1, name: "Carte" })).toBeInTheDocument();
    expect(mapChunk.downloads).toBe(2);
  });
});
