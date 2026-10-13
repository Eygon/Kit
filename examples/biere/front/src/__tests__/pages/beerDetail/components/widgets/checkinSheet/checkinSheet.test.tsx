import { toast } from "@heroui/react";
import { QueryClient } from "@tanstack/react-query";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { CheckinSheet } from "@/pages/beerDetail/components/widgets/checkinSheet/checkinSheet";
import { BeerAromaEnum } from "@/types/enums/beer/beerAromaEnum";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { BeerFormatEnum } from "@/types/enums/beer/beerFormatEnum";
import type { Beer } from "@/types/models/beer/beer";
import { CHECKINS } from "@/utils/apiURL/apiURL";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { checkinKeys } from "@/utils/queryKeys/checkinQueryKeys";
import { dexKeys } from "@/utils/queryKeys/dexQueryKeys";

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
  await user.type(screen.getByLabelText(/^Lieu/), place);
  await user.click(screen.getByRole("radio", { name: "Bouteille" }));
  await user.click(screen.getByRole("button", { name: "Enregistrer" }));
};

describe("CheckinSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 12, 12, 0));
    vi.stubGlobal("fetch", mockFetch);
    vi.spyOn(toast, "success").mockImplementation(() => "toast-id");
    vi.spyOn(toast, "danger").mockImplementation(() => "toast-id");
    answerWith(false);
  });

  afterEach(() => {
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

      await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(3));
      expect(invalidate).toHaveBeenCalledWith({ queryKey: beerKeys.all() });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: dexKeys.all() });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: checkinKeys.all() });
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

      await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(3));
      expect(invalidate).toHaveBeenCalledWith({ queryKey: beerKeys.all() });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: dexKeys.all() });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: checkinKeys.all() });
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
      expect(within(dialog).getByLabelText(/^Lieu/)).toHaveValue("Chez Paul");
      expect(within(dialog).getByRole("radio", { name: "Bouteille" })).toBeChecked();
      expect(within(dialog).queryByText("Nouvelle bière capturée !")).not.toBeInTheDocument();
      expect(toast.success).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("when it is closed then opened again", () => {
    it("shows a fresh form dated now, without the previous input", async () => {
      const user = userEvent.setup();
      renderSheet();
      const dialog = await openSheet(user);
      await user.type(within(dialog).getByLabelText(/^Lieu/), "Chez Paul");
      await user.click(within(dialog).getByRole("radio", { name: "Canette" }));
      await user.click(within(dialog).getByRole("row", { name: "Fruité" }));
      fireEvent.change(within(dialog).getByLabelText("Date et heure"), { target: { value: "2026-10-01T08:30" } });
      within(dialog).getByLabelText(/^Lieu/).focus();
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      vi.setSystemTime(new Date(2026, 9, 12, 14, 45));

      const reopened = await openSheet(user);

      expect(within(reopened).getByLabelText(/^Lieu/)).toHaveValue("");
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
      within(dialog).getByLabelText(/^Lieu/).focus();
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(invalidate).not.toHaveBeenCalled();

      answer(new Response(JSON.stringify({ checkin: checkinDto, isFirstDiscovery: false }), { status: 201 }));

      await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(3));
      expect(toast.success).toHaveBeenCalledWith("Dégustation enregistrée.");
      expect(toast.success).toHaveBeenCalledTimes(1);
      expect(toast.danger).not.toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
