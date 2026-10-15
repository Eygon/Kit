import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";
import CorrectionService from "@/api/corrections/correctionService";
import { CorrectionCard } from "@/components/elements/correctionCard/correctionCard";
import { BottomTabBar } from "@/components/widgets/bottomTabBar/bottomTabBar";
import type { useCorrectionBoardQuery } from "@/hooks/corrections/useCorrectionBoardQuery";
import { BeerCharacteristicEnum } from "@/types/enums/beer/beerCharacteristicEnum";
import { CorrectionStatusEnum } from "@/types/enums/correction/correctionStatusEnum";
import { CorrectionVoteSenseEnum } from "@/types/enums/correction/correctionVoteSenseEnum";
import type { Correction } from "@/types/models/correction/correction";
import { correctionKeys } from "@/utils/queryKeys/correctionQueryKeys";
import { createTestQueryClient, renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const mockBoard = vi.hoisted(() => ({ useCorrectionBoardQuery: vi.fn() }));

vi.mock("@/hooks/corrections/useCorrectionBoardQuery", () => mockBoard);

vi.mock("@/api/corrections/correctionService", () => ({
  default: { getBoard: vi.fn(), vote: vi.fn() },
}));

const stubBoard = (pendingCount: number, state: { isPending?: boolean; isError?: boolean } = {}) =>
  mockBoard.useCorrectionBoardQuery.mockReturnValue({
    board: { open: [], recentlyClosed: [], pendingCount },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
    ...state,
  });

describe("BottomTabBar", () => {
  beforeEach(() => {
    stubBoard(0);
  });

  it("renders a labelled navigation with the six translated tabs", () => {
    renderWithProviders(<BottomTabBar />);

    const nav = screen.getByRole("navigation", { name: "Navigation principale" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Accueil", "Bières", "Carte", "Journal", "Votes", "Profil"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/", "/bieres", "/carte", "/journal", "/votes", "/profil"]);
  });

  it("marks only the tab of the current route", () => {
    renderWithProviders(<BottomTabBar />, { initialPath: "/journal" });

    expect(screen.getByRole("link", { name: "Journal" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Bières" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Accueil" })).not.toHaveAttribute("aria-current");
  });

  it("marks only the Home tab on the root path", () => {
    renderWithProviders(<BottomTabBar />, { initialPath: "/" });

    const nav = screen.getByRole("navigation");
    const current = within(nav)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual(["Accueil"]);
  });

  it("marks only the Beers tab on the encyclopedia path", () => {
    renderWithProviders(<BottomTabBar />, { initialPath: "/bieres" });

    const nav = screen.getByRole("navigation");
    const current = within(nav)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual(["Bières"]);
  });

  it.each(["/profils", "/profils/3"])("keeps the Profile tab current on %s and no other", (path) => {
    renderWithProviders(<BottomTabBar />, { initialPath: path });

    const nav = screen.getByRole("navigation");
    const current = within(nav)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual(["Profil"]);
  });

  it("keeps the Beers tab current on a beer sheet and no other", () => {
    renderWithProviders(<BottomTabBar />, { initialPath: "/bieres/12" });

    const nav = screen.getByRole("navigation");
    const current = within(nav)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual(["Bières"]);
  });

  it("gives each of the six tabs at least 44 px of height and a shrinkable width", () => {
    renderWithProviders(<BottomTabBar />);

    const items = within(screen.getByRole("navigation")).getAllByRole("listitem");
    expect(items).toHaveLength(6);
    items.forEach((item) => expect(item.className).toContain("min-w-0"));
    within(screen.getByRole("navigation"))
      .getAllByRole("link")
      .forEach((link) => {
        expect(link.className).toContain("min-h-14");
        expect(link.querySelector("span")?.className).toContain("truncate");
      });
  });

  it("marks only the Votes tab on /votes", () => {
    renderWithProviders(<BottomTabBar />, { initialPath: "/votes" });

    const current = within(screen.getByRole("navigation"))
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual(["Votes"]);
  });

  it("shows a 3 badge announced as 3 pending votes on the Votes tab only", () => {
    stubBoard(3);
    renderWithProviders(<BottomTabBar />);

    const votes = screen.getByRole("link", { name: "Votes, 3 votes en attente" });
    expect(votes).toHaveAttribute("href", "/votes");
    expect(within(votes).getByText("3").closest("[aria-hidden='true']")).not.toBeNull();
    expect(within(screen.getByRole("navigation")).getAllByText("3")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Journal" })).toHaveTextContent(/^Journal$/);
  });

  it("announces the singular for one pending vote", () => {
    stubBoard(1);
    renderWithProviders(<BottomTabBar />);

    expect(screen.getByRole("link", { name: "Votes, 1 vote en attente" })).toBeInTheDocument();
  });

  it("shows no badge when nothing is pending", () => {
    stubBoard(0);
    renderWithProviders(<BottomTabBar />);

    expect(screen.getByRole("link", { name: "Votes" })).toHaveTextContent(/^Votes$/);
  });

  it("shows no badge while the board loads, even with a count", () => {
    stubBoard(3, { isPending: true });
    renderWithProviders(<BottomTabBar />);

    expect(screen.getByRole("link", { name: "Votes" })).toHaveTextContent(/^Votes$/);
  });

  it("shows no badge when the board is in error, even with a count", () => {
    stubBoard(3, { isError: true });
    renderWithProviders(<BottomTabBar />);

    expect(screen.getByRole("link", { name: "Votes" })).toHaveTextContent(/^Votes$/);
  });

  // jsdom does not lay anything out: the 360 px width itself is checked by hand, not here.
  it("uses the tight gap and padding that leave room for six labels, and keeps the count badge inside the Votes tab", () => {
    stubBoard(3);
    renderWithProviders(<BottomTabBar />);

    const votes = screen.getByRole("link", { name: "Votes, 3 votes en attente" });
    const badge = within(votes).getByText("3").closest("[data-slot='badge']") as HTMLElement;
    expect(badge.closest("[data-slot='badge-anchor']")).not.toBeNull();
    expect(votes.contains(badge)).toBe(true);

    const list = within(screen.getByRole("navigation")).getByRole("list");
    expect(list.className).toContain("gap-1");
    expect(list.className).not.toContain("gap-1.5");
    expect(list.className).toContain("px-1");
    expect(list.className).not.toContain("px-2");
  });

  it("updates the badge from the real board query once a vote invalidates the corrections", async () => {
    const actual = await vi.importActual<{ useCorrectionBoardQuery: typeof useCorrectionBoardQuery }>(
      "@/hooks/corrections/useCorrectionBoardQuery",
    );
    mockBoard.useCorrectionBoardQuery.mockImplementation(actual.useCorrectionBoardQuery);
    (CorrectionService.getBoard as Mock)
      .mockResolvedValueOnce({ open: [], recentlyClosed: [], pendingCount: 3 })
      .mockResolvedValue({ open: [], recentlyClosed: [], pendingCount: 2 });
    const queryClient = createTestQueryClient();
    renderWithProviders(<BottomTabBar />, { queryClient });

    expect(await screen.findByRole("link", { name: "Votes, 3 votes en attente" })).toBeInTheDocument();

    await act(() => queryClient.invalidateQueries({ queryKey: correctionKeys.all() }));

    expect(await screen.findByRole("link", { name: "Votes, 2 votes en attente" })).toBeInTheDocument();
    expect(within(screen.getByRole("navigation")).queryByText("3")).not.toBeInTheDocument();
  });

  it("US15 AC5 drops the badge from 3 to 2 once a vote on a card succeeds, through the real board query and vote mutation", async () => {
    const user = userEvent.setup();
    const actual = await vi.importActual<{ useCorrectionBoardQuery: typeof useCorrectionBoardQuery }>(
      "@/hooks/corrections/useCorrectionBoardQuery",
    );
    mockBoard.useCorrectionBoardQuery.mockImplementation(actual.useCorrectionBoardQuery);
    const correction: Correction = {
      id: 5,
      beerId: 7,
      beerName: "Chimay Rouge",
      characteristic: BeerCharacteristicEnum.IBU,
      currentValue: null,
      proposedValue: 35,
      reason: "",
      proposedBy: 2,
      proposedByName: "Bob",
      createdAt: "2026-10-10T10:00:00.000Z",
      closesAt: "2026-10-17T10:00:00.000Z",
      status: CorrectionStatusEnum.OPEN,
      resolvedAt: null,
      agreeCount: 0,
      disagreeCount: 0,
      myVote: null,
      isMine: false,
    };
    (CorrectionService.getBoard as Mock)
      .mockResolvedValueOnce({ open: [correction], recentlyClosed: [], pendingCount: 3 })
      .mockResolvedValue({ open: [correction], recentlyClosed: [], pendingCount: 2 });
    (CorrectionService.vote as Mock).mockResolvedValue({ ...correction, myVote: CorrectionVoteSenseEnum.AGREE });
    renderWithProviders(
      <>
        <CorrectionCard correction={correction} />
        <BottomTabBar />
      </>,
    );
    expect(await screen.findByRole("link", { name: "Votes, 3 votes en attente" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "D'accord" }));

    expect(CorrectionService.vote).toHaveBeenCalledWith(5, CorrectionVoteSenseEnum.AGREE);
    expect(await screen.findByRole("link", { name: "Votes, 2 votes en attente" })).toBeInTheDocument();
  });

  it("stays fixed at the bottom above the safe area", () => {
    renderWithProviders(<BottomTabBar />);

    const nav = screen.getByRole("navigation");
    expect(nav.className).toContain("fixed");
    expect(nav.className).toContain("bottom-0");
    expect(nav.className).toContain("pb-[env(safe-area-inset-bottom)]");
  });

  it("sits on a cream surface under a 2px ink rule, without a blurred shadow", () => {
    renderWithProviders(<BottomTabBar />);

    const nav = screen.getByRole("navigation");
    expect(nav.className).toContain("bg-surface");
    expect(nav.className).toContain("border-t-mousse");
    expect(nav.className).not.toMatch(/shadow-(surface|sm|md|lg|xl)/);
  });
});
