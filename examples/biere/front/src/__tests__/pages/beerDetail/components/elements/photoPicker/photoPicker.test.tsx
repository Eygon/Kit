import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhotoPicker } from "@/pages/beerDetail/components/elements/photoPicker/photoPicker";
import { PHOTO_ACCEPTED_TYPES, PHOTO_MAX_SIZE_BYTES } from "@/pages/beerDetail/utils/beerDetailConstants";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";


const FIVE_MB = 5 * 1024 * 1024;
const onChange = vi.fn();

const makeFile = (name: string, type: string, size = 10) =>
  new File([new Uint8Array(size)], name, { type });

const renderPicker = (file: File | null = null) => renderWithProviders(<PhotoPicker file={file} onChange={onChange} />);

const fileInputs = (container: HTMLElement) => [...container.querySelectorAll<HTMLInputElement>('input[type="file"]')];
const captureInput = (container: HTMLElement) => fileInputs(container).find((input) => input.hasAttribute("capture"))!;
const galleryInput = (container: HTMLElement) => fileInputs(container).find((input) => !input.hasAttribute("capture"))!;

const choose = (input: HTMLInputElement, file: File) => fireEvent.change(input, { target: { files: [file] } });

describe("PhotoPicker", () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    createObjectURL = vi.fn((file: File) => `blob:${file.name}`);
    revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: revokeObjectURL });
    clickSpy = vi.spyOn(HTMLInputElement.prototype, "click");
  });

  afterEach(() => {
    clickSpy.mockRestore();
  });

  it("declares a five megabyte limit and the three accepted image types", () => {
    expect(PHOTO_MAX_SIZE_BYTES).toBe(FIVE_MB);
    expect(PHOTO_ACCEPTED_TYPES).toEqual(["image/jpeg", "image/png", "image/webp"]);
  });

  describe("opening the camera or the gallery", () => {
    it("shows the two buttons and no preview or message at first", () => {
      renderPicker();

      expect(screen.getByRole("button", { name: "Prendre une photo" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Choisir dans la galerie" })).toBeInTheDocument();
      expect(screen.queryByRole("img", { name: "Aperçu de la photo" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Retirer la photo" })).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("gives each button its own hidden file field limited to jpeg, png and webp, the camera one asking for the back camera", () => {
      const { container } = renderPicker();

      expect(fileInputs(container)).toHaveLength(2);
      fileInputs(container).forEach((input) => expect(input).toHaveAttribute("accept", "image/jpeg,image/png,image/webp"));
      expect(captureInput(container)).toHaveAttribute("capture", "environment");
      expect(galleryInput(container)).not.toHaveAttribute("capture");
      fileInputs(container).forEach((input) => expect(input).toHaveClass("hidden"));
    });

    it("gives both buttons the large size", () => {
      renderPicker();

      expect(screen.getByRole("button", { name: "Prendre une photo" })).toHaveClass("button--lg");
      expect(screen.getByRole("button", { name: "Choisir dans la galerie" })).toHaveClass("button--lg");
    });

    it("opens the camera field when Prendre une photo is pressed, and only that one", async () => {
      const user = userEvent.setup();
      const { container } = renderPicker();

      await user.click(screen.getByRole("button", { name: "Prendre une photo" }));

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(clickSpy.mock.contexts[0]).toBe(captureInput(container));
    });

    it("opens the gallery field when Choisir dans la galerie is pressed, and only that one", async () => {
      const user = userEvent.setup();
      const { container } = renderPicker();

      await user.click(screen.getByRole("button", { name: "Choisir dans la galerie" }));

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(clickSpy.mock.contexts[0]).toBe(galleryInput(container));
    });
  });

  describe("choosing a valid image", () => {
    it.each([
      ["camera", captureInput],
      ["gallery", galleryInput],
    ])("hands the png chosen from the %s back and shows no message", (_name, pick) => {
      const { container } = renderPicker();
      const png = makeFile("beer.png", "image/png");

      choose(pick(container), png);

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(png);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it.each([
      ["camera", captureInput],
      ["gallery", galleryInput],
    ])("empties the %s field after a choice so the same file can be chosen again", (_name, pick) => {
      const { container } = renderPicker();
      const input = pick(container);
      const assigned: string[] = [];
      Object.defineProperty(input, "value", {
        configurable: true,
        get: () => "",
        set: (value: string) => assigned.push(value),
      });

      choose(input, makeFile("beer.png", "image/png"));

      expect(assigned).toEqual([""]);
    });

    it("accepts a jpeg, a webp and a file of exactly five megabytes", () => {
      const { container } = renderPicker();
      const files = [
        makeFile("a.jpg", "image/jpeg"),
        makeFile("b.webp", "image/webp"),
        makeFile("c.png", "image/png", FIVE_MB),
      ];

      files.forEach((file) => choose(galleryInput(container), file));

      expect(onChange.mock.calls.map(([file]) => file)).toEqual(files);
    });

    it("shows the preview of the chosen photo with the remove button", () => {
      const png = makeFile("beer.png", "image/png");

      renderPicker(png);

      expect(createObjectURL).toHaveBeenCalledWith(png);
      expect(screen.getByRole("img", { name: "Aperçu de la photo" })).toHaveAttribute("src", "blob:beer.png");
      expect(screen.getByRole("button", { name: "Retirer la photo" })).toBeInTheDocument();
    });

    it("clears an earlier message once a valid image is chosen", () => {
      const { container } = renderPicker();
      choose(galleryInput(container), makeFile("doc.pdf", "application/pdf"));
      expect(screen.getByRole("alert")).toBeInTheDocument();

      choose(galleryInput(container), makeFile("beer.png", "image/png"));

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("choosing something that is refused", () => {
    it("says the photo is too large for a file over five megabytes and keeps nothing", () => {
      const { container } = renderPicker();

      choose(galleryInput(container), makeFile("big.png", "image/png", FIVE_MB + 1));

      expect(screen.getByRole("alert")).toHaveTextContent("La photo dépasse 5 Mo.");
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(null);
      expect(screen.queryByRole("img", { name: "Aperçu de la photo" })).not.toBeInTheDocument();
      expect(createObjectURL).not.toHaveBeenCalled();
    });

    it.each([
      ["a pdf", makeFile("doc.pdf", "application/pdf")],
      ["a gif", makeFile("anim.gif", "image/gif")],
      ["a file without a type", makeFile("mystery", "")],
    ])("asks for a JPEG, PNG or WebP image for %s and keeps nothing", (_name, file) => {
      const { container } = renderPicker();

      choose(captureInput(container), file);

      expect(screen.getByRole("alert")).toHaveTextContent("Choisissez une image JPEG, PNG ou WebP.");
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(null);
      expect(screen.queryByRole("img", { name: "Aperçu de la photo" })).not.toBeInTheDocument();
      expect(createObjectURL).not.toHaveBeenCalled();
    });

    it("tells the size problem first when a pdf is also too large", () => {
      const { container } = renderPicker();

      choose(galleryInput(container), makeFile("big.pdf", "application/pdf", FIVE_MB + 1));

      expect(screen.getByRole("alert")).toHaveTextContent("La photo dépasse 5 Mo.");
    });

    it("does nothing when the chooser is closed without a file", () => {
      const { container } = renderPicker();

      fireEvent.change(galleryInput(container), { target: { files: [] } });

      expect(onChange).not.toHaveBeenCalled();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("removing the photo", () => {
    it("hands null back when Retirer la photo is pressed", async () => {
      const user = userEvent.setup();
      renderPicker(makeFile("beer.png", "image/png"));

      await user.click(screen.getByRole("button", { name: "Retirer la photo" }));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(null);
    });

    it("revokes the preview address when the photo is removed", () => {
      const png = makeFile("beer.png", "image/png");
      const { rerender } = renderPicker(png);
      expect(revokeObjectURL).not.toHaveBeenCalled();

      rerender(<PhotoPicker file={null} onChange={onChange} />);

      expect(revokeObjectURL).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:beer.png");
      expect(screen.queryByRole("img", { name: "Aperçu de la photo" })).not.toBeInTheDocument();
    });

    it("revokes the old address and creates a new one when the photo is replaced", () => {
      const { rerender } = renderPicker(makeFile("one.png", "image/png"));

      rerender(<PhotoPicker file={makeFile("two.png", "image/png")} onChange={onChange} />);

      expect(revokeObjectURL).toHaveBeenCalledWith("blob:one.png");
      expect(screen.getByRole("img", { name: "Aperçu de la photo" })).toHaveAttribute("src", "blob:two.png");
    });

    it("keeps the same preview address when the parent renders again with the same photo", () => {
      const png = makeFile("beer.png", "image/png");
      const { rerender } = renderPicker(png);

      rerender(<PhotoPicker file={png} onChange={vi.fn()} />);
      rerender(<PhotoPicker file={png} onChange={onChange} />);

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).not.toHaveBeenCalled();
      expect(screen.getByRole("img", { name: "Aperçu de la photo" })).toHaveAttribute("src", "blob:beer.png");
    });

    it("revokes the preview address when the picker unmounts", () => {
      const { unmount } = renderPicker(makeFile("beer.png", "image/png"));

      unmount();

      expect(revokeObjectURL).toHaveBeenCalledWith("blob:beer.png");
    });
  });
});
