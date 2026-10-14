import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExpandableText } from "@/components/elements/expandableText/expandableText";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const LONG_TEXT = "Une bière très longue en commentaire ".repeat(20).trim();

const stubLayout = (scrollHeight: number, clientHeight: number) => {
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(scrollHeight);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(clientHeight);
};

describe("ExpandableText", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a short text in full with no toggle button", () => {
    stubLayout(48, 48);
    renderWithProviders(<ExpandableText text="Très bonne" />);

    expect(screen.getByText("Très bonne")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("clamps the text to 3 lines and lets a long unbroken word wrap", () => {
    stubLayout(96, 48);
    renderWithProviders(<ExpandableText text={LONG_TEXT} />);

    const paragraph = screen.getByText(LONG_TEXT);
    expect(paragraph).toHaveClass("line-clamp-3", "break-words");
  });

  it("offers a collapsed Voir plus ghost button of 44 px when the text overflows", () => {
    stubLayout(96, 48);
    renderWithProviders(<ExpandableText text={LONG_TEXT} />);

    const button = screen.getByRole("button", { name: "Voir plus" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveClass("button--ghost", "min-h-11");
  });

  it("expands on a press, announces it, then collapses on a second press", async () => {
    stubLayout(96, 48);
    const user = userEvent.setup();
    renderWithProviders(<ExpandableText text={LONG_TEXT} />);

    await user.click(screen.getByRole("button", { name: "Voir plus" }));

    const lessButton = screen.getByRole("button", { name: "Voir moins" });
    expect(lessButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(LONG_TEXT)).not.toHaveClass("line-clamp-3");
    expect(screen.queryByRole("button", { name: "Voir plus" })).not.toBeInTheDocument();

    await user.click(lessButton);

    expect(screen.getByRole("button", { name: "Voir plus" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText(LONG_TEXT)).toHaveClass("line-clamp-3");
  });

  it("measures again when the text changes", () => {
    stubLayout(96, 48);
    const { rerender } = renderWithProviders(<ExpandableText text={LONG_TEXT} />);
    expect(screen.getByRole("button", { name: "Voir plus" })).toBeInTheDocument();

    stubLayout(48, 48);
    rerender(<ExpandableText text="Court" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
