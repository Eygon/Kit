import { fireEvent, screen, within } from "@testing-library/react";
import type { Mock } from "vitest";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import CorrectionService from "@/api/corrections/correctionService";
import { VotesPage } from "@/pages/votes/votes";
import { BeerCharacteristicEnum } from "@/types/enums/beer/beerCharacteristicEnum";
import { CorrectionStatusEnum } from "@/types/enums/correction/correctionStatusEnum";
import type { Correction } from "@/types/models/correction/correction";
import type { CorrectionBoard } from "@/types/models/correction/correctionBoard";
import i18n from "@/i18n/i18n";

vi.mock("@/api/corrections/correctionService", () => ({
  default: { getBoard: vi.fn(), vote: vi.fn() },
}));

const buildCorrection = (id: number, overrides: Partial<Correction> = {}): Correction => ({
  id,
  beerId: 100 + id,
  beerName: `Bière ${id}`,
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
  agreeCount: 1,
  disagreeCount: 0,
  myVote: null,
  isMine: false,
  ...overrides,
});

const closed = (id: number, status: CorrectionStatusEnum): Correction =>
  buildCorrection(id, { status, resolvedAt: "2026-10-12T08:00:00.000Z" });

const stubBoard = (board: CorrectionBoard) => (CorrectionService.getBoard as Mock).mockResolvedValue(board);

describe("VotesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("shows the title, the help sentence and a busy skeleton while the board loads", () => {
    (CorrectionService.getBoard as Mock).mockReturnValue(new Promise(() => undefined));

    const { container } = renderWithProviders(<VotesPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Votes" })).toBeInTheDocument();
    expect(screen.getByText("Les corrections proposées sur les fiches techniques, en attente de vote.")).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("AC1 lists the open proposals in the served order, each with its beer link and vote buttons", async () => {
    stubBoard({ open: [buildCorrection(9), buildCorrection(4)], recentlyClosed: [], pendingCount: 2 });

    renderWithProviders(<VotesPage />);

    const links = await screen.findAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Bière 9", "/bieres/109"],
      ["Bière 4", "/bieres/104"],
    ]);
    expect(screen.getAllByRole("button", { name: "D'accord" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Pas d'accord" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /Récemment tranchées/ })).toBeNull();
  });

  it("AC1 keeps the served order of three proposals with different deadlines, soonest first, without sorting them again", async () => {
    stubBoard({
      open: [
        buildCorrection(7, { closesAt: "2026-10-16T10:00:00.000Z" }),
        buildCorrection(3, { closesAt: "2026-10-18T10:00:00.000Z" }),
        buildCorrection(8, { closesAt: "2026-10-20T10:00:00.000Z" }),
      ],
      recentlyClosed: [],
      pendingCount: 3,
    });

    renderWithProviders(<VotesPage />);

    const links = await screen.findAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Bière 7", "Bière 3", "Bière 8"]);
  });

  it("AC2 keeps the decided proposals in a closed disclosure with their count", async () => {
    stubBoard({
      open: [buildCorrection(1)],
      recentlyClosed: [closed(21, CorrectionStatusEnum.ACCEPTED), closed(22, CorrectionStatusEnum.REJECTED), closed(23, CorrectionStatusEnum.ACCEPTED)],
      pendingCount: 1,
    });

    renderWithProviders(<VotesPage />);

    const trigger = await screen.findByRole("button", { name: "Récemment tranchées (3)" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Bière 21")).not.toBeVisible();
  });

  it("puts the folded section under the page title as a level 2 heading, without skipping a level (axe heading-order)", async () => {
    stubBoard({ open: [buildCorrection(1)], recentlyClosed: [closed(21, CorrectionStatusEnum.ACCEPTED)], pendingCount: 1 });

    renderWithProviders(<VotesPage />);

    expect(await screen.findByRole("heading", { level: 2, name: "Récemment tranchées (1)" })).toBeInTheDocument();
  });

  it("AC2 shows up to ten decided cards marked Validée or Refusée without vote buttons once unfolded", async () => {
    const recentlyClosed = Array.from({ length: 10 }, (_, index) =>
      closed(30 + index, index % 2 === 0 ? CorrectionStatusEnum.ACCEPTED : CorrectionStatusEnum.REJECTED),
    );
    stubBoard({ open: [buildCorrection(1)], recentlyClosed, pendingCount: 1 });

    renderWithProviders(<VotesPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Récemment tranchées (10)" }));

    const decidedLinks = recentlyClosed.map(({ beerName }) => screen.getByRole("link", { name: beerName }));
    expect(decidedLinks).toHaveLength(10);
    decidedLinks.forEach((link) => expect(link).toBeVisible());
    expect(screen.getAllByText("Validée")).toHaveLength(5);
    expect(screen.getAllByText("Refusée")).toHaveLength(5);
    expect(screen.getAllByRole("button", { name: "D'accord" })).toHaveLength(1);
    expect(screen.getAllByText("Tranchée le 12/10/2026")).toHaveLength(10);
  });

  it("AC3 explains an empty board with the mascot panel when nothing is open", async () => {
    stubBoard({ open: [], recentlyClosed: [], pendingCount: 0 });

    renderWithProviders(<VotesPage />);

    expect(await screen.findByRole("heading", { level: 2, name: "Aucun vote en cours" })).toBeInTheDocument();
    expect(screen.getByText("Proposez une correction depuis la fiche d'une bière.")).toBeInTheDocument();
    expect(document.querySelector('[data-slot="mascot"][data-mood="searching"]')).not.toBeNull();
    expect(screen.queryByRole("button", { name: "D'accord" })).toBeNull();
  });

  it("AC3 still offers the decided proposals when nothing is open", async () => {
    stubBoard({ open: [], recentlyClosed: [closed(21, CorrectionStatusEnum.ACCEPTED)], pendingCount: 0 });

    renderWithProviders(<VotesPage />);

    expect(await screen.findByText("Aucun vote en cours")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Récemment tranchées (1)" })).toBeInTheDocument();
  });

  it("AC4 shows an alert with a retry button on error, and recovers on retry", async () => {
    (CorrectionService.getBoard as Mock)
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValue({ open: [buildCorrection(5)], recentlyClosed: [], pendingCount: 1 });

    renderWithProviders(<VotesPage />);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Impossible de charger les votes.")).toBeInTheDocument();
    expect(screen.queryByText("Aucun vote en cours")).toBeNull();
    fireEvent.click(within(alert).getByRole("button", { name: "Réessayer" }));

    expect(await screen.findByRole("link", { name: "Bière 5" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(CorrectionService.getBoard).toHaveBeenCalledTimes(2);
  });

  it("writes the page in English", async () => {
    await i18n.changeLanguage("en");
    stubBoard({ open: [], recentlyClosed: [closed(21, CorrectionStatusEnum.REJECTED)], pendingCount: 0 });

    renderWithProviders(<VotesPage />);

    expect(await screen.findByText("No vote in progress")).toBeInTheDocument();
    expect(screen.getByText("Corrections suggested on technical sheets, waiting for votes.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recently decided (1)" })).toBeInTheDocument();
  });
});
