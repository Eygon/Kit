import { Button, toast } from "@heroui/react";
import { QueryClient } from "@tanstack/react-query";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import VenueService from "@/api/venues/venueService";
import { CheckinSheet } from "@/components/modules/checkinSheet/checkinSheet";
import { clearCheckinDraft, getCheckinDraft } from "@/components/modules/checkinSheet/utils/checkinDraftStore";
import { BeerAromaEnum } from "@/types/enums/beer/beerAromaEnum";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { BeerFormatEnum } from "@/types/enums/beer/beerFormatEnum";
import { BeerSourceEnum } from "@/types/enums/beer/beerSourceEnum";
import { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";
import { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";
import type { Beer } from "@/types/models/beer/beer";
import type { Checkin } from "@/types/models/checkin/checkin";
import type { Venue } from "@/types/models/venue/venue";
import { CHECKIN_BY_ID, CHECKINS } from "@/utils/apiURL/apiURL";
import { badgeKeys } from "@/utils/queryKeys/badgeQueryKeys";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { checkinKeys } from "@/utils/queryKeys/checkinQueryKeys";
import { dexKeys } from "@/utils/queryKeys/dexQueryKeys";
import { feedKeys } from "@/utils/queryKeys/feedQueryKeys";
import { statsKeys } from "@/utils/queryKeys/statsQueryKeys";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";
import { StorageKeyEnum } from "@/types/enums/storage/storageKeyEnum";

vi.mock("@/api/venues/venueService", () => ({
  default: { search: vi.fn() },
}));

const found = (venues: Venue[], isApproximate = false) => ({ venues, isApproximate });

const CLUNY: Venue = {
  id: 5,
  name: "La Taverne de Cluny",
  type: VenueTypeEnum.BAR,
  city: "Paris",
  address: "1 rue de Cluny",
  latitude: 48.85,
  longitude: 2.35,
  description: "",
  distanceKm: null,
  checkinCount: 0,
  lastCheckinAt: null,
  status: AvailabilityStatusEnum.CONFIRMED,
};

const CHIMAY: Beer = {
  id: 1,
  name: "Chimay Rouge",
  breweryName: "Bières de Chimay",
  country: "BE",
  styleId: 4,
  styleName: "Dubbel trappiste",
  family: BeerFamilyEnum.TRAPPIST,
  abv: 7,
  aromas: [BeerAromaEnum.FRUITY],
  formats: [BeerFormatEnum.BOTTLE],
  description: "Une trappiste cuivrée.",
  drunk: false,
  checkinCount: 0,
  inWishlist: false,
  bitternessLevel: null,
  colorLevel: null,
  styleColorRange: null,
  averageRating: null,
  reviewCount: 0,
  ratingDistribution: [],
  source: BeerSourceEnum.OFFICIAL,
  createdByName: null,
  ibu: null,
  ebc: null,
  sweetness: null,
  acidity: null,
  body: null,
  createdBy: null,
};

const checkinDto = {
  id: 11,
  beerId: 1,
  beerName: "Chimay Rouge",
  drankAt: "2026-10-12T10:00:00.000Z",
  place: "Chez Paul",
  rating: null,
  aromas: [],
  format: "bottle",
  price: null,
  comment: "",
  photoId: null,
  venueId: null,
};

const resetDrafts = () => {
  [1, 2].forEach((userId) => [1, 2].forEach((beerId) => clearCheckinDraft(userId, beerId)));
};

const mockFetch = vi.fn();

const answerWith = (isFirstDiscovery: boolean) =>
  mockFetch.mockImplementation(
    async () => new Response(JSON.stringify({ checkin: checkinDto, isFirstDiscovery }), { status: 201 }),
  );

const renderSheet = (queryClient = new QueryClient()) => renderWithProviders(<CheckinSheet beer={CHIMAY} />, { queryClient });

const openSheet = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Je l'ai bue" }));
  return screen.findByRole("dialog");
};

const fillAndSend = async (user: ReturnType<typeof userEvent.setup>, place = "Chez Paul") => {
  await user.type(screen.getByRole("combobox", { name: /^Lieu/ }), place);
  await user.tab();
  await user.click(screen.getByRole("radio", { name: "Bouteille" }));
  await user.click(screen.getByRole("button", { name: "Enregistrer" }));
};

describe("CheckinSheet", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetDrafts();
    vi.clearAllMocks();
    Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, writable: true, value: vi.fn() });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 12, 12, 0));
    vi.stubGlobal("fetch", mockFetch);
    vi.mocked(VenueService.search).mockResolvedValue(found([CLUNY]));
    vi.spyOn(toast, "success").mockImplementation(() => "toast-id");
    vi.spyOn(toast, "danger").mockImplementation(() => "toast-id");
    answerWith(false);
  });

  afterEach(() => {
    resetDrafts();
    window.localStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("trigger", () => {
    it("is the amber large primary button « Je l'ai bue » and opens no sheet by itself", () => {
      renderSheet();

      const trigger = screen.getByRole("button", { name: "Je l'ai bue" });
      expect(trigger.className).toContain("button--primary");
      expect(trigger.className).toContain("button--lg");
      expect(trigger.className).toContain("bg-highlight");
      expect(trigger.className).toContain("text-highlight-foreground");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("opens a full-height bottom sheet titled with the beer and showing the empty form dated now", async () => {
      const user = userEvent.setup();
      renderSheet();

      const dialog = await openSheet(user);

      expect(within(dialog).getByRole("heading", { name: "Je l'ai bue : Chimay Rouge" })).toBeInTheDocument();
      expect(within(dialog).getByLabelText("Date et heure")).toHaveValue("2026-10-12T12:00");
      expect(within(dialog).getByRole("button", { name: "Enregistrer" })).toBeInTheDocument();
      expect(document.querySelector(".h-dvh")).not.toBeNull();
    });
  });

  describe("after a first discovery", () => {
    it("replaces the form with the captured mascot, the title and a close button", async () => {
      const user = userEvent.setup();
      answerWith(true);
      renderSheet();
      const dialog = await openSheet(user);

      await fillAndSend(user);

      expect(await within(dialog).findByText("Nouvelle bière capturée !")).toBeInTheDocument();
      expect(within(dialog).getByText("Chimay Rouge rejoint votre Pokédex.")).toBeInTheDocument();
      expect(dialog.querySelector('[data-slot="mascot"]')).toHaveAttribute("data-mood", "captured");
      expect(within(dialog).getByRole("button", { name: "Fermer" })).toBeInTheDocument();
      expect(within(dialog).queryByRole("button", { name: "Enregistrer" })).not.toBeInTheDocument();
      expect(toast.success).not.toHaveBeenCalled();
    });

    it("closes the sheet with the close button, and a new opening shows a fresh form again", async () => {
      const user = userEvent.setup();
      answerWith(true);
      renderSheet();
      const dialog = await openSheet(user);
      await fillAndSend(user);
      await user.click(await within(dialog).findByRole("button", { name: "Fermer" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

      const reopened = await openSheet(user);

      expect(within(reopened).queryByText("Nouvelle bière capturée !")).not.toBeInTheDocument();
      expect(within(reopened).getByRole("button", { name: "Enregistrer" })).toBeInTheDocument();
    });

    it("refreshes the grid, the progress and the history", async () => {
      const user = userEvent.setup();
      answerWith(true);
      const queryClient = new QueryClient();
      const invalidate = vi.spyOn(queryClient, "invalidateQueries");
      renderSheet(queryClient);
      await openSheet(user);

      await fillAndSend(user);

      await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(4));
      expect(invalidate).toHaveBeenCalledWith({ queryKey: beerKeys.all() });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: dexKeys.all() });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: checkinKeys.all() });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: venueKeys.all() });
    });
  });

  describe("when it is not the first tasting", () => {
    it("closes the sheet, shows the success message and shows no mascot", async () => {
      const user = userEvent.setup();
      renderSheet();
      await openSheet(user);

      await fillAndSend(user);

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(toast.success).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith("Dégustation enregistrée.");
      expect(document.querySelector('[data-slot="mascot"]')).toBeNull();
    });

    it("refreshes the grid, the progress and the history", async () => {
      const user = userEvent.setup();
      const queryClient = new QueryClient();
      const invalidate = vi.spyOn(queryClient, "invalidateQueries");
      renderSheet(queryClient);
      await openSheet(user);

      await fillAndSend(user);

      await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(4));
      expect(invalidate).toHaveBeenCalledWith({ queryKey: beerKeys.all() });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: dexKeys.all() });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: checkinKeys.all() });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: venueKeys.all() });
    });

    it("posts the tasting of this beer to the checkins url", async () => {
      const user = userEvent.setup();
      renderSheet();
      await openSheet(user);

      await fillAndSend(user, "Chez Paul");

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(CHECKINS());
      expect(init.method).toBe("POST");
      const body = init.body as FormData;
      expect(body.get("beerId")).toBe("1");
      expect(body.get("place")).toBe("Chez Paul");
      expect(body.get("format")).toBe("bottle");
      expect(body.has("venueId")).toBe(false);
    });

    it("posts the reference of the venue chosen in the place suggestions with its name as the place", async () => {
      const user = userEvent.setup();
      renderSheet();
      await openSheet(user);
      await user.type(screen.getByRole("combobox", { name: /^Lieu/ }), "taverne");
      await waitFor(() => expect(VenueService.search).toHaveBeenLastCalledWith(expect.objectContaining({ q: "taverne" })), { timeout: 4000 });
      await user.click(await screen.findByRole("option", { name: /La Taverne de Cluny/ }));
      await user.click(screen.getByRole("radio", { name: "Bouteille" }));
      await user.click(screen.getByRole("button", { name: "Enregistrer" }));

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
      const body = (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as FormData;
      expect(body.get("place")).toBe("La Taverne de Cluny");
      expect(body.get("venueId")).toBe("5");
    });
  });

  describe("when the server fails", () => {
    it("shows one error message and keeps the sheet open with the input intact", async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(async () => new Response(JSON.stringify({ message: "boom" }), { status: 500 }));
      const queryClient = new QueryClient();
      const invalidate = vi.spyOn(queryClient, "invalidateQueries");
      renderSheet(queryClient);
      const dialog = await openSheet(user);

      await fillAndSend(user, "Chez Paul");

      await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
      expect(vi.mocked(toast.danger).mock.calls[0][0]).toEqual(expect.stringMatching(/\S/));
      expect(screen.getByRole("dialog")).toBe(dialog);
      expect(within(dialog).getByRole("combobox", { name: /^Lieu/ })).toHaveValue("Chez Paul");
      expect(within(dialog).getByRole("radio", { name: "Bouteille" })).toBeChecked();
      expect(within(dialog).queryByText("Nouvelle bière capturée !")).not.toBeInTheDocument();
      expect(toast.success).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("the sending state of the button", () => {
    it("shows Enregistrement… and busy while the tasting is being created, sends it once, then closes", async () => {
      const user = userEvent.setup();
      let answer!: (response: Response) => void;
      mockFetch.mockImplementation(() => new Promise<Response>((resolve) => (answer = resolve)));
      renderSheet();
      const dialog = await openSheet(user);

      await fillAndSend(user);

      const pending = await within(dialog).findByRole("button", { name: /Enregistrement…/ });
      expect(pending).toHaveAttribute("aria-busy", "true");
      expect(within(dialog).queryByRole("button", { name: "Enregistrer" })).not.toBeInTheDocument();
      await user.click(pending);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      answer(new Response(JSON.stringify({ checkin: checkinDto, isFirstDiscovery: false }), { status: 201 }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("takes the label back and the busy state off once a creation fails", async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(async () => new Response(JSON.stringify({ message: "boom" }), { status: 500 }));
      renderSheet();
      const dialog = await openSheet(user);

      await fillAndSend(user);

      await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
      const button = await within(dialog).findByRole("button", { name: "Enregistrer" });
      expect(button).toHaveAttribute("aria-busy", "false");
      expect(within(dialog).queryByRole("button", { name: /Enregistrement…/ })).not.toBeInTheDocument();
    });
  });

  describe("when it is closed then opened again", () => {
    it("shows a fresh form dated now, without the previous input, once the restored draft is cleared", async () => {
      const user = userEvent.setup();
      renderSheet();
      const dialog = await openSheet(user);
      await user.type(within(dialog).getByRole("combobox", { name: /^Lieu/ }), "Chez Paul");
      await user.tab();
      await user.click(within(dialog).getByRole("radio", { name: "Canette" }));
      await user.click(within(dialog).getByRole("row", { name: "Fruité" }));
      fireEvent.change(within(dialog).getByLabelText("Date et heure"), { target: { value: "2026-10-01T08:30" } });
      within(dialog).getByRole("combobox", { name: /^Lieu/ }).focus();
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      vi.setSystemTime(new Date(2026, 9, 12, 14, 45));

      const reopened = await openSheet(user);
      await user.click(within(reopened).getByRole("button", { name: "Effacer le brouillon" }));

      expect(within(reopened).getByRole("combobox", { name: /^Lieu/ })).toHaveValue("");
      expect(within(reopened).getByLabelText("Date et heure")).toHaveValue("2026-10-12T14:45");
      within(reopened)
        .getAllByRole("radio")
        .forEach((radio) => expect(radio).not.toBeChecked());
      expect(within(reopened).getByRole("row", { name: "Fruité" })).toHaveAttribute("aria-selected", "false");
    });
  });

  describe("when the sheet is closed while the tasting is being sent", () => {
    it("lets the request finish, refreshes the data and shows the success message", async () => {
      const user = userEvent.setup();
      let answer!: (response: Response) => void;
      mockFetch.mockImplementation(() => new Promise<Response>((resolve) => (answer = resolve)));
      const queryClient = new QueryClient();
      const invalidate = vi.spyOn(queryClient, "invalidateQueries");
      renderSheet(queryClient);
      const dialog = await openSheet(user);
      await fillAndSend(user);
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
      within(dialog).getByRole("combobox", { name: /^Lieu/ }).focus();
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(invalidate).not.toHaveBeenCalled();

      answer(new Response(JSON.stringify({ checkin: checkinDto, isFirstDiscovery: false }), { status: 201 }));

      await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(4));
      expect(toast.success).toHaveBeenCalledWith("Dégustation enregistrée.");
      expect(toast.success).toHaveBeenCalledTimes(1);
      expect(toast.danger).not.toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("in edit mode", () => {
    const EDITED: Checkin = {
      id: 11,
      beerId: 1,
      beerName: "Chimay Rouge",
      drankAt: "2026-10-10T08:00:00.000Z",
      place: "La Taverne de Cluny",
      rating: 3,
      aromas: [BeerAromaEnum.FRUITY],
      format: BeerFormatEnum.BOTTLE,
      price: 4.5,
      comment: "Top",
      photoId: "6f1c0a52-8d3e-4c7b-9a1f-2b5e7d9c0a11",
      venueId: 5,
    };

    const DELETE_ACTION_LABEL = "Mauvaise bière ? Supprimer et recréer";
    const deleteActionSpy = vi.fn();

    const renderEditSheet = (queryClient = new QueryClient()) =>
      renderWithProviders(
        <CheckinSheet
          checkin={EDITED}
          renderDeleteAction={(close) => {
            deleteActionSpy(close);
            return <Button onPress={close}>{DELETE_ACTION_LABEL}</Button>;
          }}
        />,
        { queryClient },
      );

    const openEditSheet = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole("button", { name: "Modifier la dégustation" }));
      return screen.findByRole("dialog");
    };

    const answerWithPatch = () =>
      mockFetch.mockImplementation(async () => new Response(JSON.stringify({ ...checkinDto, id: 11, rating: 4 }), { status: 200 }));

    const setRatingToFour = async (user: ReturnType<typeof userEvent.setup>) => {
      screen.getByRole("slider").focus();
      await user.keyboard("{ArrowRight}{ArrowRight}");
    };

    beforeEach(() => {
      deleteActionSpy.mockClear();
      answerWithPatch();
    });

    it("shows an icon-only pencil button labelled « Modifier la dégustation » and opens nothing by itself", () => {
      renderEditSheet();

      const trigger = screen.getByRole("button", { name: "Modifier la dégustation" });
      expect(trigger.className).toContain("button--icon-only");
      expect(trigger.querySelector("svg")).not.toBeNull();
      expect(trigger).toHaveTextContent("");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Je l'ai bue" })).not.toBeInTheDocument();
    });

    it("opens a sheet titled « Modifier : » with the beer, prefilled, with no photo picker", async () => {
      const user = userEvent.setup();
      renderEditSheet();

      const dialog = await openEditSheet(user);

      expect(within(dialog).getByRole("heading", { name: "Modifier : Chimay Rouge" })).toBeInTheDocument();
      expect((within(dialog).getByLabelText("Date et heure") as HTMLInputElement).value).toMatch(/^2026-10-10T\d\d:00$/);
      expect(within(dialog).getByRole("combobox", { name: /^Lieu/ })).toHaveValue("La Taverne de Cluny");
      expect(within(dialog).getByText("3 / 5")).toBeInTheDocument();
      expect(within(dialog).getByRole("row", { name: "Fruité" })).toHaveAttribute("aria-selected", "true");
      expect(within(dialog).getByRole("radio", { name: "Bouteille" })).toBeChecked();
      expect((within(dialog).getByRole("textbox", { name: "Prix" }) as HTMLInputElement).value).toMatch(/4,50/);
      expect((within(dialog).getByLabelText("Commentaire") as HTMLTextAreaElement).value).toBe("Top");
      expect(within(dialog).getByRole("button", { name: "Enregistrer" })).toBeInTheDocument();
      expect(within(dialog).queryByRole("button", { name: "Prendre une photo" })).not.toBeInTheDocument();
      expect(within(dialog).queryByRole("button", { name: "Choisir dans la galerie" })).not.toBeInTheDocument();
    });

    it("sends only the rating, shows the success message, closes and refreshes every dependent list", async () => {
      const user = userEvent.setup();
      const queryClient = new QueryClient();
      const invalidate = vi.spyOn(queryClient, "invalidateQueries");
      renderEditSheet(queryClient);
      await openEditSheet(user);
      await setRatingToFour(user);

      await user.click(screen.getByRole("button", { name: "Enregistrer" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(CHECKIN_BY_ID(11));
      expect(init.method).toBe("PATCH");
      expect(JSON.parse(init.body as string)).toEqual({ rating: 4 });
      expect(toast.success).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith("Dégustation modifiée.");
      await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(7));
      [checkinKeys, beerKeys, dexKeys, venueKeys, statsKeys, feedKeys, badgeKeys].forEach((keys) =>
        expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.all() }),
      );
    });

    it("sends the comment alone when only the comment is edited, the venue staying linked", async () => {
      const user = userEvent.setup();
      renderEditSheet();
      const dialog = await openEditSheet(user);
      await user.type(within(dialog).getByLabelText("Commentaire"), "!");
      await user.click(within(dialog).getByRole("button", { name: "Enregistrer" }));
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
      expect(JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)).toEqual({ comment: "Top!" });
    });

    it("sends the place and a null venue together when the place text is edited", async () => {
      const user = userEvent.setup();
      renderEditSheet();
      const dialog = await openEditSheet(user);
      await user.type(within(dialog).getByRole("combobox", { name: /^Lieu/ }), " bis");
      await user.tab();

      await user.click(within(dialog).getByRole("button", { name: "Enregistrer" }));

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
      expect(JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)).toEqual({
        place: "La Taverne de Cluny bis",
        venueId: null,
      });
    });

    it("shows Enregistrement… and busy while the correction is being sent, sends it once, then closes", async () => {
      const user = userEvent.setup();
      let answer!: (response: Response) => void;
      mockFetch.mockImplementation(() => new Promise<Response>((resolve) => (answer = resolve)));
      renderEditSheet();
      const dialog = await openEditSheet(user);
      await setRatingToFour(user);

      await user.click(within(dialog).getByRole("button", { name: "Enregistrer" }));

      const pending = await within(dialog).findByRole("button", { name: /Enregistrement…/ });
      expect(pending).toHaveAttribute("aria-busy", "true");
      expect(within(dialog).queryByRole("button", { name: "Enregistrer" })).not.toBeInTheDocument();
      await user.click(pending);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      answer(new Response(JSON.stringify({ ...checkinDto, rating: 4 }), { status: 200 }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("closes without any request nor message when nothing changed", async () => {
      const user = userEvent.setup();
      const queryClient = new QueryClient();
      const invalidate = vi.spyOn(queryClient, "invalidateQueries");
      renderEditSheet(queryClient);
      await openEditSheet(user);

      await user.click(screen.getByRole("button", { name: "Enregistrer" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(mockFetch).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
    });

    it("shows the message under the date and sends nothing for a future date", async () => {
      const user = userEvent.setup();
      renderEditSheet();
      const dialog = await openEditSheet(user);
      fireEvent.change(within(dialog).getByLabelText("Date et heure"), { target: { value: "2026-10-12T12:01" } });

      await user.click(within(dialog).getByRole("button", { name: "Enregistrer" }));

      const message = await within(dialog).findByText("La date ne peut pas être dans le futur.");
      const date = within(dialog).getByLabelText("Date et heure");
      const place = within(dialog).getByRole("combobox", { name: /^Lieu/ });
      expect(date.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(message.compareDocumentPosition(place) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(date).toHaveAccessibleDescription("La date ne peut pas être dans le futur.");
      expect(mockFetch).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog")).toBe(dialog);
    });

    it.each([403, 404])("shows one error message and keeps the sheet open with the values on a %s", async (status) => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(async () => new Response(JSON.stringify({ message: "no" }), { status }));
      const queryClient = new QueryClient();
      const invalidate = vi.spyOn(queryClient, "invalidateQueries");
      renderEditSheet(queryClient);
      const dialog = await openEditSheet(user);
      await user.type(within(dialog).getByLabelText("Commentaire"), "!");

      await user.click(within(dialog).getByRole("button", { name: "Enregistrer" }));

      await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
      expect(vi.mocked(toast.danger).mock.calls[0][0]).toEqual(expect.stringMatching(/\S/));
      await waitFor(() => expect(within(dialog).getByRole("button", { name: "Enregistrer" })).not.toHaveAttribute("data-pending"));
      expect(screen.getByRole("dialog")).toBe(dialog);
      expect((within(dialog).getByLabelText("Commentaire") as HTMLTextAreaElement).value).toBe("Top!");
      expect(within(dialog).getByRole("combobox", { name: /^Lieu/ })).toHaveValue("La Taverne de Cluny");
      expect(toast.success).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("renders the delete action below the form and hands it a function that closes the sheet", async () => {
      const user = userEvent.setup();
      renderEditSheet();
      const dialog = await openEditSheet(user);

      const deleteAction = within(dialog).getByRole("button", { name: DELETE_ACTION_LABEL });
      const submit = within(dialog).getByRole("button", { name: "Enregistrer" });

      expect(submit.compareDocumentPosition(deleteAction) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(deleteAction.closest("form")).toBeNull();
      await user.click(deleteAction);
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("shows the tasting as it is stored each time it is opened again", async () => {
      const user = userEvent.setup();
      renderEditSheet();
      const dialog = await openEditSheet(user);
      await user.type(within(dialog).getByLabelText("Commentaire"), "!!");
      within(dialog).getByRole("combobox", { name: /^Lieu/ }).focus();
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

      const reopened = await openEditSheet(user);

      expect((within(reopened).getByLabelText("Commentaire") as HTMLTextAreaElement).value).toBe("Top");
    });
  });

  describe("the draft", () => {
    const ORVAL: Beer = { ...CHIMAY, id: 2, name: "Orval" };
    const RESTORED = "Brouillon repris";
    const CLEAR = "Effacer le brouillon";

    const png = () => new File([new Uint8Array(10)], "beer.png", { type: "image/png" });

    const choosePhoto = (dialog: HTMLElement, file: File) =>
      fireEvent.change(dialog.querySelector('input[type="file"]:not([capture])') as HTMLInputElement, { target: { files: [file] } });

    beforeEach(() => {
      Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: vi.fn((file: File) => `blob:${file.name}`) });
      Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
    });

    const closeWithEscape = async (user: ReturnType<typeof userEvent.setup>) => {
      screen.getByRole("combobox", { name: /^Lieu/ }).focus();
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    };

    const fillDraftAndClose = async (user: ReturnType<typeof userEvent.setup>) => {
      const dialog = await openSheet(user);
      await user.type(within(dialog).getByRole("combobox", { name: /^Lieu/ }), "Chez Paul");
      await user.tab();
      await user.click(within(dialog).getByRole("radio", { name: "Canette" }));
      await user.click(within(dialog).getByRole("row", { name: "Fruité" }));
      await user.type(within(dialog).getByLabelText("Commentaire"), "Super");
      fireEvent.change(within(dialog).getByLabelText("Date et heure"), { target: { value: "2026-10-01T08:30" } });
      within(dialog).getByRole("slider").focus();
      await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}");
      await closeWithEscape(user);
    };

    it("brings back the place, aromas, comment, rating, format and date typed before closing, with the mention and its clear button", async () => {
      const user = userEvent.setup();
      renderSheet();
      await fillDraftAndClose(user);
      vi.setSystemTime(new Date(2026, 9, 12, 14, 45));

      const reopened = await openSheet(user);

      expect(within(reopened).getByRole("combobox", { name: /^Lieu/ })).toHaveValue("Chez Paul");
      expect(within(reopened).getByRole("radio", { name: "Canette" })).toBeChecked();
      expect(within(reopened).getByRole("row", { name: "Fruité" })).toHaveAttribute("aria-selected", "true");
      expect((within(reopened).getByLabelText("Commentaire") as HTMLTextAreaElement).value).toBe("Super");
      expect(within(reopened).getByLabelText("Date et heure")).toHaveValue("2026-10-01T08:30");
      expect(within(reopened).getByText("3 / 5")).toBeInTheDocument();
      expect(within(reopened).getByText(RESTORED)).toBeInTheDocument();
      expect(within(reopened).getByRole("button", { name: CLEAR })).toBeInTheDocument();
    });

    it("brings back the photo chosen before closing, even when it is the only thing typed, and still sends it", async () => {
      const user = userEvent.setup();
      renderSheet();
      const dialog = await openSheet(user);
      choosePhoto(dialog, png());
      expect(await within(dialog).findByRole("img", { name: "Aperçu de la photo" })).toBeInTheDocument();
      await closeWithEscape(user);

      const reopened = await openSheet(user);

      expect(await within(reopened).findByRole("img", { name: "Aperçu de la photo" })).toBeInTheDocument();
      expect(within(reopened).getByRole("button", { name: "Retirer la photo" })).toBeInTheDocument();
      expect(within(reopened).getByText(RESTORED)).toBeInTheDocument();
      await fillAndSend(user);
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
      const photo = ((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as FormData).get("file") as File;
      expect(photo.name).toBe("beer.png");
    });

    it("gives no photo back once the draft is cleared", async () => {
      const user = userEvent.setup();
      renderSheet();
      const dialog = await openSheet(user);
      choosePhoto(dialog, png());
      expect(await within(dialog).findByRole("img", { name: "Aperçu de la photo" })).toBeInTheDocument();
      await closeWithEscape(user);
      const reopened = await openSheet(user);

      await user.click(within(reopened).getByRole("button", { name: CLEAR }));

      expect(within(reopened).queryByRole("img", { name: "Aperçu de la photo" })).not.toBeInTheDocument();
    });

    it("announces the mention politely, in muted text, with a tertiary clear button of at least 44px", async () => {
      const user = userEvent.setup();
      renderSheet();
      await fillDraftAndClose(user);

      const reopened = await openSheet(user);

      const mention = within(reopened).getByText(RESTORED);
      expect(mention.className).toContain("text-muted");
      expect(mention.closest("[aria-live]")).toHaveAttribute("aria-live", "polite");
      const clear = within(reopened).getByRole("button", { name: CLEAR });
      expect(clear.className).toContain("button--tertiary");
      expect(clear.className).toContain("min-h-11");
    });

    it("keeps the mention on a form edited after the draft was restored", async () => {
      const user = userEvent.setup();
      renderSheet();
      await fillDraftAndClose(user);
      const reopened = await openSheet(user);

      await user.type(within(reopened).getByLabelText("Commentaire"), "!");

      expect(within(reopened).getByText(RESTORED)).toBeInTheDocument();
      await closeWithEscape(user);
      const again = await openSheet(user);
      expect((within(again).getByLabelText("Commentaire") as HTMLTextAreaElement).value).toBe("Super!");
    });

    it("empties the form dated now and removes the mention when the draft is cleared, for good", async () => {
      const user = userEvent.setup();
      renderSheet();
      await fillDraftAndClose(user);
      vi.setSystemTime(new Date(2026, 9, 12, 14, 45));
      const reopened = await openSheet(user);

      await user.click(within(reopened).getByRole("button", { name: CLEAR }));

      expect(within(reopened).getByRole("combobox", { name: /^Lieu/ })).toHaveValue("");
      expect(within(reopened).getByLabelText("Date et heure")).toHaveValue("2026-10-12T14:45");
      expect((within(reopened).getByLabelText("Commentaire") as HTMLTextAreaElement).value).toBe("");
      within(reopened)
        .getAllByRole("radio")
        .forEach((radio) => expect(radio).not.toBeChecked());
      expect(within(reopened).getByRole("row", { name: "Fruité" })).toHaveAttribute("aria-selected", "false");
      expect(within(reopened).queryByText(RESTORED)).not.toBeInTheDocument();
      expect(within(reopened).queryByRole("button", { name: CLEAR })).not.toBeInTheDocument();
      await closeWithEscape(user);
      const again = await openSheet(user);
      expect(within(again).queryByText(RESTORED)).not.toBeInTheDocument();
      expect(within(again).getByRole("combobox", { name: /^Lieu/ })).toHaveValue("");
    });

    it("starts a new draft after the previous one was cleared", async () => {
      const user = userEvent.setup();
      renderSheet();
      await fillDraftAndClose(user);
      const reopened = await openSheet(user);
      await user.click(within(reopened).getByRole("button", { name: CLEAR }));

      await user.type(within(reopened).getByLabelText("Commentaire"), "Neuf");

      expect(within(reopened).queryByText(RESTORED)).not.toBeInTheDocument();
      await closeWithEscape(user);
      const again = await openSheet(user);
      expect((within(again).getByLabelText("Commentaire") as HTMLTextAreaElement).value).toBe("Neuf");
      expect(within(again).getByText(RESTORED)).toBeInTheDocument();
    });

    it("deletes the draft once the tasting is saved: the next opening is empty without the mention", async () => {
      const user = userEvent.setup();
      renderSheet();
      await fillDraftAndClose(user);
      const reopened = await openSheet(user);
      await user.click(within(reopened).getByRole("button", { name: "Enregistrer" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(toast.success).toHaveBeenCalledWith("Dégustation enregistrée.");

      const again = await openSheet(user);

      expect(within(again).getByRole("combobox", { name: /^Lieu/ })).toHaveValue("");
      expect((within(again).getByLabelText("Commentaire") as HTMLTextAreaElement).value).toBe("");
      expect(within(again).queryByText(RESTORED)).not.toBeInTheDocument();
    });

    it("deletes the draft after a first discovery too", async () => {
      const user = userEvent.setup();
      answerWith(true);
      renderSheet();
      await fillDraftAndClose(user);
      const reopened = await openSheet(user);
      await user.click(within(reopened).getByRole("button", { name: "Enregistrer" }));
      await user.click(await within(reopened).findByRole("button", { name: "Fermer" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

      const again = await openSheet(user);

      expect(within(again).getByRole("combobox", { name: /^Lieu/ })).toHaveValue("");
      expect(within(again).queryByText(RESTORED)).not.toBeInTheDocument();
    });

    it("keeps the draft when the server fails", async () => {
      const user = userEvent.setup();
      renderSheet();
      await fillDraftAndClose(user);
      mockFetch.mockImplementation(async () => new Response(JSON.stringify({ message: "boom" }), { status: 500 }));
      const reopened = await openSheet(user);
      await user.click(within(reopened).getByRole("button", { name: "Enregistrer" }));
      await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(within(reopened).getByRole("button", { name: "Enregistrer" })).not.toHaveAttribute("data-pending"));
      await closeWithEscape(user);

      const again = await openSheet(user);

      expect(within(again).getByRole("combobox", { name: /^Lieu/ })).toHaveValue("Chez Paul");
      expect(within(again).getByText(RESTORED)).toBeInTheDocument();
    });

    it("gives an empty form without the mention on the sheet of another beer", async () => {
      const user = userEvent.setup();
      const first = renderSheet();
      await fillDraftAndClose(user);
      first.unmount();

      renderWithProviders(<CheckinSheet beer={ORVAL} />);
      const dialog = await openSheet(user);

      expect(within(dialog).getByRole("combobox", { name: /^Lieu/ })).toHaveValue("");
      expect((within(dialog).getByLabelText("Commentaire") as HTMLTextAreaElement).value).toBe("");
      expect(within(dialog).getByLabelText("Date et heure")).toHaveValue("2026-10-12T12:00");
      expect(within(dialog).queryByText(RESTORED)).not.toBeInTheDocument();
    });

    it("shows no mention when the sheet is opened then closed without typing anything", async () => {
      const user = userEvent.setup();
      renderSheet();
      await openSheet(user);
      await closeWithEscape(user);

      const reopened = await openSheet(user);

      expect(within(reopened).queryByText(RESTORED)).not.toBeInTheDocument();
      expect(within(reopened).queryByRole("button", { name: CLEAR })).not.toBeInTheDocument();
    });

    it("shows no mention when everything typed was erased before closing", async () => {
      const user = userEvent.setup();
      renderSheet();
      const dialog = await openSheet(user);
      await user.type(within(dialog).getByLabelText("Commentaire"), "ab");
      await user.clear(within(dialog).getByLabelText("Commentaire"));
      await closeWithEscape(user);

      const reopened = await openSheet(user);

      expect(within(reopened).queryByText(RESTORED)).not.toBeInTheDocument();
    });

    it("gives no draft to another demo user opening the same beer", async () => {
      const user = userEvent.setup();
      window.localStorage.setItem(StorageKeyEnum.CURRENT_USER_ID, "1");
      const first = renderSheet();
      await fillDraftAndClose(user);
      first.unmount();
      window.localStorage.setItem(StorageKeyEnum.CURRENT_USER_ID, "2");

      renderSheet();
      const dialog = await openSheet(user);

      expect(within(dialog).getByRole("combobox", { name: /^Lieu/ })).toHaveValue("");
      expect(within(dialog).queryByText(RESTORED)).not.toBeInTheDocument();
    });

    it("is neither read nor written when editing a tasting", async () => {
      const user = userEvent.setup();
      const first = renderSheet();
      await fillDraftAndClose(user);
      first.unmount();
      renderWithProviders(
        <CheckinSheet
          checkin={{ ...checkinDto, drankAt: "2026-10-10T08:00:00.000Z", rating: null, aromas: [], format: "bottle", price: null, venueId: null } as Checkin}
          renderDeleteAction={() => null}
        />,
      );
      await user.click(screen.getByRole("button", { name: "Modifier la dégustation" }));
      const dialog = await screen.findByRole("dialog");

      expect(within(dialog).getByRole("combobox", { name: /^Lieu/ })).toHaveValue("Chez Paul");
      expect((within(dialog).getByLabelText("Commentaire") as HTMLTextAreaElement).value).toBe("");
      expect(within(dialog).getByRole("radio", { name: "Bouteille" })).toBeChecked();
      expect(within(dialog).getByRole("radio", { name: "Canette" })).not.toBeChecked();
      expect(within(dialog).getByRole("row", { name: "Fruité" })).toHaveAttribute("aria-selected", "false");
      expect(within(dialog).queryByText(RESTORED)).not.toBeInTheDocument();
      expect(within(dialog).queryByRole("button", { name: CLEAR })).not.toBeInTheDocument();
      await user.type(within(dialog).getByLabelText("Commentaire"), "edit");
      await closeWithEscape(user);
      expect(getCheckinDraft(1, 1)?.comment).toBe("Super");
    });
  });
});
