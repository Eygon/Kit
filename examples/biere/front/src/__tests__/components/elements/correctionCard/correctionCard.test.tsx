import { toast } from "@heroui/react";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";
import { HttpError } from "@/api/httpError";
import { createTestQueryClient, renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { CorrectionCard } from "@/components/elements/correctionCard/correctionCard";
import i18n from "@/i18n/i18n";
import { BeerCharacteristicEnum } from "@/types/enums/beer/beerCharacteristicEnum";
import { CorrectionVoteSenseEnum } from "@/types/enums/correction/correctionVoteSenseEnum";
import { CorrectionStatusEnum } from "@/types/enums/correction/correctionStatusEnum";
import type { Correction } from "@/types/models/correction/correction";
import { voteCorrection } from "@/utils/queryFunctions/correctionQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { correctionKeys } from "@/utils/queryKeys/correctionQueryKeys";

vi.mock("@heroui/react", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  toast: { success: vi.fn(), danger: vi.fn() },
}));

vi.mock("@/utils/queryFunctions/correctionQueryFunctions", () => ({
  voteCorrection: vi.fn(),
}));

const CORRECTION: Correction = {
  id: 5,
  beerId: 7,
  beerName: "Chimay Rouge",
  characteristic: BeerCharacteristicEnum.IBU,
  currentValue: null,
  proposedValue: 35,
  reason: "Fiche du brasseur",
  proposedBy: 2,
  proposedByName: "Bob",
  createdAt: "2026-10-10T10:00:00.000Z",
  closesAt: "2026-10-17T10:00:00.000Z",
  status: CorrectionStatusEnum.OPEN,
  resolvedAt: null,
  agreeCount: 2,
  disagreeCount: 1,
  myVote: null,
  isMine: false,
};

const renderCard = (overrides: Partial<Correction> = {}) =>
  renderWithProviders(<CorrectionCard correction={{ ...CORRECTION, ...overrides }} />);

describe("CorrectionCard", () => {
  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("US11 AC1 shows the change, the author, the reason and the tally", () => {
    renderCard();

    expect(screen.getByText("Non renseignée → 35 IBU")).toBeInTheDocument();
    expect(screen.getByText("Proposée par Bob")).toBeInTheDocument();
    expect(screen.getByText("Fiche du brasseur")).toBeInTheDocument();
    expect(screen.getByText("2 d'accord · 1 pas d'accord")).toBeInTheDocument();
  });

  it("US11 AC1 draws a mousse card that wraps the reason", () => {
    const { container } = renderCard({ reason: "Ligne 1\nLigne 2" });

    expect(container.firstElementChild).toHaveClass("rounded-mousse", "border-mousse", "bg-surface", "p-3");
    const reason = screen.getByText(/Ligne 1/);
    expect(reason).toHaveClass("whitespace-pre-line", "break-words");
    expect(reason.textContent).toBe("Ligne 1\nLigne 2");
  });

  it("US11 writes the change of a list and of a scale with their labels", () => {
    renderCard({ characteristic: BeerCharacteristicEnum.AROMAS, currentValue: ["fruity"], proposedValue: ["fruity", "hoppy"] });

    expect(screen.getByText("Fruité → Fruité, Houblonné")).toBeInTheDocument();
  });

  it("US11 writes the change of a scale with the score and the label of each level", () => {
    renderCard({ characteristic: BeerCharacteristicEnum.BODY, currentValue: 4, proposedValue: 2 });

    expect(screen.getByText("4 / 5 · Rond → 2 / 5 · Léger")).toBeInTheDocument();
  });

  it("US11 AC1 writes the tally and the author in English", async () => {
    await i18n.changeLanguage("en");
    renderCard({ agreeCount: 1, disagreeCount: 0 });

    expect(screen.getByText("Suggested by Bob")).toBeInTheDocument();
    expect(screen.getByText("1 agree · 0 disagree")).toBeInTheDocument();
    expect(screen.getByText("Not provided → 35 IBU")).toBeInTheDocument();
  });

  it("US11 hides the reason when it is empty", () => {
    const { container } = renderCard({ reason: "" });

    expect(container.querySelectorAll("p")).toHaveLength(3);
    expect(container.querySelector(".whitespace-pre-line")).toBeNull();
  });

  it("US11 AC4 shows a reason made of HTML as plain text", () => {
    const { container } = renderCard({ reason: "<b>gras</b><img src=x onerror=alert(1)>" });

    expect(screen.getByText("<b>gras</b><img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("US11 lets a long name wrap instead of overflowing", () => {
    const name = "Brasseur-".repeat(20);
    renderCard({ proposedByName: name });

    expect(screen.getByText(`Proposée par ${name}`)).toHaveClass("break-words");
  });
});

const NOW = new Date("2026-10-14T12:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const closingIn = (milliseconds: number) => new Date(NOW.getTime() + milliseconds).toISOString();

const agreeButton = () => screen.getByRole("button", { name: "D'accord" });
const disagreeButton = () => screen.getByRole("button", { name: "Pas d'accord" });

describe("CorrectionCard vote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });

  afterEach(async () => {
    vi.useRealTimers();
    await i18n.changeLanguage("fr");
  });

  it("US12 AC4 reads clôture dans 3 jours for a deadline in 3 days and 2 hours", () => {
    renderCard({ closesAt: closingIn(3 * DAY_MS + 2 * HOUR_MS) });

    expect(screen.getByText("clôture dans 3 jours")).toBeInTheDocument();
  });

  it("US12 AC4 reads clôture dans 5 heures for a deadline in 5 hours", () => {
    renderCard({ closesAt: closingIn(5 * HOUR_MS) });

    expect(screen.getByText("clôture dans 5 heures")).toBeInTheDocument();
  });

  it("US12 AC4 reads the deadline in English", async () => {
    await i18n.changeLanguage("en");
    renderCard({ closesAt: closingIn(5 * HOUR_MS) });

    expect(screen.getByText("closes in 5 hours")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agree" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disagree" })).toBeInTheDocument();
  });

  it("US12 AC1 draws the two vote buttons at the 44 px size, none of them pressed before a vote", () => {
    renderCard();

    [agreeButton(), disagreeButton()].forEach((button) => {
      expect(button.className).toContain("button--lg");
      expect(button).toHaveAttribute("aria-pressed", "false");
    });
  });

  it("US12 AC1 sends the agree vote of this correction, marks only that button as pending, then toasts", async () => {
    const user = userEvent.setup();
    let resolveVote: (correction: Correction) => void = () => undefined;
    (voteCorrection as Mock).mockImplementation(
      () => new Promise<Correction>((resolve) => { resolveVote = resolve; }),
    );
    renderCard();

    await user.click(agreeButton());

    expect(voteCorrection).toHaveBeenCalledTimes(1);
    expect(voteCorrection).toHaveBeenCalledWith(5, CorrectionVoteSenseEnum.AGREE);
    await waitFor(() => expect(agreeButton()).toHaveAttribute("data-pending", "true"));
    expect(disagreeButton()).not.toHaveAttribute("data-pending", "true");
    expect(disagreeButton()).toBeDisabled();
    expect(toast.success).not.toHaveBeenCalled();

    resolveVote({ ...CORRECTION, myVote: CorrectionVoteSenseEnum.AGREE });

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Vote enregistré"));
    expect(toast.success).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(agreeButton()).not.toHaveAttribute("data-pending", "true"));
  });

  it("US12 AC1 marks the chosen button as pressed and the other as not", () => {
    renderCard({ myVote: CorrectionVoteSenseEnum.AGREE });

    expect(agreeButton()).toHaveAttribute("aria-pressed", "true");
    expect(disagreeButton()).toHaveAttribute("aria-pressed", "false");
  });

  it("US12 AC1 shows the new counters and the new choice once the correction is refreshed", () => {
    const { rerender } = renderCard();
    expect(screen.getByText("2 d'accord · 1 pas d'accord")).toBeInTheDocument();

    rerender(<CorrectionCard correction={{ ...CORRECTION, agreeCount: 3, myVote: CorrectionVoteSenseEnum.AGREE }} />);

    expect(screen.getByText("3 d'accord · 1 pas d'accord")).toBeInTheDocument();
    expect(agreeButton()).toHaveAttribute("aria-pressed", "true");
  });

  it("US12 AC2 sends the disagree vote when Alice who agreed presses Pas d'accord", async () => {
    const user = userEvent.setup();
    (voteCorrection as Mock).mockResolvedValue({ ...CORRECTION, myVote: CorrectionVoteSenseEnum.DISAGREE });
    renderCard({ myVote: CorrectionVoteSenseEnum.AGREE });

    await user.click(disagreeButton());

    expect(voteCorrection).toHaveBeenCalledTimes(1);
    expect(voteCorrection).toHaveBeenCalledWith(5, CorrectionVoteSenseEnum.DISAGREE);
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
  });

  it("US12 AC3 reads Votre proposition and shows no vote button on a suggestion of the user", () => {
    renderCard({ isMine: true });

    expect(screen.getByText("Votre proposition")).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("US12 AC3 reads Your suggestion in English", async () => {
    await i18n.changeLanguage("en");
    renderCard({ isMine: true });

    expect(screen.getByText("Your suggestion")).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("US12 AC3 shows no Votre proposition on a suggestion of someone else", () => {
    renderCard();

    expect(screen.queryByText("Votre proposition")).not.toBeInTheDocument();
  });

  it("US12 AC5 sends a single request for a double click", async () => {
    const user = userEvent.setup();
    (voteCorrection as Mock).mockImplementation(() => new Promise<Correction>(() => undefined));
    renderCard();

    await user.dblClick(agreeButton());
    await user.click(disagreeButton());

    expect(voteCorrection).toHaveBeenCalledTimes(1);
  });

  it("US12 AC5 sends a single request for presses landing in the same tick", async () => {
    (voteCorrection as Mock).mockImplementation(() => new Promise<Correction>(() => undefined));
    renderCard();

    act(() => {
      fireEvent.click(agreeButton());
      fireEvent.click(agreeButton());
      fireEvent.click(disagreeButton());
    });

    await waitFor(() => expect(voteCorrection).toHaveBeenCalled());
    expect(voteCorrection).toHaveBeenCalledTimes(1);
    expect(voteCorrection).toHaveBeenCalledWith(5, CorrectionVoteSenseEnum.AGREE);
  });

  it("US12 AC5 on a refusal releases the buttons, shows no success toast and refreshes the corrections", async () => {
    const user = userEvent.setup();
    (voteCorrection as Mock).mockRejectedValue(new HttpError(409, "Conflict"));
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    renderWithProviders(<CorrectionCard correction={CORRECTION} />, { queryClient });

    await user.click(agreeButton());

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: correctionKeys.all() }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: beerKeys.all() });
    await waitFor(() => expect(agreeButton()).not.toHaveAttribute("data-pending", "true"));
    expect(agreeButton()).toBeEnabled();
    expect(disagreeButton()).toBeEnabled();
    expect(toast.success).not.toHaveBeenCalled();

    await user.click(disagreeButton());

    expect(voteCorrection).toHaveBeenCalledTimes(2);
    expect(voteCorrection).toHaveBeenLastCalledWith(5, CorrectionVoteSenseEnum.DISAGREE);
  });
});

describe("CorrectionCard US14", () => {
  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("AC1 shows the beer name as a link to its page and the characteristic name above the change", () => {
    renderWithProviders(<CorrectionCard correction={CORRECTION} isBeerShown />);

    const link = screen.getByRole("link", { name: "Chimay Rouge" });
    expect(link).toHaveAttribute("href", "/bieres/7");
    expect(link).toHaveClass("min-h-11");
    expect(screen.getByText("Amertume")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "D'accord" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pas d'accord" })).toBeInTheDocument();
  });

  it("shows neither the beer link nor the characteristic name by default", () => {
    renderCard();

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByText("Amertume")).toBeNull();
  });

  it("lets a long beer name wrap", () => {
    const name = "Brasserie-".repeat(15);
    renderWithProviders(<CorrectionCard correction={{ ...CORRECTION, beerName: name }} isBeerShown />);

    expect(screen.getByRole("link", { name })).toHaveClass("break-words");
  });

  it.each([
    [CorrectionStatusEnum.ACCEPTED, "Validée"],
    [CorrectionStatusEnum.REJECTED, "Refusée"],
  ])("AC2 marks a %s proposal with its chip, its resolution date and no vote button", (status, label) => {
    renderCard({ status, resolvedAt: "2026-10-12T08:00:00.000Z" });

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText("Tranchée le 12/10/2026")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText("Votre proposition")).toBeNull();
    expect(screen.queryByText(/clôture/)).toBeNull();
  });

  it("AC2 keeps the vote buttons out of a decided proposal even when it is mine", () => {
    renderCard({ status: CorrectionStatusEnum.ACCEPTED, resolvedAt: "2026-10-12T08:00:00.000Z", isMine: true });

    expect(screen.queryByText("Votre proposition")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("writes the status and the resolution date in English", async () => {
    await i18n.changeLanguage("en");
    renderCard({ status: CorrectionStatusEnum.REJECTED, resolvedAt: "2026-10-12T08:00:00.000Z" });

    expect(screen.getByText("Rejected")).toBeInTheDocument();
    expect(screen.getByText("Decided on 10/12/26")).toBeInTheDocument();
  });

  it("shows no status chip and no resolution date on an open proposal", () => {
    renderCard();

    expect(screen.queryByText("Validée")).toBeNull();
    expect(screen.queryByText("Refusée")).toBeNull();
    expect(screen.queryByText(/Tranchée le/)).toBeNull();
    expect(screen.getByText(/clôture/)).toBeInTheDocument();
  });
});
