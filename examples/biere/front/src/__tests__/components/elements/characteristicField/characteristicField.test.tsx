import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { CharacteristicField } from "@/components/elements/characteristicField/characteristicField";
import type { CharacteristicFieldProps } from "@/types/components/characteristicField";
import { BeerCharacteristicEnum } from "@/types/enums/beer/beerCharacteristicEnum";

const onChange = vi.fn();

const renderField = (overrides: Partial<CharacteristicFieldProps>) => {
  const props: CharacteristicFieldProps = {
    characteristic: BeerCharacteristicEnum.IBU,
    value: Number.NaN,
    onChange,
    isRequired: false,
    errorMessage: null,
    ...overrides,
  };
  return renderWithProviders(<CharacteristicField {...props} />);
};

describe("CharacteristicField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("number characteristics", () => {
    it("shows a labelled number field with a 44px target and its bounds as a hint", () => {
      renderField({ characteristic: BeerCharacteristicEnum.IBU });

      const field = screen.getByRole("textbox", { name: "Amertume" });
      expect(field).toHaveValue("");
      expect(field.closest(".number-field__group")).toHaveClass("min-h-11");
      expect(screen.getByText("Entre 0 et 120")).toBeInTheDocument();
    });

    it("shows the bounds of the colour and of the degree", () => {
      renderField({ characteristic: BeerCharacteristicEnum.EBC });
      expect(screen.getByRole("textbox", { name: "Couleur" })).toBeInTheDocument();
      expect(screen.getByText("Entre 2 et 80")).toBeInTheDocument();
    });

    it("shows the value it is given", () => {
      renderField({ characteristic: BeerCharacteristicEnum.IBU, value: 35 });

      expect(screen.getByRole("textbox", { name: "Amertume" })).toHaveValue("35");
    });

    it("hands the typed number to onChange once the field is left, even above the bound", async () => {
      const user = userEvent.setup();
      renderField({ characteristic: BeerCharacteristicEnum.IBU });

      await user.click(screen.getByRole("textbox", { name: "Amertume" }));
      await user.paste("130");
      await user.tab();

      expect(onChange).toHaveBeenCalledWith(130);
    });

    it("hands NaN to onChange when the field is emptied", async () => {
      const user = userEvent.setup();
      renderField({ characteristic: BeerCharacteristicEnum.IBU, value: 35 });

      await user.clear(screen.getByRole("textbox", { name: "Amertume" }));
      await user.tab();

      expect(onChange).toHaveBeenCalledWith(Number.NaN);
    });

    it("shows the error under the field, marks it invalid and hides the hint", () => {
      renderField({ characteristic: BeerCharacteristicEnum.IBU, value: 130, errorMessage: "Entre 0 et 120" });

      const field = screen.getByRole("textbox", { name: "Amertume" });
      expect(field).toBeInvalid();
      expect(screen.getAllByText("Entre 0 et 120")).toHaveLength(1);
    });

    it("keeps the field valid when there is no error", () => {
      renderField({ characteristic: BeerCharacteristicEnum.IBU, value: 35 });

      expect(screen.getByRole("textbox", { name: "Amertume" })).toBeValid();
    });

    it("marks the field required when it is", () => {
      renderField({ characteristic: BeerCharacteristicEnum.ABV, value: Number.NaN, isRequired: true });

      expect(screen.getByRole("textbox", { name: /Degré/ })).toBeRequired();
    });
  });

  describe("a value of the wrong kind", () => {
    it("shows a number field empty when it is given a list", () => {
      renderField({ characteristic: BeerCharacteristicEnum.IBU, value: ["fruity"] });

      expect(screen.getByRole("textbox", { name: "Amertume" })).toHaveValue("");
    });

    it("shows no aroma selected and no format checked when it is given a number", () => {
      const { unmount } = renderField({ characteristic: BeerCharacteristicEnum.AROMAS, value: 3 });
      expect(screen.queryAllByRole("row", { selected: true })).toHaveLength(0);
      unmount();
      renderField({ characteristic: BeerCharacteristicEnum.FORMATS, value: 3 });
      expect(screen.queryAllByRole("checkbox", { checked: true })).toHaveLength(0);
    });
  });

  describe("scale characteristics", () => {
    it("starts the slider at the none value when optional, and says the value is not filled in", () => {
      renderField({ characteristic: BeerCharacteristicEnum.SWEETNESS, value: 0 });

      const slider = screen.getByRole("slider", { name: "Douceur" });
      expect(slider).toHaveAttribute("min", "0");
      expect(slider).toHaveAttribute("max", "5");
      expect(slider).toHaveValue("0");
      expect(screen.getByText("Non renseignée")).toBeInTheDocument();
    });

    it("starts the slider at 1 when required", () => {
      renderField({ characteristic: BeerCharacteristicEnum.SWEETNESS, value: 1, isRequired: true });

      expect(screen.getByRole("slider", { name: "Douceur" })).toHaveAttribute("min", "1");
      expect(screen.queryByText("Non renseignée")).not.toBeInTheDocument();
    });

    it("writes the level label of the value, for each scale", () => {
      const { unmount } = renderField({ characteristic: BeerCharacteristicEnum.SWEETNESS, value: 2 });
      expect(screen.getByText("Sèche")).toBeInTheDocument();
      unmount();
      const second = renderField({ characteristic: BeerCharacteristicEnum.ACIDITY, value: 5 });
      expect(screen.getByRole("slider", { name: "Acidité" })).toBeInTheDocument();
      expect(screen.getByText("Très vive")).toBeInTheDocument();
      second.unmount();
      renderField({ characteristic: BeerCharacteristicEnum.BODY, value: 3 });
      expect(screen.getByRole("slider", { name: "Corps" })).toBeInTheDocument();
      expect(screen.getByText("Moyen")).toBeInTheDocument();
    });

    it("hands the chosen level to onChange", () => {
      renderField({ characteristic: BeerCharacteristicEnum.SWEETNESS, value: 0 });

      fireEvent.change(screen.getByRole("slider", { name: "Douceur" }), { target: { value: "3" } });

      expect(onChange).toHaveBeenCalledWith(3);
    });

    it("shows the error as an alert under the slider", () => {
      renderField({ characteristic: BeerCharacteristicEnum.BODY, value: 6, errorMessage: "Valeur obligatoire" });

      expect(screen.getByRole("alert")).toHaveTextContent("Valeur obligatoire");
    });
  });

  describe("aromas", () => {
    it("lists the aromas as tags, selected ones included", () => {
      renderField({ characteristic: BeerCharacteristicEnum.AROMAS, value: ["fruity"] });

      const group = screen.getByRole("grid", { name: "Arômes" });
      expect(within(group).getAllByRole("row")).toHaveLength(18);
      expect(within(group).getByRole("row", { name: "Fruité" })).toHaveAttribute("aria-selected", "true");
      expect(within(group).getByRole("row", { name: "Agrumes" })).toHaveAttribute("aria-selected", "false");
      expect(within(group).getByRole("row", { name: "Fruité" })).toHaveClass("min-h-11");
    });

    it("hands the new selection of aromas to onChange", async () => {
      const user = userEvent.setup();
      renderField({ characteristic: BeerCharacteristicEnum.AROMAS, value: ["fruity"] });

      await user.click(screen.getByRole("row", { name: "Houblonné" }));

      expect(onChange).toHaveBeenCalledWith(["fruity", "hoppy"]);
    });

    it("disables the aromas that are not selected once 5 are chosen, and keeps the selected ones usable", () => {
      renderField({
        characteristic: BeerCharacteristicEnum.AROMAS,
        value: ["fruity", "citrus", "hoppy", "floral", "spicy"],
      });

      expect(screen.getByRole("row", { name: "Caramel" })).toHaveAttribute("aria-disabled", "true");
      expect(screen.getByRole("row", { name: "Fruité" })).not.toHaveAttribute("aria-disabled", "true");
    });

    it("keeps every aroma enabled with 4 chosen", () => {
      renderField({ characteristic: BeerCharacteristicEnum.AROMAS, value: ["fruity", "citrus", "hoppy", "floral"] });

      expect(screen.getByRole("row", { name: "Caramel" })).not.toHaveAttribute("aria-disabled", "true");
    });

    it("shows the bounds as a hint, and the error as an alert in place of it", () => {
      const { unmount } = renderField({ characteristic: BeerCharacteristicEnum.AROMAS, value: [] });
      expect(screen.getByText("Choisissez de 1 à 5 valeurs")).toBeInTheDocument();
      unmount();

      renderField({
        characteristic: BeerCharacteristicEnum.AROMAS,
        value: ["fruity", "citrus", "hoppy", "floral", "spicy", "caramel"],
        errorMessage: "Choisissez de 1 à 5 valeurs",
      });
      expect(screen.getByRole("alert")).toHaveTextContent("Choisissez de 1 à 5 valeurs");
      expect(screen.getAllByText("Choisissez de 1 à 5 valeurs")).toHaveLength(1);
    });
  });

  describe("formats", () => {
    it("lists the formats as checkboxes, checked when selected", () => {
      renderField({ characteristic: BeerCharacteristicEnum.FORMATS, value: ["can"] });

      const group = screen.getByRole("group", { name: "Formats" });
      expect(within(group).getAllByRole("checkbox")).toHaveLength(3);
      expect(within(group).getByRole("checkbox", { name: "Canette" })).toBeChecked();
      expect(within(group).getByRole("checkbox", { name: "Bouteille" })).not.toBeChecked();
    });

    it("hands the new selection of formats to onChange", async () => {
      const user = userEvent.setup();
      renderField({ characteristic: BeerCharacteristicEnum.FORMATS, value: ["can"] });

      await user.click(screen.getByRole("checkbox", { name: "Pression" }));

      expect(onChange).toHaveBeenCalledWith(["can", "draft"]);
    });

    it("shows the bounds as a hint and the error as an alert", () => {
      renderField({
        characteristic: BeerCharacteristicEnum.FORMATS,
        value: [],
        errorMessage: "Choisissez de 1 à 3 valeurs",
      });

      expect(screen.getByRole("alert")).toHaveTextContent("Choisissez de 1 à 3 valeurs");
    });
  });
});
