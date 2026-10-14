import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "@/i18n/i18n";
import { AvatarPicker } from "@/pages/profile/components/elements/avatarPicker/avatarPicker";
import { UserAvatar } from "@/components/elements/userAvatar/userAvatar";
import { AvatarEnum } from "@/types/enums/user/avatarEnum";
import { AvatarSizeEnum } from "@/types/enums/user/avatarSizeEnum";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const FRENCH_NAMES = ["Houblon", "Malt", "Verre", "Chope", "Bouteille", "Canette", "Tonneau", "Tireuse", "Capsule", "Mousse", "Blé", "Bretzel"];

const renderPicker = (value = AvatarEnum.MALT) => {
  const onChange = vi.fn();
  const view = renderWithProviders(<AvatarPicker value={value} onChange={onChange} />);
  return { onChange, ...view };
};

describe("AvatarPicker", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("offers twelve choices with malt checked", async () => {
    renderPicker(AvatarEnum.MALT);

    const group = screen.getByRole("radiogroup", { name: "Choisir un avatar" });
    const radios = screen.getAllByRole("radio");
    expect(group).toBeInTheDocument();
    expect(radios.map((radio) => radio.closest("label")?.textContent)).toEqual(FRENCH_NAMES);
    expect(screen.getByRole("radio", { name: "Malt" })).toBeChecked();
    expect(radios.filter((radio) => (radio as HTMLInputElement).checked)).toHaveLength(1);
  });

  it("labels the group in english", async () => {
    await i18n.changeLanguage("en");
    renderPicker();

    expect(screen.getByRole("radiogroup", { name: "Choose an avatar" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Foam" })).toBeInTheDocument();
  });

  it("reports the avatar the user presses", async () => {
    const { onChange } = renderPicker(AvatarEnum.MALT);

    await user.click(screen.getByRole("radio", { name: "Mousse" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(AvatarEnum.FOAM);
  });

  it("moves the choice to the next avatar with the right arrow", async () => {
    const { onChange } = renderPicker(AvatarEnum.MALT);

    screen.getByRole("radio", { name: "Malt" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(onChange).toHaveBeenCalledWith("glass");
  });

  it("moves the choice to the previous avatar with the left arrow", async () => {
    const { onChange } = renderPicker(AvatarEnum.MALT);

    screen.getByRole("radio", { name: "Malt" }).focus();
    await user.keyboard("{ArrowLeft}");

    expect(onChange).toHaveBeenCalledWith("hop");
  });

  it("gives every choice a touch target of at least 44px and hides the drawings from screen readers", async () => {
    const { container } = renderPicker();

    screen.getAllByRole("radio").forEach((radio) => {
      const target = radio.closest("label");
      expect(target?.className).toContain("min-h-11");
      expect(target?.className).toContain("min-w-11");
    });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelectorAll("svg")).toHaveLength(12);
  });

  it("draws every choice with the large avatar", async () => {
    const reference = renderWithProviders(<UserAvatar avatar={AvatarEnum.HOP} size={AvatarSizeEnum.LG} isDecorative />);
    const largeClass = reference.container.firstElementChild?.className;
    reference.unmount();
    const medium = renderWithProviders(<UserAvatar avatar={AvatarEnum.HOP} size={AvatarSizeEnum.MD} isDecorative />);
    const mediumClass = medium.container.firstElementChild?.className;
    medium.unmount();
    expect(largeClass).not.toBe(mediumClass);

    const { container } = renderPicker();

    const avatars = container.querySelectorAll("label svg");
    expect(avatars).toHaveLength(12);
    avatars.forEach((svg) => expect(svg.closest(".avatar")?.className).toBe(largeClass));
  });

  it("lays the choices out on four columns with no horizontal scroll", async () => {
    renderPicker();

    const group = screen.getByRole("radiogroup", { name: "Choisir un avatar" });
    const grid = group.querySelector(".grid");
    expect(grid?.className).toContain("grid-cols-4");
    expect(grid?.className).not.toMatch(/(?:^|\s)w-\[|min-w-\[/);
    expect(grid?.className).toContain("min-w-0");
  });

  it("styles the checked choice with the soft accent fill", async () => {
    renderPicker();

    const checked = screen.getByRole("radio", { name: "Malt" }).closest("label");
    expect(checked?.className).toContain("data-[selected=true]:bg-accent-soft");
  });
});
