import { toast } from "@heroui/react";
import { QueryClient } from "@tanstack/react-query";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { DeleteReviewButton } from "@/pages/beerDetail/components/elements/deleteReviewButton/deleteReviewButton";
import { BEER_MY_REVIEW } from "@/utils/apiURL/apiURL";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { reviewKeys } from "@/utils/queryKeys/reviewQueryKeys";

vi.mock("@heroui/react", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  toast: { success: vi.fn(), danger: vi.fn() },
}));

const mutationState = vi.hoisted(() => ({ hidePending: false }));

vi.mock("@/pages/beerDetail/hooks/useDeleteReviewMutation", async (importOriginal) => {
  const actual = await importOriginal<{ useDeleteReviewMutation: () => { removeReview: unknown; isRemoving: boolean } }>();
  return {
    useDeleteReviewMutation: () => {
      const result = actual.useDeleteReviewMutation();
      return mutationState.hidePending ? { ...result, isRemoving: false } : result;
    },
  };
});

const mockFetch = vi.fn();
const onDeleted = vi.fn();

const buildClient = () => new QueryClient({ defaultOptions: { queries: { retry: 1, retryDelay: 1 } } });

const renderButton = (client = buildClient()) => {
  const user = userEvent.setup();
  renderWithProviders(<DeleteReviewButton beerId={7} onDeleted={onDeleted} />, { queryClient: client });
  return { user, client };
};

const openConfirmation = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Supprimer mon avis" }));
  return screen.findByRole("alertdialog");
};

describe("DeleteReviewButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutationState.hidePending = false;
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("AC1 shows a large Supprimer mon avis button and no confirmation until it is pressed", async () => {
    renderButton();

    const trigger = screen.getByRole("button", { name: "Supprimer mon avis" });
    expect(trigger.className).toContain("button--lg");
    expect(trigger.className).toContain("button--danger-soft");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("AC1 asks Supprimer votre avis ? with an Annuler and a Supprimer button when pressed", async () => {
    const { user } = renderButton();

    const dialog = await openConfirmation(user);

    expect(dialog).toHaveAccessibleName("Supprimer votre avis ?");
    expect(within(dialog).getByRole("button", { name: "Supprimer" }).className).toContain("button--danger");
    expect(within(dialog).getByRole("button", { name: "Annuler" })).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("AC2 deletes nothing when Annuler is pressed and closes the confirmation", async () => {
    const { user, client } = renderButton();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const dialog = await openConfirmation(user);

    await user.click(within(dialog).getByRole("button", { name: "Annuler" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(mockFetch).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("AC2 deletes nothing when Escape is pressed", async () => {
    const { user } = renderButton();
    await openConfirmation(user);

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(mockFetch).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("AC3 sends one DELETE, toasts Avis supprimé, rereads the beers and the reviews and calls onDeleted once", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));
    const { user, client } = renderButton();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const dialog = await openConfirmation(user);

    await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(BEER_MY_REVIEW(7));
    expect(init.method).toBe("DELETE");
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Avis supprimé");
    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
    expect(keys).toEqual(expect.arrayContaining([beerKeys.all(), reviewKeys.list(7)]));
    expect(toast.danger).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("AC3 sends a single DELETE when Supprimer is pressed twice in the same tick, even before the button shows its pending state", async () => {
    mutationState.hidePending = true;
    mockFetch.mockReturnValue(new Promise(() => undefined));
    const { user } = renderButton();
    const dialog = await openConfirmation(user);
    const confirm = within(dialog).getByRole("button", { name: "Supprimer" });

    fireEvent.click(confirm);
    fireEvent.click(confirm);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("AC3 keeps the confirmation pending while the server has not answered", async () => {
    mockFetch.mockReturnValue(new Promise(() => undefined));
    const { user } = renderButton();
    const dialog = await openConfirmation(user);

    await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const confirmButton = within(screen.getByRole("alertdialog")).getByRole("button", { name: /Supprimer/ });
    expect(confirmButton).toHaveAttribute("aria-disabled", "true");
    expect(toast.success).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("AC4 shows exactly one error toast on a failure with a retrying client, no success and no onDeleted", async () => {
    mockFetch.mockImplementation(async () => new Response(JSON.stringify({ message: "boom" }), { status: 500 }));
    const { user } = renderButton();
    const dialog = await openConfirmation(user);

    await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
    expect(vi.mocked(toast.danger).mock.calls[0][0]).toEqual(expect.stringMatching(/\S/));
    expect(toast.success).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Supprimer mon avis" })).toBeEnabled();
  });

  it("AC4 lets the user confirm again after a failed deletion", async () => {
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

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
