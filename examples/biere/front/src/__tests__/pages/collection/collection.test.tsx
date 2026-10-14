import { toast } from "@heroui/react";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import type { Mock } from "vitest";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import CollectionService from "@/api/collections/collectionService";
import WishlistService from "@/api/wishlist/wishlistService";
import { CollectionPage } from "@/pages/collection/collection";
import { CollectionKindEnum } from "@/types/enums/collection/collectionKindEnum";
import type { CollectionDetail } from "@/types/models/collection/collectionDetail";

vi.mock("@/api/collections/collectionService", () => ({
  default: {
    getDetail: vi.fn(),
    getWishlistOf: vi.fn(),
    rename: vi.fn(),
    remove: vi.fn(),
    removeBeer: vi.fn(),
  },
}));

vi.mock("@/api/wishlist/wishlistService", () => ({
  default: { remove: vi.fn() },
}));

const ORVAL = {
  beerId: 12,
  beerName: "Orval",
  styleName: "Trappiste",
  family: null,
  drunkByMe: true,
  addedAt: new Date("2026-10-12T10:00:00.000Z"),
};
const DUVEL = {
  ...ORVAL,
  beerId: 13,
  beerName: "Duvel",
  styleName: "Blonde forte",
  drunkByMe: false,
};

const buildDetail = (
  overrides: Partial<CollectionDetail> = {},
): CollectionDetail => ({
  id: 5,
  kind: CollectionKindEnum.CUSTOM,
  name: "Trappistes",
  ownerId: 2,
  beers: [ORVAL, DUVEL],
  ...overrides,
});

const renderCollectionPage = (path: string) =>
  renderWithProviders(
    <Routes>
      <Route
        path="/profils/:userId/collections/:collectionId"
        element={<CollectionPage />}
      />
      <Route path="/profils/:userId/wishlist" element={<CollectionPage />} />
      <Route path="/profils/:userId" element={<p>Profil de Bob</p>} />
      <Route path="/profil" element={<p>Mon profil</p>} />
    </Routes>,
    { initialPath: path },
  );

describe("CollectionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(toast, "success").mockImplementation(() => "toast-id");
    (CollectionService.getDetail as Mock).mockResolvedValue(buildDetail());
    (CollectionService.getWishlistOf as Mock).mockResolvedValue(
      buildDetail({
        id: null,
        kind: CollectionKindEnum.WISHLIST,
        name: "",
        beers: [DUVEL],
      }),
    );
  });

  it("stamps Orval as already tasted and Duvel as not yet", async () => {
    renderCollectionPage("/profils/2/collections/5");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Trappistes" }),
    ).toBeInTheDocument();
    expect(CollectionService.getDetail).toHaveBeenCalledWith(2, 5);
    const orval = screen
      .getByRole("link", { name: "Orval" })
      .closest("li") as HTMLElement;
    const duvel = screen
      .getByRole("link", { name: "Duvel" })
      .closest("li") as HTMLElement;
    expect(orval).toHaveTextContent("Déjà bue");
    expect(orval).not.toHaveTextContent("Pas encore");
    expect(duvel).toHaveTextContent("Pas encore");
    expect(duvel).not.toHaveTextContent("Déjà bue");
  });

  it("lists the beers in the order received", async () => {
    renderCollectionPage("/profils/2/collections/5");

    await screen.findByRole("link", { name: "Orval" });
    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual([
      expect.stringContaining("Orval"),
      expect.stringContaining("Duvel"),
    ]);
  });

  it("reads the wishlist of the user and titles it À goûter", async () => {
    renderCollectionPage("/profils/2/wishlist");

    expect(
      await screen.findByRole("heading", { level: 1, name: "À goûter" }),
    ).toBeInTheDocument();
    expect(CollectionService.getWishlistOf).toHaveBeenCalledWith(2);
    expect(CollectionService.getDetail).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Duvel" })).toBeInTheDocument();
  });

  it("shows an empty state and a way back for an empty collection", async () => {
    (CollectionService.getDetail as Mock).mockResolvedValue(
      buildDetail({ beers: [] }),
    );
    renderCollectionPage("/profils/2/collections/5");

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Cette collection est vide",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Retour au profil" }),
    ).toHaveAttribute("href", "/profils/2");
  });

  it("shows the empty state and the way back for an empty wishlist À goûter", async () => {
    (CollectionService.getWishlistOf as Mock).mockResolvedValue(
      buildDetail({ id: null, kind: CollectionKindEnum.WISHLIST, name: "", beers: [] }),
    );
    renderCollectionPage("/profils/2/wishlist");

    expect(await screen.findByRole("heading", { level: 1, name: "À goûter" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Cette collection est vide" })).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour au profil" })).toHaveAttribute("href", "/profils/2");
  });

  it.each([
    ["unknown or forbidden", "/profils/2/collections/9"],
    ["unknown wishlist", "/profils/2/wishlist"],
  ])(
    "tells the collection is not found with a link back for an %s",
    async (_label, path) => {
      (CollectionService.getDetail as Mock).mockResolvedValue(null);
      (CollectionService.getWishlistOf as Mock).mockResolvedValue(null);
      renderCollectionPage(path);

      expect(
        await screen.findByRole("heading", { name: "Collection introuvable" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Retour au profil" }),
      ).toHaveAttribute("href", "/profils/2");
      expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    },
  );

  it("goes back to the profile of the owner from the link", async () => {
    const user = userEvent.setup();
    (CollectionService.getDetail as Mock).mockResolvedValue(null);
    renderCollectionPage("/profils/2/collections/9");

    await user.click(
      await screen.findByRole("link", { name: "Retour au profil" }),
    );

    expect(screen.getByText("Profil de Bob")).toBeInTheDocument();
  });

  it.each([
    "/profils/abc/collections/5",
    "/profils/2/collections/abc",
    "/profils/2/collections/0",
  ])(
    "tells the collection is not found without any read for %s",
    async (path) => {
      renderCollectionPage(path);

      expect(
        await screen.findByRole("heading", { name: "Collection introuvable" }),
      ).toBeInTheDocument();
      expect(CollectionService.getDetail).not.toHaveBeenCalled();
      expect(CollectionService.getWishlistOf).not.toHaveBeenCalled();
    },
  );

  it("shows a loading skeleton while the collection is read", async () => {
    (CollectionService.getDetail as Mock).mockReturnValue(
      new Promise(() => {}),
    );
    renderCollectionPage("/profils/2/collections/5");

    expect(await screen.findAllByTestId("collection-skeleton")).toHaveLength(3);
    expect(
      screen.queryByRole("heading", { name: "Collection introuvable" }),
    ).not.toBeInTheDocument();
  });

  it("shows an alert with a retry button when the read fails, then recovers", async () => {
    const user = userEvent.setup();
    (CollectionService.getDetail as Mock).mockRejectedValueOnce(
      new Error("boom"),
    );
    renderCollectionPage("/profils/2/collections/5");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Collection indisponible.",
    );
    expect(
      screen.queryByRole("heading", { name: "Collection introuvable" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(
      await screen.findByRole("link", { name: "Orval" }),
    ).toBeInTheDocument();
    expect(CollectionService.getDetail).toHaveBeenCalledTimes(2);
  });
});

describe("CollectionPage owner actions", () => {
  const OWNER_ID = 1;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(toast, "success").mockImplementation(() => "toast-id");
    (CollectionService.getDetail as Mock).mockResolvedValue(
      buildDetail({ ownerId: OWNER_ID }),
    );
    (CollectionService.getWishlistOf as Mock).mockResolvedValue(
      buildDetail({
        id: null,
        kind: CollectionKindEnum.WISHLIST,
        name: "",
        ownerId: OWNER_ID,
        beers: [DUVEL],
      }),
    );
  });

  it("offers Renommer and Supprimer on one of my collections", async () => {
    renderCollectionPage("/profils/1/collections/5");

    await screen.findByRole("heading", { level: 1, name: "Trappistes" });
    expect(
      screen.getByRole("button", { name: "Renommer" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Supprimer" }),
    ).toBeInTheDocument();
  });

  it("offers neither Renommer nor Supprimer on a collection of somebody else", async () => {
    (CollectionService.getDetail as Mock).mockResolvedValue(
      buildDetail({ ownerId: 2 }),
    );
    renderCollectionPage("/profils/2/collections/5");

    await screen.findByRole("heading", { level: 1, name: "Trappistes" });
    expect(
      screen.queryByRole("button", { name: "Renommer" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Supprimer" }),
    ).not.toBeInTheDocument();
  });

  it("offers neither Renommer nor Supprimer on my wishlist À goûter", async () => {
    renderCollectionPage("/profils/1/wishlist");

    await screen.findByRole("heading", { level: 1, name: "À goûter" });
    expect(
      screen.queryByRole("button", { name: "Renommer" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Supprimer" }),
    ).not.toBeInTheDocument();
  });

  const openRenameSheet = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(await screen.findByRole("button", { name: "Renommer" }));
    return screen.findByRole("dialog");
  };

  const renameField = () =>
    screen.getByRole("textbox", { name: "Nouveau nom" });

  const typeNewName = async (
    user: ReturnType<typeof userEvent.setup>,
    name: string,
  ) => {
    await user.clear(renameField());
    if (name !== "") await user.type(renameField(), name);
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
  };

  const mockRenameSuccess = (name: string) => {
    (CollectionService.rename as Mock).mockResolvedValue({
      id: 5,
      kind: CollectionKindEnum.CUSTOM,
      name,
      beerCount: 2,
    });
    (CollectionService.getDetail as Mock)
      .mockResolvedValueOnce(buildDetail({ ownerId: OWNER_ID }))
      .mockResolvedValue(buildDetail({ ownerId: OWNER_ID, name }));
  };

  it("opens the name sheet prefilled with the current name when Renommer is pressed", async () => {
    const user = userEvent.setup();
    renderCollectionPage("/profils/1/collections/5");

    const dialog = await openRenameSheet(user);

    expect(
      within(dialog).getByRole("heading", { name: "Renommer la collection" }),
    ).toBeInTheDocument();
    expect(renameField()).toHaveValue("Trappistes");
    expect(CollectionService.rename).not.toHaveBeenCalled();
  });

  it("renames the collection Abbayes and shows the new title", async () => {
    const user = userEvent.setup();
    mockRenameSuccess("Abbayes");
    renderCollectionPage("/profils/1/collections/5");

    await openRenameSheet(user);
    expect(renameField()).toHaveValue("Trappistes");
    await typeNewName(user, "Abbayes");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Abbayes" }),
    ).toBeInTheDocument();
    expect(CollectionService.rename).toHaveBeenCalledTimes(1);
    expect(CollectionService.rename).toHaveBeenCalledWith(5, "Abbayes");
    await vi.waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("textbox", { name: "Nouveau nom" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["a name of 40 characters", "a".repeat(40), "a".repeat(40)],
    ["a name of 1 character", "a", "a"],
    [
      "a name of 40 characters between spaces",
      `  ${"a".repeat(40)}  `,
      "a".repeat(40),
    ],
  ])("accepts %s and sends it to the rename", async (_label, typed, shown) => {
    const user = userEvent.setup();
    mockRenameSuccess(shown);
    renderCollectionPage("/profils/1/collections/5");

    await openRenameSheet(user);
    await typeNewName(user, typed);

    expect(
      await screen.findByRole("heading", { level: 1, name: shown }),
    ).toBeInTheDocument();
    expect(CollectionService.rename).toHaveBeenCalledTimes(1);
    expect(CollectionService.rename).toHaveBeenCalledWith(5, typed);
    await vi.waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("refuses an empty name without any request and keeps the sheet open", async () => {
    const user = userEvent.setup();
    renderCollectionPage("/profils/1/collections/5");

    await openRenameSheet(user);
    await typeNewName(user, "");

    expect(
      await screen.findByText("Entre 1 et 40 caractères"),
    ).toBeInTheDocument();
    expect(CollectionService.rename).not.toHaveBeenCalled();
    expect(
      screen.getByRole("textbox", { name: "Nouveau nom" }),
    ).toBeInTheDocument();
  });

  it("refuses a name of spaces only without any request and keeps the sheet open", async () => {
    const user = userEvent.setup();
    renderCollectionPage("/profils/1/collections/5");

    await openRenameSheet(user);
    await typeNewName(user, "   ");

    expect(
      await screen.findByText("Entre 1 et 40 caractères"),
    ).toBeInTheDocument();
    expect(CollectionService.rename).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("refuses a name of 41 characters after trimming without any request", async () => {
    const user = userEvent.setup();
    renderCollectionPage("/profils/1/collections/5");

    await openRenameSheet(user);
    await typeNewName(user, `  ${"a".repeat(41)}  `);

    expect(
      await screen.findByText("Entre 1 et 40 caractères"),
    ).toBeInTheDocument();
    expect(CollectionService.rename).not.toHaveBeenCalled();
  });

  it("keeps the old title and the sheet open with the typed name when the rename fails", async () => {
    const user = userEvent.setup();
    (CollectionService.rename as Mock).mockRejectedValue(new Error("boom"));
    renderCollectionPage("/profils/1/collections/5");

    await openRenameSheet(user);
    await typeNewName(user, "Abbayes");

    await vi.waitFor(() =>
      expect(CollectionService.rename).toHaveBeenCalledTimes(1),
    );
    await vi.waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Enregistrer" }),
      ).not.toHaveAttribute("data-pending"),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Trappistes",
        hidden: true,
      }),
    ).toBeInTheDocument();
    expect(renameField()).toHaveValue("Abbayes");
  });

  it("closes the sheet without any request when Annuler is pressed", async () => {
    const user = userEvent.setup();
    renderCollectionPage("/profils/1/collections/5");

    const dialog = await openRenameSheet(user);
    await user.click(within(dialog).getByRole("button", { name: "Annuler" }));

    await vi.waitFor(() =>
      expect(
        screen.queryByRole("textbox", { name: "Nouveau nom" }),
      ).not.toBeInTheDocument(),
    );
    expect(CollectionService.rename).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { level: 1, name: "Trappistes" }),
    ).toBeInTheDocument();
  });

  it("deletes the collection after confirmation, toasts the success and goes back to /profil", async () => {
    const user = userEvent.setup();
    (CollectionService.remove as Mock).mockResolvedValue(undefined);
    renderCollectionPage("/profils/1/collections/5");

    await user.click(await screen.findByRole("button", { name: "Supprimer" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));

    expect(await screen.findByText("Mon profil")).toBeInTheDocument();
    expect(CollectionService.remove).toHaveBeenCalledTimes(1);
    expect(CollectionService.remove).toHaveBeenCalledWith(5);
    expect(toast.success).toHaveBeenCalledWith("Collection supprimée");
  });

  it("stays on the collection and deletes nothing when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    renderCollectionPage("/profils/1/collections/5");

    await user.click(await screen.findByRole("button", { name: "Supprimer" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Annuler" }));

    expect(CollectionService.remove).not.toHaveBeenCalled();
    expect(screen.queryByText("Mon profil")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Trappistes" }),
    ).toBeInTheDocument();
  });

  it("stays on the collection when the deletion fails", async () => {
    const user = userEvent.setup();
    (CollectionService.remove as Mock).mockRejectedValue(new Error("boom"));
    renderCollectionPage("/profils/1/collections/5");

    await user.click(await screen.findByRole("button", { name: "Supprimer" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));

    await vi.waitFor(() =>
      expect(CollectionService.remove).toHaveBeenCalledTimes(1),
    );
    await vi.waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(screen.queryByText("Mon profil")).not.toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { level: 1, name: "Trappistes" }),
    ).toBeInTheDocument();
  });

  it("offers a Retirer button per beer on one of my collections", async () => {
    renderCollectionPage("/profils/1/collections/5");

    expect(
      await screen.findByRole("button", {
        name: "Retirer Orval de la collection",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retirer Duvel de la collection" }),
    ).toBeInTheDocument();
  });

  it("keeps one listitem per beer and puts each Retirer button inside its own row", async () => {
    renderCollectionPage("/profils/1/collections/5");

    await screen.findByRole("button", {
      name: "Retirer Orval de la collection",
    });

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContainElement(
      screen.getByRole("link", { name: "Orval" }),
    );
    expect(rows[0]).toContainElement(
      screen.getByRole("button", { name: "Retirer Orval de la collection" }),
    );
    expect(rows[1]).toContainElement(
      screen.getByRole("link", { name: "Duvel" }),
    );
    expect(rows[1]).toContainElement(
      screen.getByRole("button", { name: "Retirer Duvel de la collection" }),
    );
  });

  it("offers no Retirer button on a collection of somebody else", async () => {
    (CollectionService.getDetail as Mock).mockResolvedValue(
      buildDetail({ ownerId: 2 }),
    );
    renderCollectionPage("/profils/2/collections/5");

    await screen.findByRole("link", { name: "Orval" });
    expect(
      screen.queryByRole("button", { name: /Retirer/ }),
    ).not.toBeInTheDocument();
  });

  it("removes Duvel from my wishlist À goûter on Retirer and toasts the success", async () => {
    const user = userEvent.setup();
    (WishlistService.remove as Mock).mockResolvedValue(undefined);
    (CollectionService.getWishlistOf as Mock)
      .mockResolvedValueOnce(
        buildDetail({
          id: null,
          kind: CollectionKindEnum.WISHLIST,
          name: "",
          ownerId: OWNER_ID,
          beers: [DUVEL],
        }),
      )
      .mockResolvedValue(
        buildDetail({
          id: null,
          kind: CollectionKindEnum.WISHLIST,
          name: "",
          ownerId: OWNER_ID,
          beers: [],
        }),
      );
    renderCollectionPage("/profils/1/wishlist");

    await user.click(
      await screen.findByRole("button", {
        name: "Retirer Duvel de la collection",
      }),
    );

    await vi.waitFor(() =>
      expect(
        screen.queryByRole("link", { name: "Duvel" }),
      ).not.toBeInTheDocument(),
    );
    expect(WishlistService.remove).toHaveBeenCalledTimes(1);
    expect(WishlistService.remove).toHaveBeenCalledWith(13);
    expect(CollectionService.removeBeer).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith(
      "Bière retirée de la collection",
    );
  });

  it("offers no Retirer button on the wishlist of somebody else", async () => {
    (CollectionService.getWishlistOf as Mock).mockResolvedValue(
      buildDetail({
        id: null,
        kind: CollectionKindEnum.WISHLIST,
        name: "",
        ownerId: 2,
        beers: [DUVEL],
      }),
    );
    renderCollectionPage("/profils/2/wishlist");

    await screen.findByRole("link", { name: "Duvel" });
    expect(
      screen.queryByRole("button", { name: /Retirer/ }),
    ).not.toBeInTheDocument();
  });

  it("removes Orval on Retirer, drops it from the list and toasts the success", async () => {
    const user = userEvent.setup();
    (CollectionService.removeBeer as Mock).mockResolvedValue(undefined);
    (CollectionService.getDetail as Mock)
      .mockResolvedValueOnce(buildDetail({ ownerId: OWNER_ID }))
      .mockResolvedValue(buildDetail({ ownerId: OWNER_ID, beers: [DUVEL] }));
    renderCollectionPage("/profils/1/collections/5");

    await user.click(
      await screen.findByRole("button", {
        name: "Retirer Orval de la collection",
      }),
    );

    await vi.waitFor(() =>
      expect(
        screen.queryByRole("link", { name: "Orval" }),
      ).not.toBeInTheDocument(),
    );
    expect(CollectionService.removeBeer).toHaveBeenCalledTimes(1);
    expect(CollectionService.removeBeer).toHaveBeenCalledWith(5, 12);
    expect(screen.getByRole("link", { name: "Duvel" })).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith(
      "Bière retirée de la collection",
    );
  });

  it("keeps Orval in the list and shows no success when the removal fails", async () => {
    const user = userEvent.setup();
    (CollectionService.removeBeer as Mock).mockRejectedValue(new Error("boom"));
    renderCollectionPage("/profils/1/collections/5");

    await user.click(
      await screen.findByRole("button", {
        name: "Retirer Orval de la collection",
      }),
    );

    await vi.waitFor(() =>
      expect(CollectionService.removeBeer).toHaveBeenCalledTimes(1),
    );
    expect(screen.getByRole("link", { name: "Orval" })).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
    await vi.waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Retirer Orval de la collection" }),
      ).toBeEnabled(),
    );
  });

  it("sends one request when Retirer is double-clicked", async () => {
    const user = userEvent.setup();
    (CollectionService.removeBeer as Mock).mockReturnValue(
      new Promise(() => {}),
    );
    renderCollectionPage("/profils/1/collections/5");

    await user.dblClick(
      await screen.findByRole("button", {
        name: "Retirer Orval de la collection",
      }),
    );

    await vi.waitFor(() =>
      expect(CollectionService.removeBeer).toHaveBeenCalled(),
    );
    expect(CollectionService.removeBeer).toHaveBeenCalledTimes(1);
  });
});
