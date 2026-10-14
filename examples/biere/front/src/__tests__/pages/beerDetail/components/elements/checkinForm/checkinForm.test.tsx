import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { CheckinForm } from "@/pages/beerDetail/components/elements/checkinForm/checkinForm";
import { BeerAromaEnum } from "@/types/enums/beer/beerAromaEnum";
import type { CreatedCheckin } from "@/types/models/checkin/createdCheckin";

const mockMutation = vi.hoisted(() => ({ useCreateCheckinMutation: vi.fn(), saveCheckin: vi.fn() }));

vi.mock("@/pages/beerDetail/hooks/useCreateCheckinMutation", () => ({
  useCreateCheckinMutation: mockMutation.useCreateCheckinMutation,
}));

const CREATED: CreatedCheckin = {
  checkin: {
    id: 11,
    beerId: 7,
    beerName: "Orval",
    drankAt: "2026-10-12T10:00:00.000Z",
    place: "Chez Paul",
    rating: null,
    aromas: [],
    format: null,
    price: null,
    comment: "",
    photoId: null,
  },
  isFirstDiscovery: true,
};

const NOW = new Date(2026, 9, 12, 12, 0);
const onSaved = vi.fn();

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const renderForm = () => renderWithProviders(<CheckinForm beerId={7} onSaved={onSaved} />);

const dateInput = () => screen.getByLabelText("Date et heure") as HTMLInputElement;
const placeInput = () => screen.getByLabelText(/^Lieu/) as HTMLInputElement;
const submitButton = () => screen.getByRole("button", { name: "Enregistrer" });
const aromaRows = () => screen.getAllByRole("row");
const aromaRow = (name: string) => screen.getByRole("row", { name });

const fillValidForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(placeInput(), "Chez Paul");
  await user.click(screen.getByRole("radio", { name: "Bouteille" }));
};

const LABEL_STYLES = readFileSync(resolve(process.cwd(), "node_modules/@heroui/styles/dist/components/label.css"), "utf8");
const REQUIRED_MARKER_SELECTOR = (LABEL_STYLES.match(/(\.label--required,[^{]+)\{/) ?? [])[1]?.trim() ?? "";

const requiredMarkers = (root: ParentNode) => [...root.querySelectorAll(REQUIRED_MARKER_SELECTOR)];

const FIVE_AROMAS = ["Fruité", "Agrumes", "Houblonné", "Floral", "Épicé"];

describe("CheckinForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: vi.fn((file: File) => `blob:${file.name}`) });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
    mockMutation.saveCheckin.mockResolvedValue(CREATED);
    mockMutation.useCreateCheckinMutation.mockReturnValue({ saveCheckin: mockMutation.saveCheckin, isSaving: false });
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
      await user.type(placeInput(), "Chez Paul");

      await user.click(submitButton());

      expect(await screen.findByText("Choisissez un format.")).toBeInTheDocument();
      expect(screen.getByRole("radiogroup", { name: "Format" })).toHaveAttribute("aria-invalid", "true");
      expect(mockMutation.saveCheckin).not.toHaveBeenCalled();
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
      expect(mockMutation.saveCheckin).not.toHaveBeenCalled();
      expect(onSaved).not.toHaveBeenCalled();
    });

    it("refuses a place made only of spaces", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.type(placeInput(), "     ");
      await user.click(screen.getByRole("radio", { name: "Canette" }));

      await user.click(submitButton());

      expect(await screen.findByText("Indiquez le lieu.")).toBeInTheDocument();
      expect(mockMutation.saveCheckin).not.toHaveBeenCalled();
    });

    it("refuses an empty date and time", async () => {
      const user = userEvent.setup();
      renderForm();
      await fillValidForm(user);
      fireEvent.change(dateInput(), { target: { value: "" } });

      await user.click(submitButton());

      expect(await screen.findByText("Indiquez la date et l'heure.")).toBeInTheDocument();
      expect(mockMutation.saveCheckin).not.toHaveBeenCalled();
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
      await waitFor(() => expect(mockMutation.saveCheckin).toHaveBeenCalledTimes(1));
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
    it("sends the whole tasting built from the form values and hands back the created checkin", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.type(placeInput(), "  Chez Paul  ");
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

      await waitFor(() => expect(mockMutation.saveCheckin).toHaveBeenCalledTimes(1));
      expect(mockMutation.saveCheckin).toHaveBeenCalledWith({
        beerId: 7,
        drankAt: NOW.toISOString(),
        place: "Chez Paul",
        format: "draft",
        rating: 1.5,
        aromas: [BeerAromaEnum.HOPPY, BeerAromaEnum.FLORAL],
        price: 4.5,
        comment: "Top",
        photo: null,
      });
      await waitFor(() => expect(onSaved).toHaveBeenCalledWith(CREATED));
      expect(onSaved).toHaveBeenCalledTimes(1);
    });

    it("sends no rating and no price when they were left alone", async () => {
      const user = userEvent.setup();
      renderForm();
      await fillValidForm(user);

      await user.click(submitButton());

      await waitFor(() => expect(mockMutation.saveCheckin).toHaveBeenCalledTimes(1));
      expect(mockMutation.saveCheckin).toHaveBeenCalledWith({
        beerId: 7,
        drankAt: NOW.toISOString(),
        place: "Chez Paul",
        format: "bottle",
        rating: null,
        aromas: [],
        price: null,
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

    it("never sends a negative price or a price above 1000", async () => {
      const user = userEvent.setup();
      renderForm();
      await fillValidForm(user);
      const price = screen.getByRole("textbox", { name: "Prix" });

      await user.type(price, "-5");
      await user.tab();
      await user.click(submitButton());

      await waitFor(() => expect(mockMutation.saveCheckin).toHaveBeenCalledTimes(1));
      expect(mockMutation.saveCheckin.mock.calls[0][0].price).toBeGreaterThanOrEqual(0);

      await user.clear(price);
      await user.type(price, "1001");
      await user.tab();
      await user.click(submitButton());

      await waitFor(() => expect(mockMutation.saveCheckin).toHaveBeenCalledTimes(2));
      expect(mockMutation.saveCheckin.mock.calls[1][0].price).toBeLessThanOrEqual(1000);
    });

    it("sends only one tasting when the button is pressed twice very fast", async () => {
      const user = userEvent.setup();
      const pending = deferred<CreatedCheckin>();
      mockMutation.saveCheckin.mockReturnValue(pending.promise);
      renderForm();
      await fillValidForm(user);

      await user.dblClick(submitButton());

      expect(mockMutation.saveCheckin).toHaveBeenCalledTimes(1);
      pending.resolve(CREATED);
      await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    });

    it("shows the pending state on the button while the tasting is being saved", () => {
      mockMutation.useCreateCheckinMutation.mockReturnValue({ saveCheckin: mockMutation.saveCheckin, isSaving: true });

      renderForm();

      expect(submitButton()).toHaveAttribute("data-pending", "true");
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
      await waitFor(() => expect(mockMutation.saveCheckin).toHaveBeenCalledTimes(1));
      expect(mockMutation.saveCheckin.mock.calls[0][0].photo).toBe(photo);
    });

    it("sends the tasting without a photo once the photo is removed", async () => {
      const user = userEvent.setup();
      const { container } = renderForm();
      await fillValidForm(user);
      choosePhoto(container, png());
      await user.click(await screen.findByRole("button", { name: "Retirer la photo" }));
      expect(screen.queryByRole("img", { name: "Aperçu de la photo" })).not.toBeInTheDocument();

      await user.click(submitButton());

      await waitFor(() => expect(mockMutation.saveCheckin).toHaveBeenCalledTimes(1));
      expect(mockMutation.saveCheckin.mock.calls[0][0].photo).toBeNull();
    });

    it("shows a message and sends no photo for a pdf", async () => {
      const user = userEvent.setup();
      const { container } = renderForm();
      await fillValidForm(user);

      choosePhoto(container, new File([new Uint8Array(10)], "doc.pdf", { type: "application/pdf" }));

      expect(await screen.findByText("Choisissez une image JPEG, PNG ou WebP.")).toBeInTheDocument();
      expect(screen.queryByRole("img", { name: "Aperçu de la photo" })).not.toBeInTheDocument();
      await user.click(submitButton());
      await waitFor(() => expect(mockMutation.saveCheckin).toHaveBeenCalledTimes(1));
      expect(mockMutation.saveCheckin.mock.calls[0][0].photo).toBeNull();
    });

    it("keeps the photo when the server fails so the user can send again", async () => {
      const user = userEvent.setup();
      mockMutation.saveCheckin.mockRejectedValueOnce(new Error("boom"));
      const { container } = renderForm();
      await fillValidForm(user);
      const photo = png();
      choosePhoto(container, photo);

      await user.click(submitButton());

      await waitFor(() => expect(mockMutation.saveCheckin).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(submitButton()).not.toHaveAttribute("data-pending"));
      expect(screen.getByRole("img", { name: "Aperçu de la photo" })).toBeInTheDocument();
      await user.click(submitButton());
      await waitFor(() => expect(mockMutation.saveCheckin).toHaveBeenCalledTimes(2));
      expect(mockMutation.saveCheckin.mock.calls[1][0].photo).toBe(photo);
    });
  });

  describe("when the server fails", () => {
    it("keeps the whole input, calls nothing back and lets the user send again", async () => {
      const user = userEvent.setup();
      mockMutation.saveCheckin.mockRejectedValueOnce(new Error("boom"));
      renderForm();
      await user.type(placeInput(), "Chez Paul");
      await user.click(screen.getByRole("radio", { name: "Canette" }));
      await user.click(aromaRow("Agrumes"));
      await user.type(screen.getByLabelText("Commentaire"), "Top");

      await user.click(submitButton());

      await waitFor(() => expect(mockMutation.saveCheckin).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(submitButton()).not.toHaveAttribute("data-pending"));
      expect(onSaved).not.toHaveBeenCalled();
      expect(placeInput().value).toBe("Chez Paul");
      expect(screen.getByRole("radio", { name: "Canette" })).toBeChecked();
      expect(aromaRow("Agrumes")).toHaveAttribute("aria-selected", "true");
      expect((screen.getByLabelText("Commentaire") as HTMLTextAreaElement).value).toBe("Top");
      expect(dateInput().value).toBe("2026-10-12T12:00");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      await user.click(submitButton());

      await waitFor(() => expect(mockMutation.saveCheckin).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    });
  });
});
