import { toast } from "@heroui/react";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";
import { HttpError } from "@/api/httpError";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { VoteButtons } from "@/pages/map/components/elements/voteButtons/voteButtons";
import { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";
import { VoteSenseEnum } from "@/types/enums/venue/voteSenseEnum";
import type { VenueBeer } from "@/types/models/venue/venueBeer";
import { voteVenueBeer } from "@/utils/queryFunctions/venueQueryFunctions";

vi.mock("@heroui/react", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  toast: { success: vi.fn(), danger: vi.fn() },
}));

vi.mock("@/utils/queryFunctions/venueQueryFunctions", () => ({
  voteVenueBeer: vi.fn(),
}));

const NOW = new Date("2026-10-13T12:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;
const COOLDOWN_PATTERN = /Vous pourrez revoter/;

const venueBeer = (overrides: Partial<VenueBeer> = {}): VenueBeer => ({
  beerId: 7,
  beerName: "Houblon Chouffe",
  breweryName: "Chouffe",
  styleName: "Double IPA",
  family: null,
  status: AvailabilityStatusEnum.CONFIRMED,
  lastConfirmedAt: null,
  recentVoterCount: 0,
  nextVoteAt: null,
  ...overrides,
});

const renderButtons = (beer: VenueBeer = venueBeer(), venueId = 12) =>
  renderWithProviders(<VoteButtons venueId={venueId} venueBeer={beer} />);

const stillButton = () => screen.getByRole("button", { name: "Toujours là : Houblon Chouffe" });
const goneButton = () => screen.getByRole("button", { name: "Plus là : Houblon Chouffe" });

describe("VoteButtons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC7 gives each button the name Toujours là : <bière> / Plus là : <bière>, its visible label and a 44 px size", () => {
    renderButtons();

    expect(stillButton()).toHaveTextContent("Toujours là");
    expect(goneButton()).toHaveTextContent("Plus là");
    [stillButton(), goneButton()].forEach((button) => {
      expect(button.className).toContain("button--lg");
      expect(button.className).toContain("min-h-11");
    });
    expect(stillButton().className).toContain("button--secondary");
    expect(goneButton().className).toContain("button--tertiary");
  });

  it("AC7 names the buttons after the beer they are given", () => {
    renderButtons(venueBeer({ beerName: "Orval" }));

    expect(screen.getByRole("button", { name: "Toujours là : Orval" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Plus là : Orval" })).toBeInTheDocument();
  });

  it("enables both buttons and shows no waiting text when the beer was never voted by the user", () => {
    renderButtons();

    expect(stillButton()).toBeEnabled();
    expect(goneButton()).toBeEnabled();
    expect(screen.queryByText(COOLDOWN_PATTERN)).not.toBeInTheDocument();
  });

  it("AC4 disables both buttons and reads Vous pourrez revoter dans 21 h three hours after a vote", () => {
    renderButtons(venueBeer({ nextVoteAt: new Date(NOW.getTime() + 21 * HOUR_MS) }));

    expect(stillButton()).toBeDisabled();
    expect(goneButton()).toBeDisabled();
    expect(screen.getByText("Vous pourrez revoter dans 21 h")).toBeInTheDocument();
  });

  it("AC4 rounds the remaining hours up", () => {
    renderButtons(venueBeer({ nextVoteAt: new Date(NOW.getTime() + 20 * HOUR_MS + 60_000) }));

    expect(screen.getByText("Vous pourrez revoter dans 21 h")).toBeInTheDocument();
  });

  it.each([
    ["1 ms", 1, "Vous pourrez revoter dans 1 h"],
    ["1 minute", 60_000, "Vous pourrez revoter dans 1 h"],
    ["23 h 59", 23 * HOUR_MS + 59 * 60_000, "Vous pourrez revoter dans 24 h"],
  ])("AC4 keeps both buttons disabled when the waiting date is %s away", (_label, remainingMs, text) => {
    renderButtons(venueBeer({ nextVoteAt: new Date(NOW.getTime() + remainingMs) }));

    expect(stillButton()).toBeDisabled();
    expect(goneButton()).toBeDisabled();
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("AC4 does not call the server when a disabled button is pressed", async () => {
    const user = userEvent.setup();
    renderButtons(venueBeer({ nextVoteAt: new Date(NOW.getTime() + 21 * HOUR_MS) }));

    await user.click(stillButton());
    await user.click(goneButton());

    expect(voteVenueBeer).not.toHaveBeenCalled();
  });

  it("AC4 enables the buttons again once the waiting date is reached or past", () => {
    const { unmount } = renderButtons(venueBeer({ nextVoteAt: new Date(NOW.getTime()) }));
    expect(stillButton()).toBeEnabled();
    expect(screen.queryByText(COOLDOWN_PATTERN)).not.toBeInTheDocument();
    unmount();

    renderButtons(venueBeer({ nextVoteAt: new Date(NOW.getTime() - HOUR_MS) }));
    expect(goneButton()).toBeEnabled();
    expect(screen.queryByText(COOLDOWN_PATTERN)).not.toBeInTheDocument();
  });

  it("AC3 sends the still vote of this venue and beer, puts only the pressed button on waiting, then toasts", async () => {
    const user = userEvent.setup();
    let resolveVote: (beer: VenueBeer) => void = () => undefined;
    (voteVenueBeer as Mock).mockImplementation(
      () => new Promise<VenueBeer>((resolve) => { resolveVote = resolve; }),
    );
    renderButtons(venueBeer(), 12);

    await user.click(stillButton());

    expect(voteVenueBeer).toHaveBeenCalledTimes(1);
    expect(voteVenueBeer).toHaveBeenCalledWith(12, 7, VoteSenseEnum.STILL);
    await waitFor(() => expect(stillButton()).toHaveAttribute("data-pending", "true"));
    expect(goneButton()).not.toHaveAttribute("data-pending", "true");
    expect(goneButton()).toBeDisabled();
    expect(toast.success).not.toHaveBeenCalled();

    resolveVote(venueBeer({ nextVoteAt: new Date(NOW.getTime() + 24 * HOUR_MS) }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Vote enregistré"));
    expect(toast.success).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(stillButton()).not.toHaveAttribute("data-pending", "true"));
  });

  it("AC3 sends the gone vote when Plus là is pressed", async () => {
    const user = userEvent.setup();
    (voteVenueBeer as Mock).mockResolvedValue(venueBeer());
    renderButtons(venueBeer(), 5);

    await user.click(goneButton());

    expect(voteVenueBeer).toHaveBeenCalledWith(5, 7, VoteSenseEnum.GONE);
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
  });

  it("sends a single request for a double click", async () => {
    const user = userEvent.setup();
    (voteVenueBeer as Mock).mockImplementation(() => new Promise<VenueBeer>(() => undefined));
    renderButtons();

    await user.dblClick(stillButton());
    await user.click(goneButton());

    expect(voteVenueBeer).toHaveBeenCalledTimes(1);
  });

  it("sends a single request for two presses landing in the same tick", async () => {
    (voteVenueBeer as Mock).mockImplementation(() => new Promise<VenueBeer>(() => undefined));
    renderButtons();

    act(() => {
      fireEvent.click(stillButton());
      fireEvent.click(stillButton());
      fireEvent.click(goneButton());
    });

    await waitFor(() => expect(voteVenueBeer).toHaveBeenCalled());
    expect(voteVenueBeer).toHaveBeenCalledTimes(1);
    expect(voteVenueBeer).toHaveBeenCalledWith(12, 7, VoteSenseEnum.STILL);
  });

  it("AC6 on a failure releases the waiting button, keeps both enabled and shows no success toast", async () => {
    const user = userEvent.setup();
    (voteVenueBeer as Mock).mockRejectedValue(new HttpError(500, "boom"));
    renderButtons();

    await user.click(stillButton());

    await waitFor(() => expect(stillButton()).not.toHaveAttribute("data-pending", "true"));
    expect(stillButton()).toBeEnabled();
    expect(goneButton()).toBeEnabled();
    expect(screen.queryByText(COOLDOWN_PATTERN)).not.toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("lets the user vote again after a failure", async () => {
    const user = userEvent.setup();
    (voteVenueBeer as Mock).mockRejectedValueOnce(new HttpError(500, "boom")).mockResolvedValueOnce(venueBeer());
    renderButtons();

    await user.click(stillButton());
    await waitFor(() => expect(stillButton()).not.toHaveAttribute("data-pending", "true"));
    await user.click(stillButton());

    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    expect(voteVenueBeer).toHaveBeenCalledTimes(2);
  });
});
