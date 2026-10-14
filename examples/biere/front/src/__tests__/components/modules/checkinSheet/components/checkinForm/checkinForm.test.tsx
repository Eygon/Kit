import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import VenueService from "@/api/venues/venueService";
import { CheckinForm } from "@/components/modules/checkinSheet/components/checkinForm/checkinForm";
import type { CheckinFormProps } from "@/components/modules/checkinSheet/types/checkinForm";
import type { CheckinFormValues } from "@/components/modules/checkinSheet/types/checkinFormValues";
import { createEmptyCheckinForm } from "@/components/modules/checkinSheet/utils/checkinFormValues";
import { BeerAromaEnum } from "@/types/enums/beer/beerAromaEnum";
import { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";
import { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";
import type { Venue } from "@/types/models/venue/venue";

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

const NOW = new Date(2026, 9, 12, 12, 0);
const onSubmit = vi.fn();
const scrollIntoView = vi.fn();

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const EDITED_VALUES: CheckinFormValues = {
  drankAt: "2026-10-10T20:15",
  place: "La Fine Mousse",
  venueId: 5,
  rating: 3,
  aromas: [BeerAromaEnum.FRUITY],
  format: "bottle",
  price: 4.5,
  comment: "Top",
  photo: null,
};

const renderForm = (overrides: Partial<CheckinFormProps> = {}) =>
  renderWithProviders(
    <CheckinForm
      initialValues={createEmptyCheckinForm(NOW)}
      isPhotoEditable
      submitLabel="Enregistrer"
      isSaving={false}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );

const dateInput = () => screen.getByLabelText("Date et heure") as HTMLInputElement;
const placeInput = () => screen.getByRole("combobox", { name: /^Lieu/ }) as HTMLInputElement;
const submitButton = () => screen.getByRole("button", { name: "Enregistrer" });
const pendingButton = () => screen.getByRole("button", { name: /Enregistrement…/ });
const aromaRows = () => screen.getAllByRole("row");
const aromaRow = (name: string) => screen.getByRole("row", { name });

const typePlace = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
  await user.type(placeInput(), text);
  await user.tab();
};

const fillValidForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await typePlace(user, "Chez Paul");
  await user.click(screen.getByRole("radio", { name: "Bouteille" }));
};

const LABEL_STYLES = readFileSync(resolve(process.cwd(), "node_modules/@heroui/styles/dist/components/label.css"), "utf8");
const REQUIRED_MARKER_SELECTOR = (LABEL_STYLES.match(/(\.label--required,[^{]+)\{/) ?? [])[1]?.trim() ?? "";

const requiredMarkers = (root: ParentNode) => [...root.querySelectorAll(REQUIRED_MARKER_SELECTOR)];

const isBefore = (first: Node, second: Node): boolean =>
  (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

const FIVE_AROMAS = ["Fruité", "Agrumes", "Houblonné", "Floral", "Épicé"];

describe("CheckinForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, writable: true, value: scrollIntoView });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: vi.fn((file: File) => `blob:${file.name}`) });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
    vi.mocked(VenueService.search).mockResolvedValue(found([CLUNY]));
    onSubmit.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("when it opens", () => {
    it("is dated now, with a max of now, and nothing else filled in", () => {
      renderForm();

      expect(dateInput().type).toBe("datetime-local");
      expect(dateInput().value).toBe("2026-10-12T12:00");
      expect(dateInput().max).toBe("2026-10-12T12:00");
      expect(placeInput().value).toBe("");
      expect(screen.getAllByRole("radio")).toHaveLength(3);
      screen.getAllByRole("radio").forEach((radio) => expect(radio).not.toBeChecked());
      expect(screen.getByText("Sans note")).toBeInTheDocument();
      expect(aromaRows()).toHaveLength(18);
      aromaRows().forEach((row) => expect(row).toHaveAttribute("aria-selected", "false"));
      expect(screen.getByText("0 / 500")).toBeInTheDocument();
    });

    it("shows no error before the first submit", () => {
      renderForm();

      expect(screen.queryByText("Indiquez le lieu.")).not.toBeInTheDocument();
      expect(screen.queryByText("Choisissez un format.")).not.toBeInTheDocument();
      expect(screen.queryByText("Indiquez la date et l'heure.")).not.toBeInTheDocument();
      expect(screen.queryByText("La date ne peut pas être dans le futur.")).not.toBeInTheDocument();
    });

    it("caps the place at 80 characters and the comment at 500", () => {
      renderForm();

      expect(placeInput()).toHaveAttribute("maxlength", "80");
      expect(screen.getByLabelText("Commentaire")).toHaveAttribute("maxlength", "500");
    });

    it("offers the three formats as chips and the eighteen aromas", () => {
      renderForm();

      ["Bouteille", "Canette", "Pression"].forEach((format) =>
        expect(screen.getByRole("radio", { name: format })).toBeInTheDocument(),
      );
      ["Fruité", "Agrumes", "Biscuit"].forEach((aroma) => expect(aromaRow(aroma)).toBeInTheDocument());
    });
  });

  describe("required indicators", () => {
    it("reads the required marker selector from the HeroUI label styles", () => {
      expect(REQUIRED_MARKER_SELECTOR).toContain('[data-required="true"]');
    });

    it("puts a single indicator on the format group label and none on its choices", () => {
      renderForm();
      const group = screen.getByRole("radiogroup", { name: "Format" });

      expect(requiredMarkers(group).map((marker) => marker.textContent)).toEqual(["Format"]);
      expect(group).toHaveAttribute("aria-required", "true");
      expect(screen.getAllByRole("radio")).toHaveLength(3);
    });

    it("puts exactly one indicator on each of date and time, place and format", () => {
      const { container } = renderForm();

      expect(requiredMarkers(container).map((marker) => marker.textContent)).toEqual(["Date et heure", "Lieu", "Format"]);
    });

    it("still refuses an empty submit with the format message", async () => {
      const user = userEvent.setup();
      renderForm();
      await typePlace(user, "Chez Paul");

      await user.click(submitButton());

      expect(await screen.findByText("Choisissez un format.")).toBeInTheDocument();
      expect(screen.getByRole("radiogroup", { name: "Format" })).toHaveAttribute("aria-invalid", "true");
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("when it is submitted invalid", () => {
    it("shows each message and sends nothing for an empty place, no format and a future date", async () => {
      const user = userEvent.setup();
      renderForm();
      fireEvent.change(dateInput(), { target: { value: "2026-10-12T12:01" } });

      await user.click(submitButton());

      expect(await screen.findByText("Indiquez le lieu.")).toBeInTheDocument();
      expect(screen.getByText("Choisissez un format.")).toBeInTheDocument();
      expect(screen.getByText("La date ne peut pas être dans le futur.")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("puts the future date message right under the date field, ahead of the place, and ties it to the date field", async () => {
      const user = userEvent.setup();
      renderForm();
      fireEvent.change(dateInput(), { target: { value: "2026-10-12T12:01" } });

      await user.click(submitButton());

      const message = await screen.findByText("La date ne peut pas être dans le futur.");
      expect(isBefore(dateInput(), message)).toBe(true);
      expect(isBefore(message, placeInput())).toBe(true);
      expect(dateInput()).toHaveAccessibleDescription("La date ne peut pas être dans le futur.");
      expect(placeInput()).not.toHaveAccessibleDescription("La date ne peut pas être dans le futur.");
    });

    it("refuses a place made only of spaces", async () => {
      const user = userEvent.setup();
      renderForm();
      await typePlace(user, "     ");
      await user.click(screen.getByRole("radio", { name: "Canette" }));

      await user.click(submitButton());

      expect(await screen.findByText("Indiquez le lieu.")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("refuses an empty date and time", async () => {
      const user = userEvent.setup();
      renderForm();
      await fillValidForm(user);
      fireEvent.change(dateInput(), { target: { value: "" } });

      await user.click(submitButton());

      expect(await screen.findByText("Indiquez la date et l'heure.")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("clears the messages and sends once everything is fixed", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(submitButton());
      expect(await screen.findByText("Indiquez le lieu.")).toBeInTheDocument();

      await fillValidForm(user);

      await waitFor(() => expect(screen.queryByText("Indiquez le lieu.")).not.toBeInTheDocument());
      expect(screen.queryByText("Choisissez un format.")).not.toBeInTheDocument();
      await user.click(submitButton());
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    });
  });

  describe("when the submit is refused, the focus goes to the first invalid field", () => {
    it("scrolls to the future date at the top and focuses it", async () => {
      const user = userEvent.setup();
      renderForm();
      fireEvent.change(dateInput(), { target: { value: "2026-10-12T12:01" } });
      await typePlace(user, "Chez Paul");
      await user.click(screen.getByRole("radio", { name: "Bouteille" }));

      await user.click(submitButton());

      await waitFor(() => expect(dateInput()).toHaveFocus());
      expect(scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "smooth" });
      expect(scrollIntoView.mock.contexts.at(-1)).toBe(dateInput());
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("focuses the date, not the place or the format, when all three are invalid", async () => {
      const user = userEvent.setup();
      renderForm();
      fireEvent.change(dateInput(), { target: { value: "2026-10-12T12:01" } });

      await user.click(submitButton());

      await waitFor(() => expect(dateInput()).toHaveFocus());
      expect(placeInput()).not.toHaveFocus();
    });

    it("focuses the place when neither the place nor the format is filled in", async () => {
      const user = userEvent.setup();
      renderForm();

      await user.click(submitButton());

      await waitFor(() => expect(placeInput()).toHaveFocus());
      expect(scrollIntoView.mock.contexts.at(-1)).toBe(placeInput());
      expect(screen.getByRole("radio", { name: "Bouteille" })).not.toHaveFocus();
    });

    it("focuses the first format choice when only the format is missing", async () => {
      const user = userEvent.setup();
      renderForm();
      await typePlace(user, "Chez Paul");

      await user.click(submitButton());

      await waitFor(() => expect(screen.getByRole("radio", { name: "Bouteille" })).toHaveFocus());
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("does not move the focus away from the button when the form is valid", async () => {
      const user = userEvent.setup();
      renderForm();
      await fillValidForm(user);

      await user.click(submitButton());

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(scrollIntoView).not.toHaveBeenCalled();
    });
  });

  describe("the sending state of the button", () => {
    it("shows Enregistrement… and is busy while the sending is in progress, in create and in edit", () => {
      const { unmount } = renderForm({ isSaving: true });
      expect(pendingButton()).toHaveAttribute("aria-busy", "true");
      expect(screen.queryByRole("button", { name: "Enregistrer" })).not.toBeInTheDocument();
      unmount();

      renderForm({ isSaving: true, submitLabel: "Sauvegarder", initialValues: EDITED_VALUES });
      expect(pendingButton()).toHaveAttribute("aria-busy", "true");
      expect(screen.queryByRole("button", { name: "Sauvegarder" })).not.toBeInTheDocument();
    });

    it("sends nothing when the busy button is pressed again", async () => {
      const user = userEvent.setup();
      renderForm({ isSaving: true, initialValues: EDITED_VALUES });

      await user.click(pendingButton());

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("takes its label back when the sending succeeds and when it fails", async () => {
      const user = userEvent.setup();
      const view = renderForm({ isSaving: true });
      expect(pendingButton()).toBeInTheDocument();

      view.rerender(
        <CheckinForm initialValues={createEmptyCheckinForm(NOW)} isPhotoEditable submitLabel="Enregistrer" isSaving={false} onSubmit={onSubmit} />,
      );

      expect(submitButton()).toHaveAttribute("aria-busy", "false");
      expect(screen.queryByRole("button", { name: /Enregistrement…/ })).not.toBeInTheDocument();
      onSubmit.mockRejectedValueOnce(new Error("boom"));
      await fillValidForm(user);
      await user.click(submitButton());
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(submitButton()).not.toHaveAttribute("data-pending"));
      expect(submitButton()).toHaveAttribute("aria-busy", "false");
    });
  });

  describe("the link with a venue", () => {
    const chooseCluny = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.type(placeInput(), "taverne");
      await waitFor(() => expect(VenueService.search).toHaveBeenLastCalledWith(expect.objectContaining({ q: "taverne" })), { timeout: 4000 });
      await user.click(await screen.findByRole("option", { name: /La Taverne de Cluny/ }));
      await waitFor(() => expect(placeInput().value).toBe("La Taverne de Cluny"));
    };

    it("proposes La Taverne de Cluny with its city when taverne is typed in the place", async () => {
      const user = userEvent.setup();
      renderForm();

      await user.type(placeInput(), "taverne");

      expect(await screen.findByRole("option", { name: /La Taverne de Cluny/ })).toHaveTextContent("Paris");
    });

    it("sends the chosen suggestion as the place text and the reference of that venue", async () => {
      const user = userEvent.setup();
      renderForm();
      await chooseCluny(user);
      await user.click(screen.getByRole("radio", { name: "Bouteille" }));

      await user.click(submitButton());

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0][0]).toMatchObject({ place: "La Taverne de Cluny", venueId: 5 });
    });

    it("sends a free text with the text and no venue", async () => {
      const user = userEvent.setup();
      renderForm();
      await typePlace(user, "Chez moi");
      await user.click(screen.getByRole("radio", { name: "Bouteille" }));

      await user.click(submitButton());

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0][0]).toMatchObject({ place: "Chez moi", venueId: null });
    });

    it("sends the edited text and no venue once the chosen suggestion is modified", async () => {
      const user = userEvent.setup();
      renderForm();
      await chooseCluny(user);
      await typePlace(user, " (terrasse)");
      await user.click(screen.getByRole("radio", { name: "Bouteille" }));

      await user.click(submitButton());

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0][0]).toMatchObject({
        place: "La Taverne de Cluny (terrasse)",
        venueId: null,
      });
    });

    it("still shows the required message for an empty place and sends nothing", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole("radio", { name: "Bouteille" }));

      await user.click(submitButton());

      expect(await screen.findByText("Indiquez le lieu.")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("asks for the place again when the chosen suggestion is erased entirely", async () => {
      const user = userEvent.setup();
      renderForm();
      await chooseCluny(user);
      await user.clear(placeInput());
      await user.tab();
      await user.click(screen.getByRole("radio", { name: "Bouteille" }));

      await user.click(submitButton());

      expect(await screen.findByText("Indiquez le lieu.")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("keeps the free text saveable when the suggestions are unavailable", async () => {
      const user = userEvent.setup();
      vi.mocked(VenueService.search).mockRejectedValue(new Error("boom"));
      renderForm();
      await user.type(placeInput(), "Chez moi");
      expect(await screen.findByText("Suggestions indisponibles")).toBeInTheDocument();
      await user.tab();
      await user.click(screen.getByRole("radio", { name: "Bouteille" }));

      await user.click(submitButton());

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0][0]).toMatchObject({ place: "Chez moi", venueId: null });
    });
  });

  describe("aromas", () => {
    it("blocks the other aromas as soon as five are chosen, and frees them when one is removed", async () => {
      const user = userEvent.setup();
      renderForm();
      for (const aroma of FIVE_AROMAS.slice(0, 4)) await user.click(aromaRow(aroma));
      expect(aromaRow("Boisé")).not.toHaveAttribute("aria-disabled", "true");

      await user.click(aromaRow(FIVE_AROMAS[4]));

      FIVE_AROMAS.forEach((aroma) => {
        expect(aromaRow(aroma)).toHaveAttribute("aria-selected", "true");
        expect(aromaRow(aroma)).not.toHaveAttribute("aria-disabled", "true");
      });
      const blocked = aromaRows().filter((row) => row.getAttribute("aria-selected") !== "true");
      expect(blocked).toHaveLength(13);
      blocked.forEach((row) => expect(row).toHaveAttribute("aria-disabled", "true"));

      await user.click(aromaRow("Fruité"));

      aromaRows()
        .filter((row) => row.getAttribute("aria-selected") !== "true")
        .forEach((row) => expect(row).not.toHaveAttribute("aria-disabled", "true"));
      expect(aromaRow("Boisé")).not.toHaveAttribute("aria-disabled", "true");
    });
  });

  describe("when it is submitted valid", () => {
    it("hands the form values over as they are typed, the place untrimmed", async () => {
      const user = userEvent.setup();
      renderForm();
      await typePlace(user, "  Chez Paul  ");
      await user.click(screen.getByRole("radio", { name: "Pression" }));
      await user.click(aromaRow("Houblonné"));
      await user.click(aromaRow("Floral"));
      await user.type(screen.getByLabelText("Commentaire"), "Top");
      const slider = screen.getByRole("slider");
      slider.focus();
      await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
      await user.type(screen.getByRole("textbox", { name: "Prix" }), "4,5");
      await user.tab();

      await user.click(submitButton());

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit).toHaveBeenCalledWith({
        drankAt: "2026-10-12T12:00",
        place: "  Chez Paul  ",
        venueId: null,
        format: "draft",
        rating: 1.5,
        aromas: [BeerAromaEnum.HOPPY, BeerAromaEnum.FLORAL],
        price: 4.5,
        comment: "Top",
        photo: null,
      });
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("hands over a zero rating and an empty price when they were left alone", async () => {
      const user = userEvent.setup();
      renderForm();
      await fillValidForm(user);

      await user.click(submitButton());

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit).toHaveBeenCalledWith({
        drankAt: "2026-10-12T12:00",
        place: "Chez Paul",
        venueId: null,
        format: "bottle",
        rating: 0,
        aromas: [],
        price: Number.NaN,
        comment: "",
        photo: null,
      });
    });

    it("shows the rating as a score and the comment length as a counter", async () => {
      const user = userEvent.setup();
      renderForm();
      const slider = screen.getByRole("slider");
      slider.focus();
      await user.keyboard("{ArrowRight}");
      expect(screen.getByText("0,5 / 5")).toBeInTheDocument();

      await user.type(screen.getByLabelText("Commentaire"), "Très bonne");

      expect(screen.getByText("10 / 500")).toBeInTheDocument();
    });

    it("gives the price group the 44px height, since the group clips an input taller than itself", () => {
      renderForm();

      expect(screen.getByRole("textbox", { name: "Prix" }).closest(".number-field__group")).toHaveClass("min-h-11");
    });

    it("never sends a negative price or a price above 1000", async () => {
      const user = userEvent.setup();
      renderForm();
      await fillValidForm(user);
      const price = screen.getByRole("textbox", { name: "Prix" });

      await user.type(price, "-5");
      await user.tab();
      await user.click(submitButton());

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0][0].price).toBeGreaterThanOrEqual(0);

      await user.clear(price);
      await user.type(price, "1001");
      await user.tab();
      await user.click(submitButton());

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
      expect(onSubmit.mock.calls[1][0].price).toBeLessThanOrEqual(1000);
    });

    it("sends only one tasting when the button is pressed twice very fast", async () => {
      const user = userEvent.setup();
      const pending = deferred<void>();
      onSubmit.mockReturnValue(pending.promise);
      renderForm();
      await fillValidForm(user);

      await user.dblClick(submitButton());

      expect(onSubmit).toHaveBeenCalledTimes(1);
      pending.resolve();
      await waitFor(() => expect(submitButton()).not.toHaveAttribute("data-pending"));
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("shows the pending state on the button while the tasting is being saved", () => {
      renderForm({ isSaving: true });

      expect(pendingButton()).toHaveAttribute("data-pending", "true");
    });

    it("does not show the pending state when nothing is being saved", () => {
      renderForm();

      expect(submitButton()).not.toHaveAttribute("data-pending");
    });
  });

  describe("photo", () => {
    const galleryInput = (container: HTMLElement) =>
      container.querySelector<HTMLInputElement>('input[type="file"]:not([capture])') as HTMLInputElement;
    const choosePhoto = (container: HTMLElement, file: File) =>
      fireEvent.change(galleryInput(container), { target: { files: [file] } });
    const png = () => new File([new Uint8Array(10)], "beer.png", { type: "image/png" });

    it("offers the camera and the gallery with no preview at first", () => {
      renderForm();

      expect(screen.getByRole("button", { name: "Prendre une photo" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Choisir dans la galerie" })).toBeInTheDocument();
      expect(screen.queryByRole("img", { name: "Aperçu de la photo" })).not.toBeInTheDocument();
    });

    it("previews the chosen png and sends that very file with the tasting", async () => {
      const user = userEvent.setup();
      const { container } = renderForm();
      await fillValidForm(user);
      const photo = png();

      choosePhoto(container, photo);

      expect(await screen.findByRole("img", { name: "Aperçu de la photo" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Retirer la photo" })).toBeInTheDocument();
      await user.click(submitButton());
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0][0].photo).toBe(photo);
    });

    it("sends the tasting without a photo once the photo is removed", async () => {
      const user = userEvent.setup();
      const { container } = renderForm();
      await fillValidForm(user);
      choosePhoto(container, png());
      await user.click(await screen.findByRole("button", { name: "Retirer la photo" }));
      expect(screen.queryByRole("img", { name: "Aperçu de la photo" })).not.toBeInTheDocument();

      await user.click(submitButton());

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0][0].photo).toBeNull();
    });

    it("shows a message and sends no photo for a pdf", async () => {
      const user = userEvent.setup();
      const { container } = renderForm();
      await fillValidForm(user);

      choosePhoto(container, new File([new Uint8Array(10)], "doc.pdf", { type: "application/pdf" }));

      expect(await screen.findByText("Choisissez une image JPEG, PNG ou WebP.")).toBeInTheDocument();
      expect(screen.queryByRole("img", { name: "Aperçu de la photo" })).not.toBeInTheDocument();
      await user.click(submitButton());
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0][0].photo).toBeNull();
    });

    it("keeps the photo when the server fails so the user can send again", async () => {
      const user = userEvent.setup();
      onSubmit.mockRejectedValueOnce(new Error("boom"));
      const { container } = renderForm();
      await fillValidForm(user);
      const photo = png();
      choosePhoto(container, photo);

      await user.click(submitButton());

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(submitButton()).not.toHaveAttribute("data-pending"));
      expect(screen.getByRole("img", { name: "Aperçu de la photo" })).toBeInTheDocument();
      await user.click(submitButton());
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
      expect(onSubmit.mock.calls[1][0].photo).toBe(photo);
    });
  });

  describe("when the server fails", () => {
    it("keeps the whole input, calls nothing back and lets the user send again", async () => {
      const user = userEvent.setup();
      onSubmit.mockRejectedValueOnce(new Error("boom"));
      renderForm();
      await typePlace(user, "Chez Paul");
      await user.click(screen.getByRole("radio", { name: "Canette" }));
      await user.click(aromaRow("Agrumes"));
      await user.type(screen.getByLabelText("Commentaire"), "Top");

      await user.click(submitButton());

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(submitButton()).not.toHaveAttribute("data-pending"));
      expect(placeInput().value).toBe("Chez Paul");
      expect(screen.getByRole("radio", { name: "Canette" })).toBeChecked();
      expect(aromaRow("Agrumes")).toHaveAttribute("aria-selected", "true");
      expect((screen.getByLabelText("Commentaire") as HTMLTextAreaElement).value).toBe("Top");
      expect(dateInput().value).toBe("2026-10-12T12:00");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      await user.click(submitButton());

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    });
  });

  describe("when it opens on a tasting to edit", () => {
    const DASHED_PRICE = /4,50/;

    it("prefills the date, the linked place, the rating, the aromas, the format, the price and the comment", () => {
      renderForm({ initialValues: EDITED_VALUES });

      expect(dateInput().value).toBe("2026-10-10T20:15");
      expect(placeInput().value).toBe("La Fine Mousse");
      expect(screen.getByText("3 / 5")).toBeInTheDocument();
      expect(aromaRow("Fruité")).toHaveAttribute("aria-selected", "true");
      expect(aromaRow("Agrumes")).toHaveAttribute("aria-selected", "false");
      expect(screen.getByRole("radio", { name: "Bouteille" })).toBeChecked();
      expect(screen.getByRole("radio", { name: "Canette" })).not.toBeChecked();
      expect((screen.getByRole("textbox", { name: "Prix" }) as HTMLInputElement).value).toMatch(DASHED_PRICE);
      expect((screen.getByLabelText("Commentaire") as HTMLTextAreaElement).value).toBe("Top");
      expect(screen.getByText("3 / 500")).toBeInTheDocument();
    });

    it("keeps the max of the date at now, not at the date of the tasting", () => {
      renderForm({ initialValues: EDITED_VALUES });

      expect(dateInput().max).toBe("2026-10-12T12:00");
    });

    it("hands the untouched values back, the venue still linked", async () => {
      const user = userEvent.setup();
      renderForm({ initialValues: EDITED_VALUES });

      await user.click(submitButton());

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit).toHaveBeenCalledWith(EDITED_VALUES);
    });

    it("keeps the venue linked when only the comment is edited, and drops it when the place is edited", async () => {
      const user = userEvent.setup();
      renderForm({ initialValues: EDITED_VALUES });
      await user.type(screen.getByLabelText("Commentaire"), "!");
      await user.click(submitButton());
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0][0]).toMatchObject({ venueId: 5, place: "La Fine Mousse", comment: "Top!" });

      await user.type(placeInput(), " bis");
      await user.tab();
      await user.click(submitButton());

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
      expect(onSubmit.mock.calls[1][0]).toMatchObject({ venueId: null, place: "La Fine Mousse bis" });
    });

    it("shows the message under the date and sends nothing for a future date", async () => {
      const user = userEvent.setup();
      renderForm({ initialValues: EDITED_VALUES });
      fireEvent.change(dateInput(), { target: { value: "2026-10-12T12:01" } });

      await user.click(submitButton());

      const message = await screen.findByText("La date ne peut pas être dans le futur.");
      expect(isBefore(dateInput(), message)).toBe(true);
      expect(isBefore(message, placeInput())).toBe(true);
      expect(dateInput()).toHaveAccessibleDescription("La date ne peut pas être dans le futur.");
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("keeps the values and lets the user send again when the submit is rejected", async () => {
      const user = userEvent.setup();
      onSubmit.mockRejectedValueOnce(new Error("boom"));
      renderForm({ initialValues: EDITED_VALUES });
      await user.type(screen.getByLabelText("Commentaire"), "!");

      await user.click(submitButton());

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(submitButton()).not.toHaveAttribute("data-pending"));
      expect((screen.getByLabelText("Commentaire") as HTMLTextAreaElement).value).toBe("Top!");
      expect(placeInput().value).toBe("La Fine Mousse");
      await user.click(submitButton());
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    });
  });

  describe("the submit label and the photo", () => {
    it("shows the label it is given on the submit button", () => {
      renderForm({ submitLabel: "Sauvegarder" });

      expect(screen.getByRole("button", { name: "Sauvegarder" })).toHaveAttribute("type", "submit");
      expect(screen.queryByRole("button", { name: "Enregistrer" })).not.toBeInTheDocument();
    });

    it("shows no photo picker when the photo is not editable, and hands over no photo", async () => {
      const user = userEvent.setup();
      const { container } = renderForm({ isPhotoEditable: false, initialValues: EDITED_VALUES });

      expect(screen.queryByRole("button", { name: "Prendre une photo" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Choisir dans la galerie" })).not.toBeInTheDocument();
      expect(container.querySelector('input[type="file"]')).toBeNull();
      await user.click(submitButton());
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0][0].photo).toBeNull();
    });
  });

  describe("onValuesChange", () => {
    it("is not called when the form only opens", () => {
      const onValuesChange = vi.fn();

      renderForm({ onValuesChange });

      expect(onValuesChange).not.toHaveBeenCalled();
    });

    it("hands over the whole values at each comment keystroke", async () => {
      const user = userEvent.setup();
      const onValuesChange = vi.fn();
      renderForm({ onValuesChange });

      await user.type(screen.getByLabelText("Commentaire"), "ab");

      expect(onValuesChange).toHaveBeenCalledTimes(2);
      expect(onValuesChange).toHaveBeenNthCalledWith(1, { ...createEmptyCheckinForm(NOW), comment: "a" });
      expect(onValuesChange).toHaveBeenLastCalledWith({ ...createEmptyCheckinForm(NOW), comment: "ab" });
    });

    it("hands over the place with its venue link, the format, the rating and the aromas", async () => {
      const user = userEvent.setup();
      const onValuesChange = vi.fn();
      renderForm({ onValuesChange });

      await typePlace(user, "Chez Paul");
      await user.click(screen.getByRole("radio", { name: "Canette" }));
      await user.click(aromaRow("Fruité"));
      screen.getByRole("slider").focus();
      await user.keyboard("{ArrowRight}");

      expect(onValuesChange).toHaveBeenLastCalledWith({
        ...createEmptyCheckinForm(NOW),
        place: "Chez Paul",
        venueId: null,
        format: "can",
        aromas: [BeerAromaEnum.FRUITY],
        rating: 0.5,
      });
    });

    it("hands over the venue chosen in the suggestions", async () => {
      const user = userEvent.setup();
      const onValuesChange = vi.fn();
      renderForm({ onValuesChange });

      await user.type(placeInput(), "taverne");
      await waitFor(() => expect(VenueService.search).toHaveBeenLastCalledWith(expect.objectContaining({ q: "taverne" })), { timeout: 4000 });
      await user.click(await screen.findByRole("option", { name: /La Taverne de Cluny/ }));

      expect(onValuesChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ place: "La Taverne de Cluny", venueId: 5 }),
      );
    });

    it("works without the prop", async () => {
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByLabelText("Commentaire"), "a");

      expect((screen.getByLabelText("Commentaire") as HTMLTextAreaElement).value).toBe("a");
    });
  });
});
