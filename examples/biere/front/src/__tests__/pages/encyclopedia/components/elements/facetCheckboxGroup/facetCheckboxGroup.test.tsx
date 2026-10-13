import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FacetCheckboxGroup } from "@/pages/encyclopedia/components/elements/facetCheckboxGroup/facetCheckboxGroup";
import type { FacetCheckboxGroupProps } from "@/pages/encyclopedia/types/facetCheckboxGroup";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const onChange = vi.fn();

const OPTIONS: FacetCheckboxGroupProps["options"] = [
  { value: "BE", label: "Belgique", count: 49 },
  { value: "DE", label: "Allemagne", count: 12 },
  { value: "NL", label: "Pays-Bas", count: 0 },
];

const renderGroup = (props: Partial<FacetCheckboxGroupProps> = {}) =>
  renderWithProviders(<FacetCheckboxGroup label="Pays" options={OPTIONS} value={[]} onChange={onChange} {...props} />);

describe("FacetCheckboxGroup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("names the group and writes every option with its count", () => {
    renderGroup();

    const group = screen.getByRole("group", { name: "Pays" });
    expect(within(group).getAllByRole("checkbox").map((box) => box.closest("label")?.textContent)).toEqual([
      "Belgique (49)",
      "Allemagne (12)",
      "Pays-Bas (0)",
    ]);
  });

  it("checks the options of the value and only those", () => {
    renderGroup({ value: ["DE", "NL"] });

    expect(screen.getByRole("checkbox", { name: "Belgique (49)" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Allemagne (12)" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Pays-Bas (0)" })).toBeChecked();
  });

  it("reports the value with the pressed option added", async () => {
    const user = userEvent.setup();
    renderGroup({ value: ["DE"] });

    await user.click(screen.getByRole("checkbox", { name: "Belgique (49)" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(["DE", "BE"]);
  });

  it("reports the value without the option that gets unchecked", async () => {
    const user = userEvent.setup();
    renderGroup({ value: ["BE", "DE"] });

    await user.click(screen.getByRole("checkbox", { name: "Belgique (49)" }));

    expect(onChange).toHaveBeenCalledWith(["DE"]);
  });

  it("keeps an option with a count of zero checkable", async () => {
    const user = userEvent.setup();
    renderGroup();

    await user.click(screen.getByRole("checkbox", { name: "Pays-Bas (0)" }));

    expect(onChange).toHaveBeenCalledWith(["NL"]);
  });

  it("gives every option a touch target of at least 44 px", () => {
    renderGroup();

    screen.getAllByRole("checkbox").forEach((box) => {
      expect(box.closest("label")?.className).toContain("min-h-11");
    });
  });

  it("keeps the control and the label in one clickable chip, never stacked", () => {
    renderGroup();

    screen.getAllByRole("checkbox").forEach((box) => {
      const field = box.closest('[data-slot="checkbox"]');
      expect(field?.children).toHaveLength(1);
      expect(field?.firstElementChild?.tagName).toBe("LABEL");
    });
  });

  it("draws each option as an ink-bordered chip filled green with cream text once selected", () => {
    renderGroup({ value: ["DE"] });

    const chip = screen.getByRole("checkbox", { name: "Belgique (49)" }).closest("label");
    expect(chip?.className).toContain("border-mousse");
    expect(chip?.className).toContain("rounded-control");
    expect(chip?.className).toContain("whitespace-nowrap");
    expect(chip?.className).toContain("data-[selected=true]:bg-accent");
    expect(chip?.className).toContain("data-[selected=true]:text-accent-foreground");
    expect(chip?.className).toContain("data-[focus-visible=true]:focus-ring");
    expect(chip).not.toHaveAttribute("data-selected", "true");
    expect(screen.getByRole("checkbox", { name: "Allemagne (12)" }).closest("label")).toHaveAttribute(
      "data-selected",
      "true",
    );
  });

  it("lets the chips wrap onto new lines", () => {
    renderGroup();

    const chipsRow = screen.getAllByRole("checkbox")[0].closest('[data-slot="checkbox"]')?.parentElement;
    expect(chipsRow?.className).toContain("flex-wrap");
    expect(chipsRow?.firstElementChild?.className).toContain("mt-0");
  });

  it("toggles the option from the keyboard", async () => {
    const user = userEvent.setup();
    renderGroup();

    await user.tab();
    expect(screen.getByRole("checkbox", { name: "Belgique (49)" })).toHaveFocus();
    await user.keyboard(" ");

    expect(onChange).toHaveBeenCalledWith(["BE"]);
  });

  it("renders no checkbox for an empty option list", () => {
    renderGroup({ options: [] });

    expect(screen.getByRole("group", { name: "Pays" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
