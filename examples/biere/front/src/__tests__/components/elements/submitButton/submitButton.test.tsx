import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubmitButton } from "@/components/elements/submitButton/submitButton";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

describe("SubmitButton", () => {
  it("shows its label as a large full width submit button when nothing is pending", () => {
    renderWithProviders(<SubmitButton label="Enregistrer" isPending={false} />);

    const button = screen.getByRole("button", { name: "Enregistrer" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button.className).toContain("button--lg");
    expect(button.className).toContain("button--full-width");
    expect(button).toHaveAttribute("aria-busy", "false");
    expect(button).not.toHaveAttribute("data-pending");
    expect(button.querySelector('[role="status"], .spinner')).toBeNull();
  });

  it("shows Enregistrement… with a spinner and aria-busy while pending, in place of the label", () => {
    renderWithProviders(<SubmitButton label="Enregistrer" isPending />);

    const button = screen.getByRole("button", { name: /Enregistrement…/ });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("data-pending", "true");
    expect(button).toHaveTextContent("Enregistrement…");
    expect(button).not.toHaveTextContent("Enregistrer");
    const spinner = button.querySelector(".spinner");
    expect(spinner).not.toBeNull();
    expect(spinner).toHaveClass("spinner--sm", "spinner--current");
    expect(screen.queryByRole("button", { name: "Enregistrer" })).not.toBeInTheDocument();
  });

  it("takes its label back once the sending is over", () => {
    const { rerender } = render(<SubmitButton label="Publier mon avis" isPending />);
    expect(screen.getByRole("button")).toHaveTextContent("Enregistrement…");

    rerender(<SubmitButton label="Publier mon avis" isPending={false} />);

    expect(screen.getByRole("button", { name: "Publier mon avis" })).toHaveAttribute("aria-busy", "false");
    expect(screen.getByRole("button")).not.toHaveTextContent("Enregistrement…");
  });

  it("submits the form it is in when pressed, and does not while pending", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    const { rerender } = render(
      <form onSubmit={onSubmit}>
        <SubmitButton label="Enregistrer" isPending={false} />
      </form>,
    );
    await user.click(screen.getByRole("button"));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    rerender(
      <form onSubmit={onSubmit}>
        <SubmitButton label="Enregistrer" isPending />
      </form>,
    );
    await user.click(screen.getByRole("button"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("carries no form attribute when none is given", () => {
    renderWithProviders(<SubmitButton label="Enregistrer" isPending={false} />);

    expect(screen.getByRole("button", { name: "Enregistrer" })).not.toHaveAttribute("form");
  });

  it("submits the form it points to through its form attribute from outside that form, and not while pending", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    const { rerender } = render(
      <div>
        <form id="sheet-form" onSubmit={onSubmit} />
        <footer>
          <SubmitButton label="Enregistrer" isPending={false} form="sheet-form" />
        </footer>
      </div>,
    );
    const button = screen.getByRole("button", { name: "Enregistrer" });
    expect(button).toHaveAttribute("form", "sheet-form");
    expect(button.closest("form")).toBeNull();
    await user.click(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    rerender(
      <div>
        <form id="sheet-form" onSubmit={onSubmit} />
        <footer>
          <SubmitButton label="Enregistrer" isPending form="sheet-form" />
        </footer>
      </div>,
    );
    await user.click(screen.getByRole("button"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("is full width by default and drops the full width class when isFullWidth is false", () => {
    const { rerender } = render(<SubmitButton label="Enregistrer" isPending={false} />);
    expect(screen.getByRole("button").className).toContain("button--full-width");

    rerender(<SubmitButton label="Enregistrer" isPending={false} isFullWidth={false} />);
    expect(screen.getByRole("button").className).not.toContain("button--full-width");
    expect(screen.getByRole("button").className).toContain("button--lg");

    rerender(<SubmitButton label="Enregistrer" isPending={false} isFullWidth />);
    expect(screen.getByRole("button").className).toContain("button--full-width");
  });
});
