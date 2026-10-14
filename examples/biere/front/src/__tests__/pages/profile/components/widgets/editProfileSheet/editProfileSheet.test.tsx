import { toast } from "@heroui/react";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { EditProfileSheet } from "@/pages/profile/components/widgets/editProfileSheet/editProfileSheet";
import { AvatarEnum } from "@/types/enums/user/avatarEnum";
import { LevelTitleEnum } from "@/types/enums/user/levelTitleEnum";
import type { Profile } from "@/types/models/profile/profile";
import { ME_PROFILE } from "@/utils/apiURL/apiURL";

const ALICE: Profile = {
  id: 1,
  displayName: "Alice",
  avatar: AvatarEnum.HOP,
  level: 2,
  title: LevelTitleEnum.TASTER,
  discoveredCount: 12,
  currentThreshold: 5,
  nextThreshold: 15,
  nextTitle: LevelTitleEnum.HOP_HEAD,
  followerCount: 0,
  followingCount: 2,
  isFollowed: false,
  isMe: true,
};

const SAVED_DTO = { ...ALICE, displayName: "Alice B", avatar: "foam" };

const mockFetch = vi.fn();

const answerWith = (status: number) =>
  mockFetch.mockImplementation(async () =>
    status === 200
      ? new Response(JSON.stringify(SAVED_DTO), { status })
      : new Response(JSON.stringify({ message: "Down" }), { status }),
  );

const putCalls = () => mockFetch.mock.calls.filter(([, init]) => (init as RequestInit).method === "PUT");

const renderSheet = () => renderWithProviders(<EditProfileSheet profile={ALICE} />);

const openSheet = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Modifier" }));
  return screen.findByRole("dialog");
};

const nameField = () => screen.getByRole("textbox", { name: /Nom d'affichage/ });

const typeName = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await user.clear(nameField());
  if (name !== "") await user.type(nameField(), name);
};

describe("EditProfileSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, writable: true, value: vi.fn() });
    vi.stubGlobal("fetch", mockFetch);
    vi.spyOn(toast, "success").mockImplementation(() => "toast-id");
    vi.spyOn(toast, "danger").mockImplementation(() => "toast-id");
    answerWith(200);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("trigger", () => {
    it("is the large tertiary button « Modifier » and opens no sheet by itself", async () => {
      renderSheet();

      const trigger = screen.getByRole("button", { name: "Modifier" });
      expect(trigger.className).toContain("button--tertiary");
      expect(trigger.className).toContain("button--lg");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("opens a bottom sheet titled « Modifier mon profil » with the current name, hint and avatar", async () => {
      const user = userEvent.setup();
      renderSheet();

      const dialog = await openSheet(user);

      expect(within(dialog).getByRole("heading", { name: "Modifier mon profil" })).toBeInTheDocument();
      expect(nameField()).toHaveValue("Alice");
      expect(within(dialog).getByText("2 à 24 caractères")).toBeInTheDocument();
      expect(within(dialog).getByRole("radiogroup", { name: "Choisir un avatar" })).toBeInTheDocument();
      expect(within(dialog).getByRole("radio", { name: "Houblon" })).toBeChecked();
      expect(within(dialog).getByRole("button", { name: "Enregistrer" })).toBeInTheDocument();
      expect(dialog.closest(".drawer__content")).toHaveClass("drawer__content--bottom");
    });

    it("forgets what was typed when the sheet is closed without saving", async () => {
      const user = userEvent.setup();
      renderSheet();
      await openSheet(user);
      await typeName(user, "Zoé");
      await user.click(screen.getByRole("radio", { name: "Mousse" }));

      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      await openSheet(user);

      expect(nameField()).toHaveValue("Alice");
      expect(screen.getByRole("radio", { name: "Houblon" })).toBeChecked();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("saving", () => {
    it("sends the new name and avatar, thanks with a toast and closes the sheet", async () => {
      const user = userEvent.setup();
      renderSheet();
      await openSheet(user);

      await typeName(user, "Alice B");
      await user.click(screen.getByRole("radio", { name: "Mousse" }));
      await user.click(screen.getByRole("button", { name: "Enregistrer" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(putCalls()).toHaveLength(1);
      const [url, init] = putCalls()[0] as [string, RequestInit];
      expect(url).toBe(ME_PROFILE());
      expect(JSON.parse(init.body as string)).toEqual({ displayName: "Alice B", avatar: "foam" });
      expect(toast.success).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith("Profil enregistré");
    });

    it("sends the trimmed name when the spaces make it longer than the limit", async () => {
      const user = userEvent.setup();
      renderSheet();
      await openSheet(user);

      await typeName(user, `  ${"a".repeat(24)}  `);
      await user.click(screen.getByRole("button", { name: "Enregistrer" }));

      await waitFor(() => expect(putCalls()).toHaveLength(1));
      expect(JSON.parse((putCalls()[0] as [string, RequestInit])[1].body as string)).toEqual({
        displayName: "a".repeat(24),
        avatar: "hop",
      });
    });
  });

  describe("invalid name", () => {
    it.each([
      ["a single character", "A"],
      ["a single character among spaces", "   A   "],
      ["only spaces", "      "],
      ["25 characters", "a".repeat(25)],
      ["25 characters among spaces", `  ${"a".repeat(25)}  `],
    ])("shows the error under the field and sends nothing for %s", async (_label, name) => {
      const user = userEvent.setup();
      renderSheet();
      const dialog = await openSheet(user);

      await typeName(user, name);
      await user.click(within(dialog).getByRole("button", { name: "Enregistrer" }));

      expect(await within(dialog).findByText("Entre 2 et 24 caractères")).toBeInTheDocument();
      expect(nameField()).toBeInvalid();
      expect(mockFetch).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("AC1 moves the focus to the name field when the name is empty and Enregistrer is pressed", async () => {
      const user = userEvent.setup();
      renderSheet();
      const dialog = await openSheet(user);
      await typeName(user, "");
      const save = within(dialog).getByRole("button", { name: "Enregistrer" });
      await user.click(within(dialog).getByRole("radio", { name: "Mousse" }));

      await user.click(save);

      await waitFor(() => expect(nameField()).toHaveFocus());
      expect(vi.mocked(Element.prototype.scrollIntoView).mock.contexts.at(-1)).toBe(nameField());
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("does not move the focus when the name is valid", async () => {
      const user = userEvent.setup();
      renderSheet();
      const dialog = await openSheet(user);
      await typeName(user, "Alice B");
      await user.click(within(dialog).getByRole("button", { name: "Enregistrer" }));

      await waitFor(() => expect(putCalls()).toHaveLength(1));
      expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    });

    it("sends the request once the name is fixed", async () => {
      const user = userEvent.setup();
      renderSheet();
      const dialog = await openSheet(user);
      await typeName(user, "A");
      await user.click(within(dialog).getByRole("button", { name: "Enregistrer" }));
      await within(dialog).findByText("Entre 2 et 24 caractères");

      await typeName(user, "Al");
      await user.click(within(dialog).getByRole("button", { name: "Enregistrer" }));

      await waitFor(() => expect(putCalls()).toHaveLength(1));
      expect(within(dialog).queryByText("Entre 2 et 24 caractères")).not.toBeInTheDocument();
    });
  });

  describe("server failure", () => {
    it("toasts the error once, keeps the sheet open with its values and no success", async () => {
      const user = userEvent.setup();
      answerWith(500);
      renderSheet();
      const dialog = await openSheet(user);

      await typeName(user, "Alice B");
      await user.click(screen.getByRole("radio", { name: "Mousse" }));
      await user.click(within(dialog).getByRole("button", { name: "Enregistrer" }));

      await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
      expect(toast.danger).toHaveBeenCalledWith(expect.stringMatching(/\S/));
      expect(toast.success).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(nameField()).toHaveValue("Alice B");
      expect(screen.getByRole("radio", { name: "Mousse" })).toBeChecked();
      await waitFor(() => expect(within(dialog).getByRole("button", { name: "Enregistrer" })).toBeEnabled());
    });

    it("lets the user try again after a failure", async () => {
      const user = userEvent.setup();
      answerWith(500);
      renderSheet();
      const dialog = await openSheet(user);
      await typeName(user, "Alice B");
      await user.click(within(dialog).getByRole("button", { name: "Enregistrer" }));
      await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
      answerWith(200);

      await user.click(within(dialog).getByRole("button", { name: "Enregistrer" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(putCalls()).toHaveLength(2);
      expect(toast.success).toHaveBeenCalledTimes(1);
    });
  });

  describe("double press", () => {
    it("puts the save button in its pending state while the request is in flight", async () => {
      const user = userEvent.setup();
      let release: () => void = () => undefined;
      mockFetch.mockImplementation(
        () =>
          new Promise<Response>((resolve) => {
            release = () => resolve(new Response(JSON.stringify(SAVED_DTO), { status: 200 }));
          }),
      );
      renderSheet();
      const dialog = await openSheet(user);
      await typeName(user, "Alice B");
      expect(within(dialog).getByRole("button", { name: "Enregistrer" })).not.toHaveAttribute("data-pending");

      await user.click(within(dialog).getByRole("button", { name: "Enregistrer" }));

      await waitFor(() => expect(within(dialog).getByRole("button", { name: /Enregistrement…/ })).toHaveAttribute("data-pending", "true"));
      const pendingButton = within(dialog).getByRole("button", { name: /Enregistrement…/ });
      expect(pendingButton).toHaveAttribute("aria-busy", "true");
      expect(pendingButton).toHaveTextContent("Enregistrement…");
      expect(pendingButton.className).toContain("button--full-width");
      release();
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("sends a single request when the save button is pressed twice quickly", async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(
        () =>
          new Promise<Response>((resolve) => {
            setTimeout(() => resolve(new Response(JSON.stringify(SAVED_DTO), { status: 200 })), 50);
          }),
      );
      renderSheet();
      const dialog = await openSheet(user);
      await typeName(user, "Alice B");

      await user.dblClick(within(dialog).getByRole("button", { name: "Enregistrer" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(putCalls()).toHaveLength(1);
      expect(toast.success).toHaveBeenCalledTimes(1);
    });
  });
});
