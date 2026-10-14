import { toast } from "@heroui/react";
import { QueryClient } from "@tanstack/react-query";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { DeleteCheckinButton } from "@/pages/journal/components/elements/deleteCheckinButton/deleteCheckinButton";
import { CHECKINS } from "@/utils/apiURL/apiURL";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { checkinKeys } from "@/utils/queryKeys/checkinQueryKeys";
import { dexKeys } from "@/utils/queryKeys/dexQueryKeys";

vi.mock("@heroui/react", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  toast: { success: vi.fn(), danger: vi.fn() },
}));

const mockFetch = vi.fn();

const buildClient = () => new QueryClient({ defaultOptions: { queries: { retry: 1, retryDelay: 1 } } });

const renderButton = (client = buildClient()) => {
  const user = userEvent.setup();
  renderWithProviders(<DeleteCheckinButton checkinId={11} />, { queryClient: client });
  return { user, client };
};

const openConfirmation = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Supprimer" }));
  return screen.findByRole("alertdialog");
};

describe("DeleteCheckinButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a Supprimer button and no confirmation until it is pressed", async () => {
    renderButton();

    expect(screen.getByRole("button", { name: "Supprimer" })).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("asks Supprimer cette dégustation ? with a Supprimer and an Annuler button when pressed", async () => {
    const { user } = renderButton();

    const dialog = await openConfirmation(user);

    expect(dialog).toHaveAccessibleName("Supprimer cette dégustation ?");
    expect(within(dialog).getByRole("button", { name: "Supprimer" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Annuler" })).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("deletes nothing when cancelled and closes the confirmation", async () => {
    const { user, client } = renderButton();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const dialog = await openConfirmation(user);

    await user.click(within(dialog).getByRole("button", { name: "Annuler" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(mockFetch).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("sends one DELETE on confirm, then toasts success and refreshes the checkins, the beers and the dex", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));
    const { user, client } = renderButton();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const dialog = await openConfirmation(user);

    await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    expect(toast.success).toHaveBeenCalledWith("Dégustation supprimée.");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${CHECKINS()}/11`);
    expect(init.method).toBe("DELETE");
    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
    expect(keys).toEqual(expect.arrayContaining([checkinKeys.all(), beerKeys.all(), dexKeys.all()]));
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("closes the confirmation once the tasting is deleted", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));
    const { user } = renderButton();
    const dialog = await openConfirmation(user);

    await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("lets the user confirm again after a failed deletion and sends a second DELETE", async () => {
    mockFetch
      .mockImplementationOnce(async () => new Response(JSON.stringify({ message: "boom" }), { status: 500 }))
      .mockImplementationOnce(async () => new Response(null, { status: 204 }));
    const { user } = renderButton();
    const first = await openConfirmation(user);
    await user.click(within(first).getByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());

    const second = await openConfirmation(user);
    await user.click(within(second).getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("sends a single DELETE when Supprimer is pressed twice in the same tick", async () => {
    mockFetch.mockReturnValue(new Promise(() => undefined));
    const { user } = renderButton();
    const dialog = await openConfirmation(user);
    const confirm = within(dialog).getByRole("button", { name: "Supprimer" });

    fireEvent.click(confirm);
    fireEvent.click(confirm);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("keeps the confirmation open and pending while the server has not answered", async () => {
    mockFetch.mockReturnValue(new Promise(() => undefined));
    const { user } = renderButton();
    const dialog = await openConfirmation(user);

    await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const confirmButton = within(screen.getByRole("alertdialog")).getByRole("button", { name: /Supprimer/ });
    expect(confirmButton).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("shows exactly one error toast on a server failure even with a retrying client, and no success", async () => {
    mockFetch.mockImplementation(async () => new Response(JSON.stringify({ message: "boom" }), { status: 500 }));
    const { user } = renderButton();
    const dialog = await openConfirmation(user);

    await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
    expect(vi.mocked(toast.danger).mock.calls[0][0]).toEqual(expect.stringMatching(/\S/));
    expect(toast.success).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Supprimer" })).toBeEnabled();
  });
});
