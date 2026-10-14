import { toast } from "@heroui/react";
import { QueryClient } from "@tanstack/react-query";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { ReviewSheet } from "@/pages/beerDetail/components/widgets/reviewSheet/reviewSheet";
import i18n from "@/i18n/i18n";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import type { Beer } from "@/types/models/beer/beer";
import type { Review } from "@/types/models/review/review";
import { BEER_MY_REVIEW } from "@/utils/apiURL/apiURL";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { reviewKeys } from "@/utils/queryKeys/reviewQueryKeys";

const CHIMAY: Beer = {
  id: 1,
  name: "Chimay Rouge",
  breweryName: "Bières de Chimay",
  country: "BE",
  styleId: 4,
  styleName: "Dubbel trappiste",
  family: BeerFamilyEnum.TRAPPIST,
  abv: 7,
  aromas: [],
  formats: [],
  description: "Une trappiste cuivrée.",
  drunk: true,
  checkinCount: 1,
  inWishlist: false,
  bitternessLevel: null,
  colorLevel: null,
  styleColorRange: null,
  averageRating: null,
  reviewCount: 0,
  ratingDistribution: [],
  criteria: [],
};

const MINE: Review = {
  id: 100,
  beerId: 1,
  authorId: 1,
  authorName: "Moi",
  authorAvatarColor: "#10B981",
  rating: 3.5,
  text: "Mon avis perso",
  sweetness: 2,
  acidity: null,
  body: 5,
  createdAt: "2026-10-10T12:00:00.000Z",
  updatedAt: "2026-10-12T12:00:00.000Z",
  isMine: true,
};

const savedDto = { ...MINE, rating: 4, text: "" };

const mockFetch = vi.fn();

const answerWith = (status: number, body: unknown = savedDto) =>
  mockFetch.mockImplementation(async () => new Response(JSON.stringify(body), { status }));

const renderSheet = (
  props: { mine?: Review | null; isDisabled?: boolean } = {},
  queryClient = new QueryClient(),
) => {
  return renderWithProviders(<ReviewSheet beer={CHIMAY} mine={props.mine ?? null} isDisabled={props.isDisabled ?? false} />, {
    queryClient,
  });
};

const openSheet = async (user: ReturnType<typeof userEvent.setup>, name = "Donner mon avis") => {
  await user.click(screen.getByRole("button", { name }));
  return screen.findByRole("dialog");
};

const ratingSlider = () => screen.getByRole("slider", { name: "Note" });

const chooseFour = async (user: ReturnType<typeof userEvent.setup>) => {
  ratingSlider().focus();
  await user.keyboard("{ArrowRight}{ArrowRight}");
};

const publish = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Publier mon avis" }));

describe("ReviewSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    vi.spyOn(toast, "success").mockImplementation(() => "toast-id");
    vi.spyOn(toast, "danger").mockImplementation(() => "toast-id");
    answerWith(200);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await i18n.changeLanguage("fr");
  });

  describe("trigger", () => {
    it("is the large Donner mon avis button and opens no sheet by itself", async () => {
      renderSheet();

      const trigger = screen.getByRole("button", { name: "Donner mon avis" });
      expect(trigger.className).toContain("button--lg");
      expect(trigger).toBeEnabled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("AC3 says Modifier mon avis when my review exists", async () => {
      renderSheet({ mine: MINE });

      expect(screen.getByRole("button", { name: "Modifier mon avis" })).toBeEnabled();
      expect(screen.queryByRole("button", { name: "Donner mon avis" })).not.toBeInTheDocument();
    });

    it("AC2 is disabled and opens nothing when the parent disables it", async () => {
      const user = userEvent.setup();
      renderSheet({ isDisabled: true });

      const trigger = screen.getByRole("button", { name: "Donner mon avis" });
      expect(trigger).toBeDisabled();
      await user.click(trigger);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders the trigger and the title in English", async () => {
      await i18n.changeLanguage("en");
      const user = userEvent.setup();
      renderSheet();

      const dialog = await openSheet(user, "Write a review");

      expect(within(dialog).getByRole("heading", { name: "Your review of Chimay Rouge" })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "Close" })).toBeInTheDocument();
    });
  });

  describe("sheet", () => {
    it("AC5 opens a full-height bottom sheet titled with the beer, with a scrolling body and the empty form", async () => {
      const user = userEvent.setup();
      renderSheet();

      const dialog = await openSheet(user);

      expect(within(dialog).getByRole("heading", { name: "Votre avis sur Chimay Rouge" })).toBeInTheDocument();
      expect(dialog.closest(".h-dvh")).not.toBeNull();
      expect(within(dialog).getByRole("textbox", { name: "Votre avis" }).closest(".overflow-y-auto")).not.toBeNull();
      expect(dialog.closest(".overflow-y-auto")).toBeNull();
      expect(within(dialog).getByRole("button", { name: "Publier mon avis" }).className).toContain("button--lg");
      expect(within(dialog).getByRole("button", { name: "Fermer" }).className).toContain("button--lg");
      expect(within(dialog).getByRole("textbox", { name: "Votre avis" })).toHaveValue("");
    });

    it("AC5 closes with Escape and with the Fermer button", async () => {
      const user = userEvent.setup();
      renderSheet();
      const dialog = await openSheet(user);

      ratingSlider().focus();
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

      const reopened = await openSheet(user);
      await user.click(within(reopened).getByRole("button", { name: "Fermer" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(dialog).not.toBe(reopened);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("AC3 opens prefilled with my review and shows it again after a close without saving", async () => {
      const user = userEvent.setup();
      renderSheet({ mine: MINE });
      const dialog = await openSheet(user, "Modifier mon avis");

      expect(ratingSlider()).toHaveValue("3.5");
      expect(within(dialog).getByRole("textbox", { name: "Votre avis" })).toHaveValue("Mon avis perso");
      expect(screen.getByRole("slider", { name: "Douceur" })).toHaveValue("2");
      expect(screen.getByRole("slider", { name: "Acidité" })).toHaveValue("0");
      expect(screen.getByRole("slider", { name: "Corps" })).toHaveValue("5");

      await user.type(within(dialog).getByRole("textbox", { name: "Votre avis" }), " en plus");
      ratingSlider().focus();
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      const reopened = await openSheet(user, "Modifier mon avis");

      expect(within(reopened).getByRole("textbox", { name: "Votre avis" })).toHaveValue("Mon avis perso");
    });
  });

  describe("AC1 when the review is published", () => {
    it("puts the review, closes the sheet and shows Avis enregistré once", async () => {
      const user = userEvent.setup();
      renderSheet();
      await openSheet(user);

      await chooseFour(user);
      await publish(user);

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(BEER_MY_REVIEW(1));
      expect(init.method).toBe("PUT");
      expect(JSON.parse(init.body as string)).toEqual({
        rating: 4,
        text: "",
        sweetness: null,
        acidity: null,
        body: null,
      });
      expect(toast.success).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith("Avis enregistré");
      expect(toast.danger).not.toHaveBeenCalled();
    });

    it("rereads the beer sheet, the catalog and the review list of this beer", async () => {
      const user = userEvent.setup();
      const queryClient = new QueryClient();
      const invalidate = vi.spyOn(queryClient, "invalidateQueries");
      renderSheet({}, queryClient);
      await openSheet(user);

      await chooseFour(user);
      await publish(user);

      await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(2));
      expect(invalidate).toHaveBeenCalledWith({ queryKey: beerKeys.all() });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: reviewKeys.list(1) });
    });

    it("sends my edited review when I modify it, criteria untouched kept", async () => {
      const user = userEvent.setup();
      renderSheet({ mine: MINE });
      await openSheet(user, "Modifier mon avis");

      ratingSlider().focus();
      await user.keyboard("{ArrowRight}");
      await publish(user);

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
      const init = mockFetch.mock.calls[0][1] as RequestInit;
      expect(JSON.parse(init.body as string)).toEqual({
        rating: 4,
        text: "Mon avis perso",
        sweetness: 2,
        acidity: null,
        body: 5,
      });
    });

    it("sends nothing and stays open when no rating was chosen", async () => {
      const user = userEvent.setup();
      renderSheet();
      await openSheet(user);

      await publish(user);

      expect(screen.getByRole("alert")).toHaveTextContent("La note est obligatoire");
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("AC4 when the server fails", () => {
    it("shows one Enregistrez d'abord une dégustation toast on a 403 and keeps the sheet open with the input", async () => {
      const user = userEvent.setup();
      answerWith(403, { message: "You must check in this beer before reviewing it." });
      const queryClient = new QueryClient();
      const invalidate = vi.spyOn(queryClient, "invalidateQueries");
      renderSheet({}, queryClient);
      const dialog = await openSheet(user);

      await user.type(within(dialog).getByRole("textbox", { name: "Votre avis" }), "Brune et ronde");
      await chooseFour(user);
      await publish(user);

      await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
      expect(toast.danger).toHaveBeenCalledWith("Enregistrez d'abord une dégustation de cette bière.");
      expect(screen.getByRole("dialog")).toBe(dialog);
      expect(within(dialog).getByRole("textbox", { name: "Votre avis" })).toHaveValue("Brune et ronde");
      expect(ratingSlider()).toHaveValue("4");
      expect(toast.success).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("shows the message of the status on another error, keeps the sheet open and accepts a new send", async () => {
      const user = userEvent.setup();
      answerWith(500, { message: "boom" });
      renderSheet();
      await openSheet(user);
      await chooseFour(user);

      await publish(user);

      await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
      expect(toast.danger).toHaveBeenCalledWith(i18n.t("errors.generic"));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      answerWith(200);
      await publish(user);

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(toast.danger).toHaveBeenCalledTimes(1);
    });

    it("shows the not found message on a 404", async () => {
      const user = userEvent.setup();
      answerWith(404, { message: "Beer 1 not found" });
      renderSheet();
      await openSheet(user);
      await chooseFour(user);

      await publish(user);

      await waitFor(() => expect(toast.danger).toHaveBeenCalledWith(i18n.t("errors.notFound")));
      expect(toast.danger).toHaveBeenCalledTimes(1);
    });
  });
});

describe("ReviewSheet deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    vi.spyOn(toast, "success").mockImplementation(() => "toast-id");
    vi.spyOn(toast, "danger").mockImplementation(() => "toast-id");
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const openDeleteConfirmation = async (user: ReturnType<typeof userEvent.setup>) => {
    const dialog = await openSheet(user, "Modifier mon avis");
    await user.click(within(dialog).getByRole("button", { name: "Supprimer mon avis" }));
    return screen.findByRole("alertdialog");
  };

  it("AC5 does not show Supprimer mon avis when I have no review", async () => {
    const user = userEvent.setup();
    renderSheet();

    const dialog = await openSheet(user);

    expect(within(dialog).queryByRole("button", { name: "Supprimer mon avis" })).not.toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("AC1 shows Supprimer mon avis in the sheet when my review exists and asks Supprimer votre avis ?", async () => {
    const user = userEvent.setup();
    renderSheet({ mine: MINE });

    const confirmation = await openDeleteConfirmation(user);

    expect(confirmation).toHaveAccessibleName("Supprimer votre avis ?");
    expect(within(confirmation).getByRole("button", { name: "Annuler" })).toBeInTheDocument();
    expect(within(confirmation).getByRole("button", { name: "Supprimer" })).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("AC2 keeps the sheet open and deletes nothing when Annuler is pressed", async () => {
    const user = userEvent.setup();
    renderSheet({ mine: MINE });
    const confirmation = await openDeleteConfirmation(user);

    await user.click(within(confirmation).getByRole("button", { name: "Annuler" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("AC2 keeps the sheet open and deletes nothing when Escape is pressed on the confirmation", async () => {
    const user = userEvent.setup();
    renderSheet({ mine: MINE });
    await openDeleteConfirmation(user);

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("AC3 deletes once, closes the sheet, shows Avis supprimé and rereads the beers and the reviews", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    renderSheet({ mine: MINE }, queryClient);
    const confirmation = await openDeleteConfirmation(user);

    await user.click(within(confirmation).getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(BEER_MY_REVIEW(1));
    expect(init.method).toBe("DELETE");
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Avis supprimé");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: beerKeys.all() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: reviewKeys.list(1) });
  });

  it("AC4 shows one error toast, keeps the sheet and my review on a failure", async () => {
    const user = userEvent.setup();
    mockFetch.mockImplementation(async () => new Response(JSON.stringify({ message: "boom" }), { status: 500 }));
    renderSheet({ mine: MINE });
    const confirmation = await openDeleteConfirmation(user);

    await user.click(within(confirmation).getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
    expect(toast.danger).toHaveBeenCalledWith(i18n.t("errors.generic"));
    expect(toast.success).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("textbox", { name: "Votre avis" })).toHaveValue("Mon avis perso");
    expect(within(dialog).getByRole("button", { name: "Supprimer mon avis" })).toBeEnabled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
