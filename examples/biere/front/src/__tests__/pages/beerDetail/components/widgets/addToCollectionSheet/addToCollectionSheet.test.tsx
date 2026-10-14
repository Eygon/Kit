import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router";
import type { Mock } from "vitest";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { AddToCollectionSheet } from "@/pages/beerDetail/components/widgets/addToCollectionSheet/addToCollectionSheet";
import type { MyCollection } from "@/types/mappers/collection/myCollectionMapper";
import {
  addCollectionBeer,
  fetchMyCollections,
  removeCollectionBeer,
} from "@/utils/queryFunctions/collectionQueryFunctions";
import {
  addToWishlist,
  removeFromWishlist,
} from "@/utils/queryFunctions/wishlistQueryFunctions";

vi.mock("@/utils/queryFunctions/collectionQueryFunctions", () => ({
  fetchMyCollections: vi.fn(),
  addCollectionBeer: vi.fn(),
  removeCollectionBeer: vi.fn(),
}));

vi.mock("@/utils/queryFunctions/wishlistQueryFunctions", () => ({
  addToWishlist: vi.fn(),
  removeFromWishlist: vi.fn(),
}));

const WISHLIST = {
  id: null,
  kind: "wishlist",
  name: "",
  beerCount: 1,
  containsBeer: true,
} as MyCollection;
const TRAPPISTES = {
  id: 5,
  kind: "custom",
  name: "Trappistes",
  beerCount: 0,
  containsBeer: false,
} as MyCollection;
const LONG_NAME =
  "Brasserie-Artisanale-du-Mont-Blanc-Collection-Sans-Espace-Du-Tout-Pour-Tester";

let server: MyCollection[] = [];

const setServer = (collections: MyCollection[]) => {
  server = collections.map((collection) => ({ ...collection }));
};

const setMembership = (collectionId: number | null, containsBeer: boolean) => {
  server = server.map((collection) =>
    collection.id === collectionId
      ? { ...collection, containsBeer }
      : collection,
  );
};

const PathnameProbe = () => (
  <output aria-label="pathname">{useLocation().pathname}</output>
);

const renderSheet = () =>
  renderWithProviders(
    <Routes>
      <Route
        path="/biere/:beerId"
        element={<AddToCollectionSheet beerId={1} />}
      />
      <Route path="*" element={<PathnameProbe />} />
    </Routes>,
    { initialPath: "/biere/1" },
  );

const openSheet = async () => {
  const user = userEvent.setup();
  renderSheet();
  await user.click(
    screen.getByRole("button", { name: "Ajouter à une collection" }),
  );
  return user;
};

describe("AddToCollectionSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setServer([WISHLIST, TRAPPISTES]);
    (fetchMyCollections as Mock).mockImplementation(async () =>
      server.map((collection) => ({ ...collection })),
    );
    (addCollectionBeer as Mock).mockImplementation(
      async (collectionId: number) => {
        setMembership(collectionId, true);
        return { id: collectionId };
      },
    );
    (removeCollectionBeer as Mock).mockImplementation(
      async (collectionId: number) => {
        setMembership(collectionId, false);
      },
    );
    (addToWishlist as Mock).mockImplementation(async () => {
      setMembership(null, true);
      return { beerId: 1 };
    });
    (removeFromWishlist as Mock).mockImplementation(async () => {
      setMembership(null, false);
    });
  });

  it("reads nothing until the sheet is opened, then titles it and lists the collections", async () => {
    const user = userEvent.setup();
    renderSheet();

    expect(fetchMyCollections).not.toHaveBeenCalled();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Ajouter à une collection" }),
    );

    expect(
      await screen.findByRole("dialog", { name: "Ajouter à une collection" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("checkbox", { name: "À goûter" }),
    ).toBeInTheDocument();
    expect(fetchMyCollections).toHaveBeenCalledTimes(1);
    expect(fetchMyCollections).toHaveBeenCalledWith(1);
  });

  it("checks the collections that hold the beer and leaves the others unchecked", async () => {
    await openSheet();

    expect(
      await screen.findByRole("checkbox", { name: "À goûter" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Trappistes" }),
    ).not.toBeChecked();
  });

  it("lists À goûter first, then the collections in the order received", async () => {
    setServer([WISHLIST, TRAPPISTES, { ...TRAPPISTES, id: 6, name: "IPA" }]);
    await openSheet();

    await screen.findByRole("checkbox", { name: "À goûter" });

    expect(screen.getAllByRole("checkbox").map((box) => box.closest("li")?.textContent)).toEqual(["À goûter", "Trappistes", "IPA"]);
  });

  it("adds the beer to a custom collection when it is checked", async () => {
    const user = await openSheet();

    await user.click(
      await screen.findByRole("checkbox", { name: "Trappistes" }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("checkbox", { name: "Trappistes" }),
      ).toBeChecked(),
    );
    expect(addCollectionBeer).toHaveBeenCalledTimes(1);
    expect(addCollectionBeer).toHaveBeenCalledWith(5, 1);
    expect(removeFromWishlist).not.toHaveBeenCalled();
    expect(screen.getByRole("checkbox", { name: "À goûter" })).toBeChecked();
  });

  it("removes the beer from the wishlist when À goûter is unchecked", async () => {
    const user = await openSheet();

    await user.click(await screen.findByRole("checkbox", { name: "À goûter" }));

    await waitFor(() =>
      expect(
        screen.getByRole("checkbox", { name: "À goûter" }),
      ).not.toBeChecked(),
    );
    expect(removeFromWishlist).toHaveBeenCalledTimes(1);
    expect(removeFromWishlist).toHaveBeenCalledWith(1);
    expect(removeCollectionBeer).not.toHaveBeenCalled();
    expect(
      screen.getByRole("checkbox", { name: "Trappistes" }),
    ).not.toBeChecked();
  });

  it("removes the beer from a custom collection that holds it when it is unchecked", async () => {
    setServer([WISHLIST, { ...TRAPPISTES, containsBeer: true }]);
    const user = await openSheet();

    await user.click(
      await screen.findByRole("checkbox", { name: "Trappistes" }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("checkbox", { name: "Trappistes" }),
      ).not.toBeChecked(),
    );
    expect(removeCollectionBeer).toHaveBeenCalledWith(5, 1);
  });

  it("adds the beer to the wishlist when it was not in it", async () => {
    setServer([{ ...WISHLIST, containsBeer: false }, TRAPPISTES]);
    const user = await openSheet();

    await user.click(await screen.findByRole("checkbox", { name: "À goûter" }));

    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: "À goûter" })).toBeChecked(),
    );
    expect(addToWishlist).toHaveBeenCalledWith(1);
  });

  it("offers only À goûter and a link to the profile when there is no custom collection", async () => {
    setServer([{ ...WISHLIST, containsBeer: false }]);
    const user = await openSheet();

    expect(
      await screen.findByRole("checkbox", { name: "À goûter" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
    const link = screen.getByRole("link", { name: "Créer une collection" });
    expect(link).toHaveAttribute("href", "/profil");

    await user.click(link);

    expect(await screen.findByLabelText("pathname")).toHaveTextContent(
      "/profil",
    );
  });

  it("keeps the link to the profile when custom collections exist", async () => {
    await openSheet();

    expect(
      await screen.findByRole("link", { name: "Créer une collection" }),
    ).toHaveAttribute("href", "/profil");
  });

  it("sends one request when a row is double clicked while the request is in flight", async () => {
    (addCollectionBeer as Mock).mockReturnValue(new Promise(() => {}));
    const user = await openSheet();
    const checkbox = await screen.findByRole("checkbox", {
      name: "Trappistes",
    });

    await user.dblClick(checkbox);

    await waitFor(() => expect(checkbox).toBeDisabled());
    expect(addCollectionBeer).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("checkbox", { name: "À goûter" })).toBeEnabled();
  });

  it("shows a loading state while the collections are read", async () => {
    (fetchMyCollections as Mock).mockReturnValue(new Promise(() => {}));
    await openSheet();

    expect(
      await screen.findByTestId("add-to-collection-skeleton"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("shows an alert with a retry button when the collections cannot be read, with one toast at most", async () => {
    (fetchMyCollections as Mock).mockRejectedValueOnce(new Error("down"));
    const user = await openSheet();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Collections indisponibles.",
    );
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(
      await screen.findByRole("checkbox", { name: "À goûter" }),
    ).toBeInTheDocument();
    expect(fetchMyCollections).toHaveBeenCalledTimes(2);
  });

  it("keeps a long collection name inside a wrapping, shrinkable row", async () => {
    setServer([WISHLIST, { ...TRAPPISTES, name: LONG_NAME }]);
    await openSheet();

    const label = await screen.findByText(LONG_NAME);

    expect(label.closest("label")?.className).toContain("min-w-0");
    expect(label.className).toContain("break-words");
  });

  it("lays each collection out as a horizontal row, checkbox on the left and name left-aligned", async () => {
    await openSheet();

    const checkbox = await screen.findByRole("checkbox", {
      name: "Trappistes",
    });
    const row = checkbox.closest("label") as HTMLElement;
    const name = screen.getByText("Trappistes");

    expect(row.className).toContain("flex-row");
    expect(row.className).toContain("items-center");
    expect(row.className).toContain("min-h-11");
    expect(row.className).toContain("w-full");
    const square = row.querySelector(".checkbox__control") as HTMLElement;
    expect(
      square.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(name.className).toContain("text-left");
    expect(row.className).toContain("min-w-0");
  });

  it("toggles the membership when the name of the row is pressed", async () => {
    const user = await openSheet();

    await user.click(await screen.findByText("Trappistes"));

    await waitFor(() => expect(addCollectionBeer).toHaveBeenCalledWith(5, 1));
  });

  it("toggles the membership when the checkbox square of the row is pressed", async () => {
    const user = await openSheet();

    const square = (await screen.findByRole("checkbox", { name: "Trappistes" }))
      .closest("label")
      ?.querySelector(".checkbox__control") as HTMLElement;
    await user.click(square);

    await waitFor(() => expect(addCollectionBeer).toHaveBeenCalledWith(5, 1));
  });
});
