import { toast } from "@heroui/react";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import { CollectionNameSheet } from "@/components/widgets/collectionNameSheet/collectionNameSheet";
import { useCreateCollectionMutation } from "@/pages/profile/hooks/useCreateCollectionMutation";
import { CollectionKindEnum } from "@/types/enums/collection/collectionKindEnum";
import { CollectionNameSheetModeEnum } from "@/types/enums/collection/collectionNameSheetModeEnum";
import type { CollectionSummary } from "@/types/models/collection/collectionSummary";
import { API_V1 } from "@/utils/apiURL/apiURL";
import { collectionKeys } from "@/utils/queryKeys/collectionQueryKeys";

const mockFetch = vi.fn();

const answerWith = (status: number) =>
  mockFetch.mockImplementation(async (_url: string, init?: RequestInit) => {
    const sent = JSON.parse((init?.body as string | undefined) ?? "{}") as { name?: string };
    return status === 201
      ? new Response(JSON.stringify({ id: 8, kind: "custom", name: sent.name ?? "", beerCount: 0 }), { status })
      : new Response(JSON.stringify({ message: "Down" }), { status });
  });

const postCalls = () => mockFetch.mock.calls.filter(([, init]) => (init as RequestInit).method === "POST");

const SheetWithCreation = ({ customCollectionCount }: Readonly<{ customCollectionCount: number }>) => {
  const { createCollection, isPending } = useCreateCollectionMutation();
  return <CollectionNameSheet customCollectionCount={customCollectionCount} isPending={isPending} onSave={createCollection} />;
};

const renderSheet = (customCollectionCount = 3, queryClient = createTestQueryClient()) =>
  renderWithProviders(<SheetWithCreation customCollectionCount={customCollectionCount} />, { queryClient });

const openSheet = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Nouvelle collection" }));
  return screen.findByRole("dialog");
};

const nameField = () => screen.getByRole("textbox", { name: /Nom de la collection/ });

const submit = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await user.clear(nameField());
  if (name !== "") await user.type(nameField(), name);
  await user.click(screen.getByRole("button", { name: "Créer" }));
};

describe("CollectionNameSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    vi.spyOn(toast, "success").mockImplementation(() => "toast-id");
    vi.spyOn(toast, "danger").mockImplementation(() => "toast-id");
    answerWith(201);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("is the large tertiary button « Nouvelle collection » and opens no sheet by itself", () => {
    renderSheet();

    const trigger = screen.getByRole("button", { name: "Nouvelle collection" });
    expect(trigger.className).toContain("button--tertiary");
    expect(trigger.className).toContain("button--lg");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens a sheet with its title, an empty name field, the length hint and the create button", async () => {
    const user = userEvent.setup();
    renderSheet();

    const dialog = await openSheet(user);

    expect(within(dialog).getByRole("heading", { name: "Nouvelle collection" })).toBeInTheDocument();
    expect(nameField()).toHaveValue("");
    expect(within(dialog).getByText("1 à 40 caractères")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Créer" })).toBeInTheDocument();
  });

  it("sends the trimmed name, closes the sheet and refreshes the collection lists", async () => {
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(collectionKeys.list(1), []);
    renderSheet(3, queryClient);
    await openSheet(user);

    await submit(user, "  Trappistes  ");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(postCalls()).toHaveLength(1);
    const [url, init] = postCalls()[0] as [string, RequestInit];
    expect(url).toBe(`${API_V1()}/me/collections`);
    expect(JSON.parse(init.body as string)).toEqual({ name: "Trappistes" });
    expect(queryClient.getQueryState(collectionKeys.list(1))?.isInvalidated).toBe(true);
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("sends a single request when the create button is pressed twice in a row", async () => {
    const user = userEvent.setup();
    renderSheet();
    await openSheet(user);
    await user.type(nameField(), "Trappistes");

    await user.dblClick(screen.getByRole("button", { name: "Créer" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(postCalls()).toHaveLength(1);
  });

  it("starts from an empty field every time the sheet is opened again", async () => {
    const user = userEvent.setup();
    renderSheet();
    await openSheet(user);
    await user.type(nameField(), "Brouillon");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await openSheet(user);

    expect(nameField()).toHaveValue("");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("tells that the name is already taken once and keeps the sheet open with the typed name", async () => {
    answerWith(409);
    const user = userEvent.setup();
    renderSheet();
    await openSheet(user);

    await submit(user, "Trappistes");

    await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
    expect(toast.danger).toHaveBeenCalledWith("Ce nom est déjà pris");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(nameField()).toHaveValue("Trappistes");
    expect(postCalls()).toHaveLength(1);
  });

  it("keeps the sheet open on any other failure and lets the user try again", async () => {
    answerWith(500);
    const user = userEvent.setup();
    renderSheet();
    await openSheet(user);
    await submit(user, "Trappistes");
    await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));

    answerWith(201);
    await user.click(screen.getByRole("button", { name: "Créer" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(postCalls()).toHaveLength(2);
  });

  it("refuses the 21st collection with the dedicated message, sends nothing and keeps the sheet open", async () => {
    const user = userEvent.setup();
    renderSheet(20);
    await openSheet(user);

    await submit(user, "Abbayes");

    expect(await screen.findByText("20 collections au plus")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(postCalls()).toHaveLength(0);
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("still creates the 20th collection when 19 exist", async () => {
    const user = userEvent.setup();
    renderSheet(19);
    await openSheet(user);

    await submit(user, "Abbayes");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(postCalls()).toHaveLength(1);
    expect(screen.queryByText("20 collections au plus")).not.toBeInTheDocument();
  });

  it.each([
    ["an empty name", ""],
    ["a name of spaces only", "     "],
    ["a name of 41 characters", "a".repeat(41)],
    ["a name of 41 characters between spaces", `  ${"a".repeat(41)}  `],
  ])("refuses %s with the length message and sends nothing", async (_label, name) => {
    const user = userEvent.setup();
    renderSheet();
    await openSheet(user);

    await submit(user, name);

    expect(await screen.findByText("Entre 1 et 40 caractères")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(postCalls()).toHaveLength(0);
  });

  it("accepts a name of exactly 40 characters between spaces and sends it trimmed", async () => {
    const user = userEvent.setup();
    renderSheet();
    await openSheet(user);
    const forty = "a".repeat(40);

    await submit(user, `  ${forty}  `);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(JSON.parse((postCalls()[0][1] as RequestInit).body as string)).toEqual({ name: forty });
  });

  it("saves through the given onSave and stays open with the typed name when it resolves to nothing", async () => {
    const onSave = vi.fn<(name: string) => Promise<CollectionSummary | null>>().mockResolvedValue(null);
    const user = userEvent.setup();
    renderWithProviders(<CollectionNameSheet customCollectionCount={3} isPending={false} onSave={onSave} />);
    await openSheet(user);

    await submit(user, "Trappistes");

    await waitFor(() => expect(onSave).toHaveBeenCalledWith("Trappistes"));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(nameField()).toHaveValue("Trappistes");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  describe("in rename mode", () => {
    const SAVED: CollectionSummary = { id: 5, kind: CollectionKindEnum.CUSTOM, name: "Abbayes", beerCount: 2 };

    const renderRenameSheet = (onSave: (name: string) => Promise<CollectionSummary | null>, customCollectionCount = 3) =>
      renderWithProviders(
        <CollectionNameSheet
          mode={CollectionNameSheetModeEnum.RENAME}
          initialName="Trappistes"
          customCollectionCount={customCollectionCount}
          isPending={false}
          onSave={onSave}
        />,
      );

    const openRenameSheet = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole("button", { name: "Renommer" }));
      return screen.findByRole("dialog");
    };

    const renameField = () => screen.getByRole("textbox", { name: "Nouveau nom" });

    const typeName = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
      await user.clear(renameField());
      await user.type(renameField(), name);
      await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    };

    it("is the large tertiary button « Renommer » and opens no sheet by itself", () => {
      renderRenameSheet(vi.fn().mockResolvedValue(SAVED));

      const trigger = screen.getByRole("button", { name: "Renommer" });
      expect(trigger.className).toContain("button--tertiary");
      expect(trigger.className).toContain("button--lg");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("opens a sheet titled for the rename with the current name, the length hint and the save and cancel buttons", async () => {
      const user = userEvent.setup();
      renderRenameSheet(vi.fn().mockResolvedValue(SAVED));

      const dialog = await openRenameSheet(user);

      expect(within(dialog).getByRole("heading", { name: "Renommer la collection" })).toBeInTheDocument();
      expect(renameField()).toHaveValue("Trappistes");
      expect(within(dialog).getByText("1 à 40 caractères")).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "Enregistrer" })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "Annuler" })).toBeInTheDocument();
    });

    it("saves the typed name and closes the sheet", async () => {
      const onSave = vi.fn<(name: string) => Promise<CollectionSummary | null>>().mockResolvedValue(SAVED);
      const user = userEvent.setup();
      renderRenameSheet(onSave);
      await openRenameSheet(user);

      await typeName(user, "Abbayes");

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith("Abbayes");
    });

    it("does not apply the limit of 20 collections", async () => {
      const onSave = vi.fn<(name: string) => Promise<CollectionSummary | null>>().mockResolvedValue(SAVED);
      const user = userEvent.setup();
      renderRenameSheet(onSave, 20);
      await openRenameSheet(user);

      await typeName(user, "Abbayes");

      await waitFor(() => expect(onSave).toHaveBeenCalledWith("Abbayes"));
      expect(screen.queryByText("20 collections au plus")).not.toBeInTheDocument();
    });

    it("closes the sheet without saving when Annuler is pressed", async () => {
      const onSave = vi.fn<(name: string) => Promise<CollectionSummary | null>>().mockResolvedValue(SAVED);
      const user = userEvent.setup();
      renderRenameSheet(onSave);
      await openRenameSheet(user);

      await user.click(screen.getByRole("button", { name: "Annuler" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(onSave).not.toHaveBeenCalled();
    });

    it("starts again from the current name every time the sheet is opened", async () => {
      const user = userEvent.setup();
      renderRenameSheet(vi.fn().mockResolvedValue(SAVED));
      await openRenameSheet(user);
      await user.clear(renameField());
      await user.type(renameField(), "Brouillon");

      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      await openRenameSheet(user);

      expect(renameField()).toHaveValue("Trappistes");
    });

    it.each([
      ["an empty name", ""],
      ["a name of spaces only", "   "],
      ["a name of 41 characters", "a".repeat(41)],
    ])("refuses %s with the length message and saves nothing", async (_label, name) => {
      const onSave = vi.fn<(name: string) => Promise<CollectionSummary | null>>().mockResolvedValue(SAVED);
      const user = userEvent.setup();
      renderRenameSheet(onSave);
      await openRenameSheet(user);
      await user.clear(renameField());
      if (name !== "") await user.type(renameField(), name);
      await user.click(screen.getByRole("button", { name: "Enregistrer" }));

      expect(await screen.findByText("Entre 1 et 40 caractères")).toBeInTheDocument();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });
  });
});
