import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfilePage } from "@/pages/profile/profile";
import { StorageKeyEnum } from "@/types/enums/storage/storageKeyEnum";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

describe("ProfilePage", () => {
  beforeEach(() => window.localStorage.clear());

  it("renders its title, the demo user selector and an empty state", () => {
    renderWithProviders(<ProfilePage />);

    expect(screen.getByRole("heading", { level: 1, name: "Profil" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Utilisateur courant/ })).toHaveTextContent("Alice (utilisateur 1)");
    expect(screen.getByRole("heading", { level: 2, name: "Aucune préférence pour l'instant" })).toBeInTheDocument();
  });

  it("persists the demo user picked in the selector", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await user.click(screen.getByRole("button", { name: /Utilisateur courant/ }));
    await user.click(screen.getByRole("option", { name: "Bob (utilisateur 2)" }));

    expect(window.localStorage.getItem(StorageKeyEnum.CURRENT_USER_ID)).toBe("2");
    expect(screen.getByRole("button", { name: /Utilisateur courant/ })).toHaveTextContent("Bob (utilisateur 2)");
  });
});
