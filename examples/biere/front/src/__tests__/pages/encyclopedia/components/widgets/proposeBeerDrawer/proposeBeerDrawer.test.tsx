import { toast } from "@heroui/react";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTestQueryClient, renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { API_BASE_URL } from "@/config/apiConfig";
import { ProposeBeerDrawer } from "@/pages/encyclopedia/components/widgets/proposeBeerDrawer/proposeBeerDrawer";
import type { ProposeBeerDrawerProps } from "@/pages/encyclopedia/types/proposeBeerDrawer";
import { buildBeerDetailPath } from "@/types/enums/routing/routePathEnum";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";

vi.mock("@heroui/react", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  toast: { success: vi.fn(), danger: vi.fn() },
}));

const mockStyles = vi.hoisted(() => ({ useBeerStyleGroupsQuery: vi.fn() }));

vi.mock("@/pages/encyclopedia/hooks/useBeerStyleGroupsQuery", () => mockStyles);

const mockBreweries = vi.hoisted(() => ({ useBreweriesQuery: vi.fn() }));

vi.mock("@/pages/encyclopedia/hooks/useBreweriesQuery", () => mockBreweries);

const BEERS_URL = `${API_BASE_URL}/api/v1/beers`;
const mockFetch = vi.fn();
const onOpenChange = vi.fn();
const onCreated = vi.fn();
const refetchStyles = vi.fn();

const GROUPS = [
  {
    family: "trappist",
    styles: [
      { id: 12, name: "Tripel", description: "" },
      { id: 13, name: "Dubbel", description: "" },
    ],
  },
  { family: "ipa", styles: [{ id: 3, name: "American IPA", description: "" }] },
];

const BREWERIES = [
  { id: 1, name: "Chimay", country: "BE" },
  { id: 2, name: "Brasserie Duchi", country: "FR" },
  { id: 3, name: "CHI Brewing", country: "US" },
  { id: 4, name: "Brasserie d'Orval", country: "BE" },
  { id: 5, name: "Brasserie de l'Été", country: "FR" },
  { id: 6, name: "Westmalle", country: "BE" },
];

const createdDto = {
  id: 90,
  name: "Orval",
  breweryName: "Brasserie d'Orval",
  country: "BE",
  styleId: 12,
  styleName: "Tripel",
  family: "trappist",
  abv: 6.2,
  aromas: [],
  formats: [],
  description: "Une trappiste.",
  drunk: false,
  checkinCount: 0,
  inWishlist: false,
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const postedBodies = () =>
  mockFetch.mock.calls
    .filter(([, init]) => (init as RequestInit).method === "POST")
    .map(([, init]) => JSON.parse((init as RequestInit).body as string) as Record<string, unknown>);

const stubStyles = (overrides: Record<string, unknown> = {}) => {
  mockStyles.useBeerStyleGroupsQuery.mockReturnValue({
    groups: GROUPS,
    isPending: false,
    isError: false,
    refetch: refetchStyles,
    ...overrides,
  });
};

const stubBreweries = (overrides: Record<string, unknown> = {}) => {
  mockBreweries.useBreweriesQuery.mockReturnValue({ breweries: [], isPending: false, isError: false, ...overrides });
};

const renderDrawer = (overrides: Partial<ProposeBeerDrawerProps> = {}) => {
  const queryClient = createTestQueryClient();
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const props = { isOpen: true, onOpenChange, initialName: "", onCreated, ...overrides };
  const view = renderWithProviders(<ProposeBeerDrawer {...props} />, { queryClient });
  const rerenderWith = (next: Partial<ProposeBeerDrawerProps>) =>
    view.rerender(<ProposeBeerDrawer {...props} {...next} />);
  return { ...view, invalidate, rerenderWith };
};

const pageDto = (items: unknown[]) => ({
  items,
  total: items.length,
  page: 1,
  size: 50,
  facets: { families: [], countries: [], formats: [] },
});

const stubDuplicate = (lookup: () => Promise<Response>) => {
  mockFetch.mockImplementation(async (_url: string, init: RequestInit) =>
    init.method === "POST" ? json({ message: "duplicate" }, 409) : lookup(),
  );
};

const existingLink = () => screen.queryByRole("link", { name: "L'ouvrir" });

const dialog = () => screen.getByRole("dialog");
const nameField = () => within(dialog()).getByRole("textbox", { name: /Nom de la bière/ });
const breweryField = () => within(dialog()).getByRole("combobox", { name: /Brasserie/ });
const abvField = () => within(dialog()).getByRole("textbox", { name: /Degré/ });
const descriptionField = () => within(dialog()).getByRole("textbox", { name: /Description/ });

type User = ReturnType<typeof userEvent.setup>;

const choose = async (user: User, trigger: RegExp, option: string) => {
  await user.click(within(dialog()).getByRole("button", { name: trigger }));
  await user.click(await screen.findByRole("option", { name: option }));
};

const pasteInto = async (user: User, field: HTMLElement, text: string) => {
  await user.click(field);
  await user.paste(text);
};

const fillValidForm = async (user: User) => {
  await pasteInto(user, nameField(), "  Orval  ");
  await pasteInto(user, breweryField(), "  Brasserie   d'Orval ");
  await choose(user, /Pays/, "Belgique");
  await choose(user, /Style/, "Tripel");
  await pasteInto(user, abvField(), "6,2");
  await pasteInto(user, descriptionField(), "  Une trappiste.  ");
};

const submit = (user: User) => user.click(within(dialog()).getByRole("button", { name: "Ajouter" }));

describe("ProposeBeerDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockFetch.mockImplementation(async () => json(createdDto, 201));
    vi.stubGlobal("fetch", mockFetch);
    stubStyles();
    stubBreweries();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("AC1 shows the title and the six labelled fields, each with a 44px touch target", async () => {
    renderDrawer();

    const form = within(dialog());
    expect(form.getByRole("heading", { name: "Ajouter une bière" })).toBeInTheDocument();
    expect(nameField()).toHaveClass("min-h-11");
    expect(breweryField()).toHaveClass("min-h-11");
    // le groupe porte la hauteur : sur l'input seul, le groupe (36 px, overflow caché) rogne le texte et la bordure
    expect(abvField().closest(".number-field__group")).toHaveClass("min-h-11");
    expect(descriptionField()).toBeInTheDocument();
    expect(form.getByRole("button", { name: /Pays/ })).toHaveClass("min-h-11");
    expect(form.getByRole("button", { name: /Style/ })).toHaveClass("min-h-11");
    expect(form.getByRole("button", { name: "Fermer" })).toBeInTheDocument();
    expect(form.getByRole("button", { name: "Ajouter" })).toHaveClass("button--lg");
  });

  it("AC2 opens with the name prefilled from the search and the other fields empty", async () => {
    renderDrawer({ initialName: "zzz" });

    expect(nameField()).toHaveValue("zzz");
    expect(breweryField()).toHaveValue("");
    expect(abvField()).toHaveValue("");
    expect(descriptionField()).toHaveValue("");
  });

  it("AC3 shows no error before the first submit", async () => {
    renderDrawer();

    expect(screen.queryByText(/doit faire entre/)).not.toBeInTheDocument();
    expect(screen.queryByText(/est requis/)).not.toBeInTheDocument();
    expect(nameField()).toBeValid();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("AC3 shows the error of every required field under it on an empty submit and calls nothing", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await submit(user);

    expect(await screen.findByText("Le nom doit faire entre 2 et 80 caractères")).toBeInTheDocument();
    expect(screen.getByText("La brasserie doit faire entre 2 et 60 caractères")).toBeInTheDocument();
    expect(screen.getByText("Le pays est requis")).toBeInTheDocument();
    expect(screen.getByText("Le style est requis")).toBeInTheDocument();
    expect(screen.getByText("Le degré est requis")).toBeInTheDocument();
    expect(nameField()).toBeInvalid();
    expect(breweryField()).toBeInvalid();
    expect(abvField()).toBeInvalid();
    expect(descriptionField()).toBeValid();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("AC3 keeps the filled prefilled name without error on an otherwise empty submit", async () => {
    const user = userEvent.setup();
    renderDrawer({ initialName: "Orval" });

    await submit(user);

    expect(await screen.findByText("Le pays est requis")).toBeInTheDocument();
    expect(screen.queryByText("Le nom doit faire entre 2 et 80 caractères")).not.toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("AC4 shows the name error for a one-letter name", async () => {
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);
    await user.clear(nameField());
    await user.type(nameField(), "a");

    await submit(user);

    expect(await screen.findByText("Le nom doit faire entre 2 et 80 caractères")).toBeInTheDocument();
    expect(nameField()).toBeInvalid();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("AC4 shows the range error for a degree of 25", async () => {
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);
    await user.clear(abvField());
    await user.type(abvField(), "25");

    await submit(user);

    expect(await screen.findByText("Le degré doit être compris entre 0 et 20")).toBeInTheDocument();
    expect(abvField()).toBeInvalid();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("AC4 shows the step error for a degree of 7,25", async () => {
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);
    await user.clear(abvField());
    await user.type(abvField(), "7,25");

    await submit(user);

    expect(await screen.findByText("Le degré admet un seul chiffre après la virgule")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("AC4 shows the description error for 501 characters and accepts 500", async () => {
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);
    fireEvent.change(descriptionField(), { target: { value: "a".repeat(501) } });

    await submit(user);

    expect(await screen.findByText("La description ne doit pas dépasser 500 caractères")).toBeInTheDocument();
    expect(descriptionField()).toBeInvalid();
    expect(mockFetch).not.toHaveBeenCalled();

    fireEvent.change(descriptionField(), { target: { value: "a".repeat(500) } });
    await submit(user);

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(postedBodies()[0].description).toBe("a".repeat(500));
  });

  it("AC5 groups the styles by family and shows the family of the chosen style", async () => {
    const user = userEvent.setup();
    renderDrawer();
    expect(within(dialog()).queryByText("Famille : Trappiste")).not.toBeInTheDocument();

    await user.click(within(dialog()).getByRole("button", { name: /Style/ }));

    const trappist = await screen.findByRole("group", { name: "Trappiste" });
    const ipa = screen.getByRole("group", { name: "IPA" });
    expect(within(trappist).getAllByRole("option").map((option) => option.textContent)).toEqual(["Tripel", "Dubbel"]);
    expect(within(ipa).getAllByRole("option").map((option) => option.textContent)).toEqual(["American IPA"]);

    await user.click(within(trappist).getByRole("option", { name: "Dubbel" }));

    expect(await within(dialog()).findByText("Famille : Trappiste")).toBeInTheDocument();
    await choose(user, /Style/, "American IPA");
    expect(await within(dialog()).findByText("Famille : IPA")).toBeInTheDocument();
    expect(within(dialog()).queryByText("Famille : Trappiste")).not.toBeInTheDocument();
  });

  it("lists the countries by their French name, sorted", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(within(dialog()).getByRole("button", { name: /Pays/ }));

    const names = (await screen.findAllByRole("option")).map((option) => option.textContent ?? "");
    expect(names).toHaveLength(249);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "fr")));
    expect(names).toEqual(expect.arrayContaining(["Belgique", "France", "Allemagne"]));
  });

  it("AC6 posts the cleaned values, then reloads the beers, toasts, reports the created beer and closes", async () => {
    const user = userEvent.setup();
    const { invalidate } = renderDrawer();
    await fillValidForm(user);

    await submit(user);

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe(BEERS_URL);
    expect(postedBodies()[0]).toEqual({
      name: "Orval",
      breweryName: "Brasserie d'Orval",
      country: "BE",
      styleId: 12,
      abv: 6.2,
      description: "Une trappiste.",
    });
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 90, name: "Orval", styleId: 12 }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: beerKeys.all() });
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Bière ajoutée");
    expect(toast.danger).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("AC6 puts the submit button in a pending state while the request is in flight", async () => {
    let release: (response: Response) => void = () => undefined;
    mockFetch.mockImplementation(() => new Promise<Response>((resolve) => (release = resolve)));
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);

    await submit(user);

    await waitFor(() => expect(within(dialog()).getByRole("button", { name: /Ajouter/ })).toHaveAttribute("data-pending"));
    expect(onCreated).not.toHaveBeenCalled();
    release(json(createdDto, 201));
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
  });

  it("sends a single request when the submit button is pressed twice in the same tick", async () => {
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);
    const button = within(dialog()).getByRole("button", { name: "Ajouter" });

    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("ignores a second submit of the form while the first request is still in flight", async () => {
    let release: (response: Response) => void = () => undefined;
    mockFetch.mockImplementation(() => new Promise<Response>((resolve) => (release = resolve)));
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);
    const form = dialog().querySelector("form") as HTMLFormElement;

    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    release(json(createdDto, 201));
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("AC7 shows the already existing error under the name on a 409, with one toast, the form open and filled", async () => {
    mockFetch.mockImplementation(async () => json({ message: "duplicate" }, 409));
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);

    await submit(user);

    await waitFor(() => expect(nameField()).toBeInvalid());
    expect(within(dialog()).getByText("Cette bière existe déjà")).toBeInTheDocument();
    expect(nameField()).toHaveValue("  Orval  ");
    expect(breweryField()).toHaveValue("  Brasserie   d'Orval ");
    expect(abvField()).toHaveValue("6,2");
    expect(onCreated).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("Cette bière existe déjà");
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("clears the duplicate error once the name is edited, and sends again", async () => {
    mockFetch.mockImplementationOnce(async () => json({ message: "duplicate" }, 409));
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);
    await submit(user);
    await screen.findByText("Cette bière existe déjà");

    await user.type(nameField(), " 2");

    await waitFor(() => expect(screen.queryByText("Cette bière existe déjà")).not.toBeInTheDocument());
    await submit(user);
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(postedBodies()[1]).toMatchObject({ name: "Orval 2" });
  });

  it.each([
    [400, "La demande est invalide."],
    [404, "La ressource demandée est introuvable."],
    [500, "Une erreur est survenue. Réessayez."],
  ])("AC7 on status %s shows one toast, no field error, and keeps the sheet open with the input intact", async (status, text) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);

    await submit(user);

    await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
    expect(toast.danger).toHaveBeenCalledWith(text);
    await waitFor(() => expect(within(dialog()).getByRole("button", { name: "Ajouter" })).not.toHaveAttribute("data-pending"));
    expect(screen.queryByText("Cette bière existe déjà")).not.toBeInTheDocument();
    expect(nameField()).toBeValid();
    expect(nameField()).toHaveValue("  Orval  ");
    expect(abvField()).toHaveValue("6,2");
    expect(onCreated).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("AC7 on a network failure shows one toast and keeps the sheet open", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);

    await submit(user);

    await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
    expect(toast.danger).toHaveBeenCalledWith("Une erreur est survenue. Réessayez.");
    expect(nameField()).toHaveValue("  Orval  ");
    expect(onCreated).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("AC8 sends a name with markup as plain text and renders it as text only", async () => {
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);
    await user.clear(nameField());
    await user.type(nameField(), "<b>gras</b>", { skipClick: false });

    expect(nameField()).toHaveValue("<b>gras</b>");
    expect(dialog().querySelector("b")).toBeNull();
    await submit(user);

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(postedBodies()[0].name).toBe("<b>gras</b>");
  });

  it("shows an error with a retry button when the styles cannot be loaded", async () => {
    stubStyles({ groups: [], isError: true });
    const user = userEvent.setup();
    renderDrawer();

    expect(within(dialog()).getByText("Impossible de charger les styles.")).toBeInTheDocument();
    await user.click(within(dialog()).getByRole("button", { name: "Réessayer" }));

    expect(refetchStyles).toHaveBeenCalledTimes(1);
  });

  it("disables the style choice while the styles are loading", async () => {
    stubStyles({ groups: [], isPending: true });
    renderDrawer();

    expect(within(dialog()).getByRole("button", { name: /Style/ })).toBeDisabled();
  });

  it("forgets what was typed once a created beer closed the sheet and it is reopened with another name", async () => {
    const user = userEvent.setup();
    const { rerenderWith } = renderDrawer({ initialName: "zzz" });
    await fillValidForm(user);
    await submit(user);
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));

    rerenderWith({ isOpen: false, initialName: "zzz" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    rerenderWith({ isOpen: true, initialName: "abc" });

    expect(await screen.findByRole("textbox", { name: /Nom de la bière/ })).toHaveValue("abc");
    expect(breweryField()).toHaveValue("");
    expect(abvField()).toHaveValue("");
    expect(screen.queryByText("Le pays est requis")).not.toBeInTheDocument();
    expect(within(dialog()).queryByText(/^Famille/)).not.toBeInTheDocument();
  });

  it("forgets the errors shown and the typed text when it is closed with its close button", async () => {
    const user = userEvent.setup();
    const { rerenderWith } = renderDrawer({ initialName: "zzz" });
    await submit(user);
    await screen.findByText("Le pays est requis");
    await user.type(breweryField(), "Brasserie");

    await user.click(within(dialog()).getByRole("button", { name: "Fermer" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    rerenderWith({ isOpen: false });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    rerenderWith({ isOpen: true });

    expect(await screen.findByRole("combobox", { name: /Brasserie/ })).toHaveValue("");
    expect(screen.queryByText("Le pays est requis")).not.toBeInTheDocument();
  });

  it("US6 AC1 proposes the breweries whose name contains the typed text, case ignored", async () => {
    stubBreweries({ breweries: BREWERIES });
    const user = userEvent.setup();
    renderDrawer();

    await user.type(breweryField(), "chi");

    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual(["Chimay", "Brasserie Duchi", "CHI Brewing"]);
    expect(options[0]).toHaveClass("min-h-11");
  });

  it("US6 AC1 matches without regard to accents and narrows as the text grows", async () => {
    stubBreweries({ breweries: BREWERIES });
    const user = userEvent.setup();
    renderDrawer();

    await user.type(breweryField(), "ETE");

    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual(["Brasserie de l'Été"]);
    await user.clear(breweryField());
    await user.type(breweryField(), "chim");
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1));
    expect(screen.getByRole("option", { name: "Chimay" })).toBeInTheDocument();
  });

  it("US6 AC1 proposes nothing when no brewery matches", async () => {
    stubBreweries({ breweries: BREWERIES });
    const user = userEvent.setup();
    renderDrawer();

    await user.type(breweryField(), "zzz");

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(breweryField()).toHaveValue("zzz");
  });

  it("US6 AC2 sends the exact name of the chosen suggestion, not the typed text", async () => {
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);
    stubBreweries({ breweries: BREWERIES });
    await user.clear(breweryField());
    await user.type(breweryField(), "orv");

    await user.click(await screen.findByRole("option", { name: "Brasserie d'Orval" }));

    expect(breweryField()).toHaveValue("Brasserie d'Orval");
    await submit(user);
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(postedBodies()[0].breweryName).toBe("Brasserie d'Orval");
  });

  it("US6 AC2 sends the typed text again once a chosen suggestion is edited", async () => {
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);
    stubBreweries({ breweries: BREWERIES });
    await user.clear(breweryField());
    await user.type(breweryField(), "chim");
    await user.click(await screen.findByRole("option", { name: "Chimay" }));

    await user.type(breweryField(), " Bleue");

    expect(breweryField()).toHaveValue("Chimay Bleue");
    await submit(user);
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(postedBodies()[0].breweryName).toBe("Chimay Bleue");
  });

  it("US6 AC3 sends an unknown typed name cleaned of its extra spaces", async () => {
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);
    stubBreweries({ breweries: BREWERIES });
    await user.clear(breweryField());
    await pasteInto(user, breweryField(), "  Ma   Petite Brasserie ");

    await submit(user);

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(postedBodies()[0].breweryName).toBe("Ma Petite Brasserie");
  });

  it("US6 AC4 keeps a free text field with no suggestion while the breweries are loading", async () => {
    stubBreweries({ breweries: [], isPending: true });
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);

    await user.clear(breweryField());
    await user.type(breweryField(), "chi");

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(breweryField()).toHaveValue("chi");
    await user.clear(breweryField());
    await pasteInto(user, breweryField(), "Chimay");
    await submit(user);
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(postedBodies()[0].breweryName).toBe("Chimay");
  });

  it("US6 AC4 keeps a free text field with no suggestion when the breweries are in error", async () => {
    stubBreweries({ breweries: [], isError: true });
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);

    await user.clear(breweryField());
    await user.type(breweryField(), "chi");

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(breweryField()).toBeEnabled();
    expect(breweryField()).toHaveValue("chi");
    await user.clear(breweryField());
    await pasteInto(user, breweryField(), "Orval");
    await submit(user);
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(postedBodies()[0].breweryName).toBe("Orval");
  });

  it("US6 AC4 proposes no stale suggestion when the breweries are in error, even if a previous load is still cached", async () => {
    stubBreweries({ breweries: BREWERIES, isError: true });
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);

    await user.clear(breweryField());
    await user.type(breweryField(), "chi");

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(breweryField()).toBeEnabled();
    expect(breweryField()).toHaveValue("chi");
    await user.clear(breweryField());
    await pasteInto(user, breweryField(), "Chimay");
    await submit(user);
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(postedBodies()[0].breweryName).toBe("Chimay");
  });

  it("US6 AC4 reads the breweries only while the sheet is open", async () => {
    const { rerenderWith } = renderDrawer({ isOpen: false });

    expect(mockBreweries.useBreweriesQuery).toHaveBeenLastCalledWith(false);
    expect(mockBreweries.useBreweriesQuery).not.toHaveBeenCalledWith(true);

    rerenderWith({ isOpen: true });

    await screen.findByRole("dialog");
    expect(mockBreweries.useBreweriesQuery).toHaveBeenLastCalledWith(true);
  });

  it("US6 shows the error of the brewery under its field on an empty submit", async () => {
    stubBreweries({ breweries: BREWERIES });
    const user = userEvent.setup();
    renderDrawer();

    await submit(user);

    expect(await screen.findByText("La brasserie doit faire entre 2 et 60 caractères")).toBeInTheDocument();
    expect(breweryField()).toBeInvalid();
  });

  it("US7 AC1 shows a link to the existing beer under the name when the search finds the same name and brewery", async () => {
    stubDuplicate(async () =>
      json(pageDto([{ ...createdDto, id: 41, name: "Chimay Bleue", breweryName: "Chimay" }, { ...createdDto, id: 77, name: "ORVAL", breweryName: "brasserie d'orval" }])),
    );
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);

    await submit(user);

    const link = await screen.findByRole("link", { name: "L'ouvrir" });
    expect(link).toHaveAttribute("href", buildBeerDetailPath(77));
    expect(link).toHaveClass("min-h-11");
    expect(within(dialog()).getByText("Cette bière existe déjà")).toBeInTheDocument();
    expect(nameField()).toBeInvalid();
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [searchUrl, searchInit] = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(searchInit.method).toBe("GET");
    expect(searchUrl).toContain("q=Orval");
    expect(searchUrl).toContain("size=50");
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });

  it("US7 AC1 places the link after the name field and before the brewery field", async () => {
    stubDuplicate(async () => json(pageDto([{ ...createdDto, id: 77 }])));
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);

    await submit(user);

    const link = await screen.findByRole("link", { name: "L'ouvrir" });
    expect(nameField().compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(link.compareDocumentPosition(breweryField()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it.each([
    ["the brewery differs", { ...createdDto, id: 5, name: "Orval", breweryName: "Chimay" }],
    ["the name differs", { ...createdDto, id: 6, name: "Orval Extra", breweryName: "Brasserie d'Orval" }],
  ])("US7 AC2 shows only the already existing message when %s in the search result", async (_label, item) => {
    stubDuplicate(async () => json(pageDto([item])));
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);

    await submit(user);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(within(dialog()).getByText("Cette bière existe déjà")).toBeInTheDocument());
    expect(existingLink()).not.toBeInTheDocument();
  });

  it("US7 AC2 shows only the already existing message when the search finds nothing", async () => {
    stubDuplicate(async () => json(pageDto([])));
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);

    await submit(user);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(within(dialog()).getByText("Cette bière existe déjà")).toBeInTheDocument());
    expect(existingLink()).not.toBeInTheDocument();
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });

  it("US7 AC2 shows only the already existing message, with no extra toast, when the search fails", async () => {
    stubDuplicate(async () => json({ message: "boom" }, 500));
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);

    await submit(user);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(within(dialog()).getByText("Cette bière existe déjà")).toBeInTheDocument());
    expect(existingLink()).not.toBeInTheDocument();
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("Cette bière existe déjà");
  });

  it("US7 AC3 shows one toast with the daily limit, keeps the sheet open and the input intact on a 429", async () => {
    mockFetch.mockImplementation(async () => json({ message: "too many" }, 429));
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);

    await submit(user);

    await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
    expect(toast.danger).toHaveBeenCalledWith("Limite atteinte : 10 propositions par jour.");
    await waitFor(() => expect(within(dialog()).getByRole("button", { name: "Ajouter" })).not.toHaveAttribute("data-pending"));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Cette bière existe déjà")).not.toBeInTheDocument();
    expect(existingLink()).not.toBeInTheDocument();
    expect(nameField()).toBeValid();
    expect(nameField()).toHaveValue("  Orval  ");
    expect(breweryField()).toHaveValue("  Brasserie   d'Orval ");
    expect(abvField()).toHaveValue("6,2");
    expect(descriptionField()).toHaveValue("  Une trappiste.  ");
    expect(onCreated).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("US7 AC4 clears the error and the link once the name is edited", async () => {
    stubDuplicate(async () => json(pageDto([{ ...createdDto, id: 77 }])));
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);
    await submit(user);
    await screen.findByRole("link", { name: "L'ouvrir" });

    await user.type(nameField(), "x");

    await waitFor(() => expect(screen.queryByText("Cette bière existe déjà")).not.toBeInTheDocument());
    expect(existingLink()).not.toBeInTheDocument();
    expect(nameField()).toBeValid();
  });

  it("US7 AC4 clears the error and the link once the brewery is edited", async () => {
    stubDuplicate(async () => json(pageDto([{ ...createdDto, id: 77 }])));
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);
    await submit(user);
    await screen.findByRole("link", { name: "L'ouvrir" });

    await user.type(breweryField(), "x");

    await waitFor(() => expect(screen.queryByText("Cette bière existe déjà")).not.toBeInTheDocument());
    expect(existingLink()).not.toBeInTheDocument();
    expect(nameField()).toBeValid();
  });

  it("US7 AC4 does not show a link whose search answers after the name was edited", async () => {
    let answerSearch: (response: Response) => void = () => undefined;
    stubDuplicate(() => new Promise<Response>((resolve) => (answerSearch = resolve)));
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);
    await submit(user);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

    await user.type(nameField(), "x");
    answerSearch(json(pageDto([{ ...createdDto, id: 77 }])));

    await waitFor(() => expect(within(dialog()).getByRole("button", { name: "Ajouter" })).not.toHaveAttribute("data-pending"));
    expect(existingLink()).not.toBeInTheDocument();
    expect(screen.queryByText("Cette bière existe déjà")).not.toBeInTheDocument();
  });

  it("US7 forgets the link when the sheet is closed and reopened", async () => {
    stubDuplicate(async () => json(pageDto([{ ...createdDto, id: 77 }])));
    const user = userEvent.setup();
    const { rerenderWith } = renderDrawer();
    await fillValidForm(user);
    await submit(user);
    await screen.findByRole("link", { name: "L'ouvrir" });

    await user.click(within(dialog()).getByRole("button", { name: "Fermer" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(existingLink()).not.toBeInTheDocument();
    expect(screen.queryByText("Cette bière existe déjà")).not.toBeInTheDocument();
    expect(nameField()).toBeValid();
    expect(nameField()).toHaveValue("");
    rerenderWith({ isOpen: true, initialName: "Autre" });

    expect(existingLink()).not.toBeInTheDocument();
    expect(screen.queryByText("Cette bière existe déjà")).not.toBeInTheDocument();
    expect(nameField()).toBeValid();
    expect(nameField()).toHaveValue("Autre");
  });

  it("US7 forgets the error and the link when the page closes the sheet by itself and reopens it", async () => {
    stubDuplicate(async () => json(pageDto([{ ...createdDto, id: 77 }])));
    const user = userEvent.setup();
    const { rerenderWith } = renderDrawer();
    await fillValidForm(user);
    await submit(user);
    await screen.findByRole("link", { name: "L'ouvrir" });
    expect(screen.getByText("Cette bière existe déjà")).toBeInTheDocument();

    rerenderWith({ isOpen: false });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    rerenderWith({ isOpen: true });

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(existingLink()).not.toBeInTheDocument();
    expect(screen.queryByText("Cette bière existe déjà")).not.toBeInTheDocument();
    expect(nameField()).toBeValid();
    expect(nameField()).toHaveValue("");
    expect(breweryField()).toHaveValue("");
  });
});
