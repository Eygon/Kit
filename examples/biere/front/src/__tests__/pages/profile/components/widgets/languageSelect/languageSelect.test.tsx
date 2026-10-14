import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageSelect } from "@/pages/profile/components/widgets/languageSelect/languageSelect";
import { LanguageEnum } from "@/types/enums/i18n/languageEnum";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const onSelectLanguage = vi.fn();

const renderSelect = (selectedLanguage: LanguageEnum) =>
  renderWithProviders(<LanguageSelect selectedLanguage={selectedLanguage} onSelectLanguage={onSelectLanguage} />);

describe("LanguageSelect", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows its title, its description and a labelled group of the two languages", () => {
    renderSelect(LanguageEnum.FR);

    expect(screen.getByText("Langue", { selector: "[data-slot='card-title']" })).toBeInTheDocument();
    expect(screen.getByText("Choisissez la langue de l'appli.")).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Langue de l'appli" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio").map((option) => option.textContent)).toEqual(["Français", "English"]);
  });

  it("announces only the active option as selected", () => {
    renderSelect(LanguageEnum.EN);

    expect(screen.getByRole("radio", { name: "English" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Français" })).toHaveAttribute("aria-checked", "false");
  });

  it("gives both options a touch target of at least 44 px", () => {
    renderSelect(LanguageEnum.FR);

    screen.getAllByRole("radio").forEach((option) => expect(option).toHaveClass("min-h-11"));
  });

  it("reports the language the user picks", async () => {
    renderSelect(LanguageEnum.FR);

    await userEvent.setup().click(screen.getByRole("radio", { name: "English" }));

    expect(onSelectLanguage).toHaveBeenCalledTimes(1);
    expect(onSelectLanguage).toHaveBeenCalledWith(LanguageEnum.EN);
  });

  it("never reports the other language when the active option is pressed again", async () => {
    renderSelect(LanguageEnum.FR);

    await userEvent.setup().click(screen.getByRole("radio", { name: "Français" }));

    expect(onSelectLanguage).not.toHaveBeenCalledWith(LanguageEnum.EN);
  });
});
