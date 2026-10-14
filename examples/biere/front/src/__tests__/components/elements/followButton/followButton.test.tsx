import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToggleButton, toast } from "@heroui/react";
import type { Mock } from "vitest";
import { FollowButton } from "@/components/elements/followButton/followButton";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import type { FollowButtonProps } from "@/types/components/followButton";
import { followUser, unfollowUser } from "@/utils/queryFunctions/profileQueryFunctions";

vi.mock("@heroui/react", async (importActual) => ({
  ...(await importActual<Record<string, unknown>>()),
  toast: { success: vi.fn(), danger: vi.fn() },
}));

vi.mock("@/utils/queryFunctions/profileQueryFunctions", () => ({
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
}));

const renderButton = (props: Partial<FollowButtonProps> = {}) =>
  renderWithProviders(<FollowButton userId={2} displayName="Bob" isFollowed={false} {...props} />);

describe("FollowButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows Suivre, named after the user and not pressed, when the user is not followed", async () => {
    renderButton();

    const button = screen.getByRole("button", { name: "Suivre Bob" });
    expect(button).toHaveTextContent("Suivre");
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toBeEnabled();
  });

  it("is a large button so the touch target reaches 44 px", async () => {
    const reference = renderWithProviders(
      <>
        <ToggleButton size="lg">Large</ToggleButton>
        <ToggleButton size="sm">Small</ToggleButton>
      </>,
    );
    const largeClasses = screen.getByRole("button", { name: "Large" }).className.split(" ").filter((name) => name.includes("lg"));
    const smallClasses = screen.getByRole("button", { name: "Small" }).className.split(" ").filter((name) => name.includes("sm"));
    expect(largeClasses.length).toBeGreaterThan(0);
    expect(smallClasses.length).toBeGreaterThan(0);
    reference.unmount();

    renderButton();

    const classes = screen.getByRole("button", { name: "Suivre Bob" }).className.split(" ");
    largeClasses.forEach((name) => expect(classes).toContain(name));
    smallClasses.forEach((name) => expect(classes).not.toContain(name));
  });

  it("shows Suivi, pressed, when the user is followed", async () => {
    renderButton({ isFollowed: true });

    const button = screen.getByRole("button", { name: "Suivre Bob" });
    expect(button).toHaveTextContent("Suivi");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("follows on press and toasts, without sending an unfollow", async () => {
    (followUser as Mock).mockResolvedValue({ id: 2 });
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "Suivre Bob" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Vous suivez Bob"));
    expect(followUser).toHaveBeenCalledTimes(1);
    expect(followUser).toHaveBeenCalledWith(2);
    expect(unfollowUser).not.toHaveBeenCalled();
  });

  it("unfollows on press when followed and toasts", async () => {
    (unfollowUser as Mock).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderButton({ isFollowed: true });

    await user.click(screen.getByRole("button", { name: "Suivre Bob" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Vous ne suivez plus Bob"));
    expect(unfollowUser).toHaveBeenCalledWith(2);
    expect(followUser).not.toHaveBeenCalled();
  });

  it("is disabled while the request is in flight and sends nothing more on another press", async () => {
    let resolve!: (value: unknown) => void;
    (followUser as Mock).mockReturnValue(new Promise((res) => (resolve = res)));
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "Suivre Bob" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Suivre Bob" })).toBeDisabled());
    await user.click(screen.getByRole("button", { name: "Suivre Bob" }));

    expect(followUser).toHaveBeenCalledTimes(1);
    resolve({ id: 2 });
    await waitFor(() => expect(screen.getByRole("button", { name: "Suivre Bob" })).toBeEnabled());
  });
});
