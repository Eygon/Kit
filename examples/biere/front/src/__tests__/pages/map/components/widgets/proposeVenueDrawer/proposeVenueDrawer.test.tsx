import { toast } from "@heroui/react";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTestQueryClient, renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { API_BASE_URL } from "@/config/apiConfig";
import { ProposeVenueDrawer } from "@/pages/map/components/widgets/proposeVenueDrawer/proposeVenueDrawer";
import type { ProposeVenueDrawerProps } from "@/pages/map/types/proposeVenueDrawer";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

vi.mock("@heroui/react", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  toast: { success: vi.fn(), danger: vi.fn() },
}));

const VENUES_URL = `${API_BASE_URL}/api/v1/venues`;
const mockFetch = vi.fn();
const onOpenChange = vi.fn();
const onCreated = vi.fn();

const POSITION = { latitude: 48.8566, longitude: 2.3522 };

const createdDto = {
  id: 40,
  name: "Le Trappiste",
  type: "bar",
  city: "Paris",
  address: "1 rue de la Bière",
  latitude: 48.8566,
  longitude: 2.3522,
  description: "",
  distanceKm: null,
  status: "unknown",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const postedBodies = () =>
  mockFetch.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string) as Record<string, unknown>);

const renderDrawer = (overrides: Partial<ProposeVenueDrawerProps> = {}) => {
  const queryClient = createTestQueryClient();
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const view = renderWithProviders(
    <ProposeVenueDrawer position={POSITION} isOpen onOpenChange={onOpenChange} onCreated={onCreated} {...overrides} />,
    { queryClient },
  );
  return { ...view, invalidate };
};

const dialog = () => screen.getByRole("dialog");

const fillValidForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(within(dialog()).getByRole("textbox", { name: /Nom du lieu/ }), "  Le Trappiste  ");
  await user.type(within(dialog()).getByRole("textbox", { name: /Adresse/ }), "1 rue de la Bière");
};

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(within(dialog()).getByRole("button", { name: "Proposer" }));

describe("ProposeVenueDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockFetch.mockImplementation(async () => json(createdDto, 201));
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the title, the chosen point and one field per contract entry with Bar selected by default", async () => {
    renderDrawer();

    const form = within(dialog());
    expect(form.getByRole("heading", { name: "Proposer un lieu" })).toBeInTheDocument();
    expect(form.getByText("Point choisi : 48.8566, 2.3522")).toBeInTheDocument();
    expect(form.getByRole("textbox", { name: /Nom du lieu/ })).toHaveAttribute("maxlength", "80");
    expect(form.getByRole("textbox", { name: /Adresse/ })).toHaveAttribute("maxlength", "160");
    expect(form.getByRole("textbox", { name: "Ville" })).toHaveAttribute("maxlength", "60");
    expect(form.getByRole("textbox", { name: "Description" })).toHaveAttribute("maxlength", "300");
    expect(form.getByRole("radio", { name: "Bar" })).toBeChecked();
    expect(form.getByRole("radio", { name: "Cave" })).not.toBeChecked();
    expect(form.getByRole("radio", { name: "Brasserie" })).not.toBeChecked();
  });

  it("shows no error before the first submit", async () => {
    renderDrawer();

    expect(screen.queryByText("Le nom est requis")).not.toBeInTheDocument();
    expect(screen.queryByText("L'adresse est requise")).not.toBeInTheDocument();
  });

  it("AC2 shows the error of each empty required field and sends nothing", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await submit(user);

    expect(await screen.findByText("Le nom est requis")).toBeInTheDocument();
    expect(screen.getByText("L'adresse est requise")).toBeInTheDocument();
    expect(within(dialog()).getByRole("textbox", { name: /Nom du lieu/ })).toBeInvalid();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("AC2 treats a name made only of spaces as empty and keeps the filled field without error", async () => {
    const user = userEvent.setup();
    renderDrawer();
    await user.type(within(dialog()).getByRole("textbox", { name: /Nom du lieu/ }), "     ");
    await user.type(within(dialog()).getByRole("textbox", { name: /Adresse/ }), "1 rue de la Bière");

    await submit(user);

    expect(await screen.findByText("Le nom est requis")).toBeInTheDocument();
    expect(screen.queryByText("L'adresse est requise")).not.toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("AC1 posts the trimmed values, the chosen type and the point, then reloads the lists, closes and reports the creation", async () => {
    const user = userEvent.setup();
    const { invalidate } = renderDrawer();
    await fillValidForm(user);
    await user.type(within(dialog()).getByRole("textbox", { name: "Ville" }), " Paris ");
    await user.type(within(dialog()).getByRole("textbox", { name: "Description" }), "Vingt pressions.");
    await user.click(within(dialog()).getByRole("radio", { name: "Brasserie" }));

    await submit(user);

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe(VENUES_URL);
    expect(postedBodies()[0]).toEqual({
      name: "Le Trappiste",
      type: "brewery",
      address: "1 rue de la Bière",
      city: "Paris",
      description: "Vingt pressions.",
      latitude: 48.8566,
      longitude: 2.3522,
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: venueKeys.lists() });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(toast.success).toHaveBeenCalledWith("Lieu proposé");
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("empties the form once the venue is created, so it is blank when reopened", async () => {
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);
    await user.type(within(dialog()).getByRole("textbox", { name: "Ville" }), "Paris");
    await user.click(within(dialog()).getByRole("radio", { name: "Cave" }));

    await submit(user);

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(within(dialog()).getByRole("textbox", { name: /Nom du lieu/ })).toHaveValue("");
    expect(within(dialog()).getByRole("textbox", { name: /Adresse/ })).toHaveValue("");
    expect(within(dialog()).getByRole("textbox", { name: "Ville" })).toHaveValue("");
    expect(within(dialog()).getByRole("radio", { name: "Bar" })).toBeChecked();
    expect(screen.queryByText("Le nom est requis")).not.toBeInTheDocument();
  });

  it("AC1 sends empty city and description when they are left blank", async () => {
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);

    await submit(user);

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(postedBodies()[0]).toMatchObject({ type: "bar", city: "", description: "" });
  });

  it("AC3 shows Ce lieu existe déjà on the name field on a 409, keeps the form open and filled, with one toast", async () => {
    mockFetch.mockImplementation(async () => json({ message: "taken" }, 409));
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);

    await submit(user);

    const nameField = within(dialog()).getByRole("textbox", { name: /Nom du lieu/ });
    await waitFor(() => expect(nameField).toBeInvalid());
    expect(within(dialog()).getByText("Ce lieu existe déjà")).toBeInTheDocument();
    expect(within(dialog()).getByRole("textbox", { name: /Adresse/ })).toHaveValue("1 rue de la Bière");
    expect(nameField).toHaveValue("  Le Trappiste  ");
    expect(within(dialog()).queryByText("L'adresse est requise")).not.toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("Ce lieu existe déjà");
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("AC3 clears the name error once the name is edited, and sends again", async () => {
    mockFetch.mockImplementationOnce(async () => json({ message: "taken" }, 409));
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);
    await submit(user);
    await screen.findByText("Ce lieu existe déjà");

    await user.type(within(dialog()).getByRole("textbox", { name: /Nom du lieu/ }), " 2");

    await waitFor(() => expect(screen.queryByText("Ce lieu existe déjà")).not.toBeInTheDocument());
    await submit(user);
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(postedBodies()[1]).toMatchObject({ name: "Le Trappiste   2" });
  });

  it.each([400, 500])("on status %s shows no field error, keeps the form open and reports no creation", async (status) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);

    await submit(user);

    await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
    expect(toast.danger).not.toHaveBeenCalledWith("Ce lieu existe déjà");
    expect(screen.queryByText("Ce lieu existe déjà")).not.toBeInTheDocument();
    expect(within(dialog()).getByRole("textbox", { name: /Nom du lieu/ })).toBeValid();
    expect(onCreated).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("sends a single request when the submit button is pressed twice in the same tick", async () => {
    const user = userEvent.setup();
    renderDrawer();
    await fillValidForm(user);
    const button = within(dialog()).getByRole("button", { name: "Proposer" });

    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("sends nothing when no point has been chosen", async () => {
    const user = userEvent.setup();
    renderDrawer({ position: null });
    await fillValidForm(user);

    await submit(user);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("closes through its close button and forgets what was typed once reopened", async () => {
    const user = userEvent.setup();
    const { rerender } = renderDrawer();
    await fillValidForm(user);

    await user.click(within(dialog()).getByRole("button", { name: "Fermer" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    rerender(<ProposeVenueDrawer position={POSITION} isOpen={false} onOpenChange={onOpenChange} onCreated={onCreated} />);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    rerender(<ProposeVenueDrawer position={POSITION} isOpen onOpenChange={onOpenChange} onCreated={onCreated} />);

    expect(await screen.findByRole("textbox", { name: /Nom du lieu/ })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: /Adresse/ })).toHaveValue("");
  });
});
