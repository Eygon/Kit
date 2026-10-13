import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DemoUserSelect } from "@/pages/profile/components/widgets/demoUserSelect/demoUserSelect";
import { DemoUserIdEnum } from "@/types/enums/user/demoUserIdEnum";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const onSelectUser = vi.fn();

const renderSelect = (selectedUserId = DemoUserIdEnum.ALICE) =>
  renderWithProviders(<DemoUserSelect selectedUserId={selectedUserId} onSelectUser={onSelectUser} />);

describe("DemoUserSelect", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the selected user in a labelled trigger", () => {
    renderSelect(DemoUserIdEnum.BOB);

    expect(screen.getByText("Utilisateur de démonstration")).toBeInTheDocument();
    const trigger = screen.getByRole("button", { name: /Utilisateur courant/ });
    expect(trigger).toHaveTextContent("Bob (utilisateur 2)");
  });

  it("offers the three demo users and reports the chosen one", async () => {
    const user = userEvent.setup();
    renderSelect();

    await user.click(screen.getByRole("button", { name: /Utilisateur courant/ }));
    const options = screen.getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "Alice (utilisateur 1)",
      "Bob (utilisateur 2)",
      "Carol (utilisateur 3)",
    ]);

    await user.click(screen.getByRole("option", { name: "Carol (utilisateur 3)" }));

    expect(onSelectUser).toHaveBeenCalledTimes(1);
    expect(onSelectUser).toHaveBeenCalledWith(DemoUserIdEnum.CAROL);
  });
});
