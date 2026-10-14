import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChunkLoadErrorAlert } from "@/components/modules/lazyPage/components/chunkLoadErrorAlert/chunkLoadErrorAlert";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const onRetry = vi.fn();

const renderAlert = () => renderWithProviders(<ChunkLoadErrorAlert onRetry={onRetry} />);

describe("ChunkLoadErrorAlert", () => {
  beforeEach(() => vi.clearAllMocks());

  it("announces the failure with a title and a description", () => {
    renderAlert();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Impossible de charger la page");
    expect(alert).toHaveTextContent("Vérifiez votre connexion, puis réessayez.");
  });

  it("calls onRetry once when the retry button is pressed", async () => {
    const user = userEvent.setup();
    renderAlert();

    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
