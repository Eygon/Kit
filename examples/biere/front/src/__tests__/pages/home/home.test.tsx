import { screen } from "@testing-library/react";
import { HomePage } from "@/pages/home/home";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import FeedService from "@/api/feed/feedService";

vi.mock("@/api/feed/feedService", () => ({
  default: { getPage: vi.fn() },
}));

describe("HomePage", () => {
  beforeEach(() => {
    vi.mocked(FeedService.getPage).mockResolvedValue({ items: [], total: 0, page: 1, size: 20 });
  });

  it("shows the Accueil title with its subtitle", () => {
    renderWithProviders(<HomePage />);

    expect(screen.getByRole("heading", { level: 1, name: "Accueil" })).toBeInTheDocument();
    expect(screen.getByText("Les dernières dégustations des profils que vous suivez.")).toBeInTheDocument();
  });

  it("links the Find profiles shortcut to /profils with a 44 px touch target", () => {
    renderWithProviders(<HomePage />);

    const shortcut = screen.getByRole("link", { name: "Trouver des profils" });
    expect(shortcut).toHaveAttribute("href", "/profils");
    expect(shortcut.className).toContain("min-h-11");
  });

  it("renders the activity feed under the shortcut", async () => {
    renderWithProviders(<HomePage />);

    const shortcut = screen.getByRole("link", { name: "Trouver des profils" });
    const feedHeading = await screen.findByRole("heading", { level: 2, name: "Fil d'actualité" });
    expect(shortcut.compareDocumentPosition(feedHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(await screen.findByRole("heading", { name: "Suivez des profils pour voir leurs dégustations" })).toBeInTheDocument();
  });
});
