import { toast } from "@heroui/react";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTestQueryClient, renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import i18n from "@/i18n/i18n";
import { ProposeCorrectionSheet } from "@/pages/beerDetail/components/widgets/proposeCorrectionSheet/proposeCorrectionSheet";
import type { ProposeCorrectionSheetProps } from "@/pages/beerDetail/types/proposeCorrectionSheet";
import { BeerCharacteristicEnum } from "@/types/enums/beer/beerCharacteristicEnum";
import { BEER_CORRECTIONS } from "@/utils/apiURL/apiURL";
import { correctionKeys } from "@/utils/queryKeys/correctionQueryKeys";

vi.mock("@heroui/react", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  toast: { success: vi.fn(), danger: vi.fn() },
}));

const mockFetch = vi.fn();
const scrollIntoView = vi.fn();

const createdDto = {
  id: 11,
  beerId: 7,
  beerName: "Chimay Rouge",
  characteristic: "ibu",
  currentValue: null,
  proposedValue: 35,
  reason: "Fiche du brasseur",
  proposedBy: 1,
  proposedByName: "Alice",
  createdAt: "2026-10-10T10:00:00.000Z",
  closesAt: "2026-10-17T10:00:00.000Z",
  status: "open",
  resolvedAt: null,
  agreeCount: 1,
  disagreeCount: 0,
  myVote: null,
  isMine: true,
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const postedBodies = () =>
  mockFetch.mock.calls
    .filter(([, init]) => (init as RequestInit).method === "POST")
    .map(([, init]) => JSON.parse((init as RequestInit).body as string) as Record<string, unknown>);

const renderSheet = (overrides: Partial<ProposeCorrectionSheetProps> = {}) => {
  const queryClient = createTestQueryClient();
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const props: ProposeCorrectionSheetProps = {
    beerId: 7,
    characteristic: BeerCharacteristicEnum.IBU,
    currentValue: null,
    ...overrides,
  };
  return { ...renderWithProviders(<ProposeCorrectionSheet {...props} />, { queryClient }), invalidate };
};

const trigger = (name = "Proposer une correction : Amertume") => screen.getByRole("button", { name });
const dialog = () => screen.getByRole("dialog");
const valueField = () => within(dialog()).getByRole("textbox", { name: /Amertume/ });
const reasonField = () => within(dialog()).getByRole("textbox", { name: /Motif/ });
const submitButton = () => within(dialog()).getByRole("button", { name: "Proposer" });

type User = ReturnType<typeof userEvent.setup>;

const openSheet = async (user: User) => {
  await user.click(trigger());
  await screen.findByRole("dialog");
};

const fill = async (user: User, value: string, reason = "") => {
  await user.type(valueField(), value);
  if (reason !== "") await user.type(reasonField(), reason);
  await user.tab();
};

describe("ProposeCorrectionSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, writable: true, value: scrollIntoView });
    mockFetch.mockImplementation(async () => json(createdDto, 201));
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await i18n.changeLanguage("fr");
  });

  it("shows only the trigger, named after the characteristic, while the sheet is closed", () => {
    renderSheet();

    expect(trigger()).toHaveTextContent("Proposer une correction");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens a sheet titled with the characteristic and showing the current value", async () => {
    const user = userEvent.setup();
    renderSheet({ currentValue: 35 });
    await openSheet(user);

    expect(within(dialog()).getByRole("heading", { name: "Corriger : Amertume" })).toBeInTheDocument();
    expect(within(dialog()).getByText("Valeur actuelle : 35 IBU")).toBeInTheDocument();
  });

  it("says the current value is not provided when there is none", async () => {
    const user = userEvent.setup();
    renderSheet({ currentValue: null });
    await openSheet(user);

    expect(within(dialog()).getByText("Valeur actuelle : Non renseignée")).toBeInTheDocument();
  });

  it("US13 AC1 sends the typed value and reason, closes the sheet, confirms and refreshes the corrections", async () => {
    const user = userEvent.setup();
    const { invalidate } = renderSheet();
    await openSheet(user);
    await fill(user, "35", "Fiche du brasseur");

    await user.click(submitButton());

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect((mockFetch.mock.calls[0] as [string, RequestInit])[0]).toBe(BEER_CORRECTIONS(7));
    expect(postedBodies()).toEqual([{ characteristic: "ibu", value: 35, reason: "Fiche du brasseur" }]);
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Proposition envoyée au vote");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: correctionKeys.all() });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("sends an empty reason when none is typed, and trims the one typed", async () => {
    const user = userEvent.setup();
    renderSheet();
    await openSheet(user);
    await fill(user, "35", "  motif  ");
    await user.click(submitButton());
    await waitFor(() => expect(postedBodies()).toHaveLength(1));
    expect(postedBodies()[0]).toEqual({ characteristic: "ibu", value: 35, reason: "motif" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await openSheet(user);
    await fill(user, "40");
    await user.click(submitButton());
    await waitFor(() => expect(postedBodies()).toHaveLength(2));
    expect(postedBodies()[1]).toEqual({ characteristic: "ibu", value: 40, reason: "" });
  });

  it("US13 AC1 reopens on an empty form after a success", async () => {
    const user = userEvent.setup();
    renderSheet();
    await openSheet(user);
    await fill(user, "35", "Fiche du brasseur");
    await user.click(submitButton());
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await openSheet(user);

    expect(valueField()).toHaveValue("");
    expect(reasonField()).toHaveValue("");
    expect(within(dialog()).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("forgets what was typed when the sheet is closed without sending", async () => {
    const user = userEvent.setup();
    renderSheet();
    await openSheet(user);
    await fill(user, "35", "brouillon");
    await user.click(within(dialog()).getByRole("button", { name: "Fermer" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await openSheet(user);

    expect(valueField()).toHaveValue("");
    expect(reasonField()).toHaveValue("");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("US13 AC5 shows no error before the first submit", async () => {
    const user = userEvent.setup();
    renderSheet({ currentValue: 35 });
    await openSheet(user);
    await fill(user, "35");

    expect(within(dialog()).queryByText("C'est déjà la valeur actuelle")).not.toBeInTheDocument();
    expect(within(dialog()).queryByText("Valeur obligatoire")).not.toBeInTheDocument();
  });

  it("US13 AC5 shows the required error under the field and sends nothing when the value is empty", async () => {
    const user = userEvent.setup();
    renderSheet();
    await openSheet(user);

    await user.click(submitButton());

    expect(await within(dialog()).findByText("Valeur obligatoire")).toBeInTheDocument();
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    expect(mockFetch).not.toHaveBeenCalled();
    expect(dialog()).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("US13 AC5 shows the range error under the field and sends nothing when the value is out of bounds", async () => {
    const user = userEvent.setup();
    renderSheet();
    await openSheet(user);
    await fill(user, "130");

    await user.click(submitButton());

    expect(await within(dialog()).findByText("Entre 0 et 120")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("US13 AC5 shows the same-value error and sends nothing when the value equals the current one", async () => {
    const user = userEvent.setup();
    renderSheet({ currentValue: 35 });
    await openSheet(user);
    await fill(user, "35");

    await user.click(submitButton());

    expect(await within(dialog()).findByText("C'est déjà la valeur actuelle")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("US13 AC5 shows the reason error and sends nothing when the reason is longer than 200 characters", async () => {
    const user = userEvent.setup();
    renderSheet();
    await openSheet(user);
    await fill(user, "35");
    fireEvent.change(reasonField(), { target: { value: "a".repeat(201) } });

    await user.click(submitButton());

    expect(await within(dialog()).findByText("200 caractères au plus")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends a reason of exactly 200 characters", async () => {
    const user = userEvent.setup();
    renderSheet();
    await openSheet(user);
    await fill(user, "35");
    fireEvent.change(reasonField(), { target: { value: "a".repeat(200) } });

    await user.click(submitButton());

    await waitFor(() => expect(postedBodies()).toHaveLength(1));
    expect(postedBodies()[0].reason).toBe("a".repeat(200));
  });

  it("limits the reason to 200 characters and counts them", async () => {
    const user = userEvent.setup();
    renderSheet();
    await openSheet(user);

    expect(reasonField()).toHaveAttribute("maxlength", "200");
    expect(within(dialog()).getByText("0 / 200")).toBeInTheDocument();
    await user.type(reasonField(), "Fiche");
    expect(within(dialog()).getByText("5 / 200")).toBeInTheDocument();
  });

  it("US13 AC6 on a 409 shows the dedicated message once, keeps the sheet open and the input intact", async () => {
    mockFetch.mockImplementation(async () => json({ message: "open" }, 409));
    const user = userEvent.setup();
    renderSheet();
    await openSheet(user);
    await fill(user, "35", "Fiche du brasseur");

    await user.click(submitButton());

    await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
    expect(toast.danger).toHaveBeenCalledWith("Une proposition est déjà en cours pour cette caractéristique.");
    await waitFor(() => expect(within(dialog()).getByRole("button", { name: "Proposer" })).toBeEnabled());
    expect(valueField()).toHaveValue("35");
    expect(reasonField()).toHaveValue("Fiche du brasseur");
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("US13 AC6 on a 429 shows the daily limit message and keeps the input", async () => {
    mockFetch.mockImplementation(async () => json({ message: "quota" }, 429));
    const user = userEvent.setup();
    renderSheet();
    await openSheet(user);
    await fill(user, "35", "motif");

    await user.click(submitButton());

    await waitFor(() => expect(toast.danger).toHaveBeenCalledWith("Limite atteinte : 10 propositions par jour."));
    expect(toast.danger).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(within(dialog()).getByRole("button", { name: "Proposer" })).toBeEnabled());
    expect(valueField()).toHaveValue("35");
    expect(reasonField()).toHaveValue("motif");
  });

  it("lets the user send again after a refusal", async () => {
    mockFetch.mockImplementationOnce(async () => json({ message: "quota" }, 429));
    const user = userEvent.setup();
    renderSheet();
    await openSheet(user);
    await fill(user, "35");
    await user.click(submitButton());
    await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(submitButton()).toBeEnabled());

    await user.click(submitButton());

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(postedBodies()).toHaveLength(2);
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it("sends once when the submit button is pressed twice in a row", async () => {
    const user = userEvent.setup();
    renderSheet();
    await openSheet(user);
    await fill(user, "35");

    await user.dblClick(submitButton());

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(postedBodies()).toHaveLength(1);
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it("sends once when the form is submitted twice in the same tick", async () => {
    const user = userEvent.setup();
    renderSheet();
    await openSheet(user);
    await fill(user, "35");
    const form = dialog().querySelector("form") as HTMLFormElement;

    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(postedBodies()).toHaveLength(1);
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it("renders in English", async () => {
    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    renderSheet({ currentValue: 35 });

    await user.click(screen.getByRole("button", { name: "Suggest a correction: Bitterness" }));
    await screen.findByRole("dialog");

    expect(within(dialog()).getByRole("heading", { name: "Correct: Bitterness" })).toBeInTheDocument();
    expect(within(dialog()).getByText("Current value: 35 IBU")).toBeInTheDocument();
    expect(within(dialog()).getByRole("textbox", { name: /Reason \(optional\)/ })).toBeInTheDocument();
    expect(within(dialog()).getByRole("button", { name: "Suggest" })).toBeInTheDocument();
    expect(within(dialog()).getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("names the sheet after the characteristic it corrects", async () => {
    const user = userEvent.setup();
    renderSheet({ characteristic: BeerCharacteristicEnum.EBC });

    await user.click(trigger("Proposer une correction : Couleur"));

    expect(await screen.findByRole("heading", { name: "Corriger : Couleur" })).toBeInTheDocument();
  });
});
