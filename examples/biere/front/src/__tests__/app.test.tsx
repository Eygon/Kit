import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "@/app";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

describe("App", () => {
  it.each([
    ["/", "Encyclopédie"],
    ["/carte", "Carte"],
    ["/journal", "Journal"],
    ["/profil", "Profil"],
  ])("renders the page of %s with its tab marked current", (path, title) => {
    renderWithProviders(<App />, { initialPath: path });

    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: title })).toHaveAttribute("aria-current", "page");
  });

  it("redirects an unknown path to the encyclopedia", () => {
    renderWithProviders(<App />, { initialPath: "/inconnu" });

    expect(screen.getByRole("heading", { level: 1, name: "Encyclopédie" })).toBeInTheDocument();
  });

  it("navigates between pages from the tab bar", async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />);

    await user.click(screen.getByRole("link", { name: "Journal" }));

    expect(screen.getByRole("heading", { level: 1, name: "Journal" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Journal" })).toHaveAttribute("aria-current", "page");
  });

  it("stays in the light theme even when the system prefers dark", () => {
    const matchMedia = vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) => ({ matches: true, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as MediaQueryList,
    );

    renderWithProviders(<App />);

    expect(document.documentElement).not.toHaveClass("dark");
    expect(document.documentElement).not.toHaveAttribute("data-theme", "dark");
    matchMedia.mockRestore();
  });

  it("keeps the content clear of the tab bar and the safe area", () => {
    renderWithProviders(<App />);

    const main = screen.getByRole("main");
    expect(main.className).toContain("pb-[calc(6rem+env(safe-area-inset-bottom))]");
    expect(main.parentElement?.className).toContain("min-h-dvh");
  });
});
