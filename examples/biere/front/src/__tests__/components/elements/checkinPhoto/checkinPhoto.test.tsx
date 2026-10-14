import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { CheckinPhoto } from "@/components/elements/checkinPhoto/checkinPhoto";
import { API_BASE_URL } from "@/config/apiConfig";

const PHOTO_ID = "0b6f1c1e-6a34-4c8e-9f3a-2f6d7b1c9a10";
const PHOTO_URL = `${API_BASE_URL}/api/v1/photos/${PHOTO_ID}`;

const renderPhoto = () => renderWithProviders(<CheckinPhoto photoId={PHOTO_ID} alt="Photo de la dégustation" />);

describe("CheckinPhoto", () => {
  it("shows a square thumbnail of the photo served by the API", async () => {
    renderPhoto();

    const thumbnail = screen.getByRole("img", { name: "Photo de la dégustation" });
    expect(thumbnail).toHaveAttribute("src", PHOTO_URL);
    expect(thumbnail).toHaveClass("aspect-square");
    expect(screen.getByRole("button", { name: "Agrandir la photo" })).toBeInTheDocument();
  });

  it("opens the photo large in a dialog headed by its alt text, without opening it first", async () => {
    const user = userEvent.setup();
    renderPhoto();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Agrandir la photo" }));

    const dialog = await screen.findByRole("dialog", { name: "Photo de la dégustation" });
    expect(dialog).toBeInTheDocument();
    const images = screen.getAllByRole("img", { name: "Photo de la dégustation", hidden: true });
    expect(images).toHaveLength(2);
    images.forEach((image) => expect(image).toHaveAttribute("src", PHOTO_URL));
  });

  it("closes the dialog with the Fermer button", async () => {
    const user = userEvent.setup();
    renderPhoto();
    await user.click(screen.getByRole("button", { name: "Agrandir la photo" }));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: "Fermer" }));

    await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("closes the dialog with Escape", async () => {
    const user = userEvent.setup();
    renderPhoto();
    await user.click(screen.getByRole("button", { name: "Agrandir la photo" }));
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("replaces the image with a hidden neutral pictogram when the photo cannot be loaded", async () => {
    const { container } = renderPhoto();

    fireEvent.error(screen.getByRole("img", { name: "Photo de la dégustation" }));

    expect(screen.queryByRole("img", { name: "Photo de la dégustation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Agrandir la photo" })).not.toBeInTheDocument();
    const pictogram = container.querySelector("svg");
    expect(pictogram).not.toBeNull();
    expect(pictogram).toHaveAttribute("aria-hidden", "true");
    const holder = pictogram?.parentElement;
    expect(holder).toHaveClass("text-muted");
    expect(holder).not.toHaveClass("text-danger");
  });
});
