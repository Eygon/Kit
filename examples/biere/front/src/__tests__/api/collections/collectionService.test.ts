import { toast } from "@heroui/react";
import { HttpError } from "@/api/httpError";
import CollectionService from "@/api/collections/collectionService";
import type { CollectionBeerDto } from "@/types/dtos/collection/collectionBeerDto";
import type { CollectionDetailDto } from "@/types/dtos/collection/collectionDetailDto";
import type { CollectionSummaryDto } from "@/types/dtos/collection/collectionSummaryDto";
import type { MyCollectionDto } from "@/types/dtos/collection/myCollectionDto";
import {
  CollectionKindEnum,
  isCollectionKind,
} from "@/types/enums/collection/collectionKindEnum";
import { collectionBeerDtoToModel } from "@/types/mappers/collection/collectionBeerMapper";
import { collectionDetailDtoToModel } from "@/types/mappers/collection/collectionDetailMapper";
import { collectionSummaryDtoToModel } from "@/types/mappers/collection/collectionSummaryMapper";
import { myCollectionDtoToModel } from "@/types/mappers/collection/myCollectionMapper";
import { buildSaveCollectionDto } from "@/types/mappers/collection/saveCollectionMapper";
import {
  API_V1,
  ME_COLLECTION,
  ME_COLLECTION_BEER,
  ME_COLLECTION_BEERS,
  ME_COLLECTIONS,
  ME_COLLECTIONS_CONTAINING,
  USERS,
  USER_COLLECTION,
  USER_COLLECTIONS,
  USER_WISHLIST,
} from "@/utils/apiURL/apiURL";

vi.mock("@heroui/react", () => ({
  toast: { danger: vi.fn() },
}));

const mockFetch = vi.fn();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

const WISHLIST_DTO = { id: null, kind: "wishlist", name: "", beerCount: 2 };
const CUSTOM_DTO = { id: 5, kind: "custom", name: "Trappistes", beerCount: 1 };

describe("CollectionService.getForUser", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds the collections route of a user under the users route", () => {
    expect(USER_COLLECTIONS(7)).toBe(`${USERS()}/7/collections`);
    expect(USER_COLLECTIONS(7)).toBe(`${API_V1()}/users/7/collections`);
  });

  it("requests the collections of the user with a GET", async () => {
    mockFetch.mockImplementation(async () => json([WISHLIST_DTO]));

    await CollectionService.getForUser(2);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_V1()}/users/2/collections`);
    expect(init.method).toBe("GET");
  });

  it("returns the summaries as models in the order received", async () => {
    mockFetch.mockImplementation(async () => json([WISHLIST_DTO, CUSTOM_DTO]));

    const collections = await CollectionService.getForUser(1);

    expect(collections).toEqual([
      { id: null, kind: "wishlist", name: "", beerCount: 2 },
      { id: 5, kind: "custom", name: "Trappistes", beerCount: 1 },
    ]);
  });

  it("returns an empty list on a 204 without any toast", async () => {
    mockFetch.mockImplementation(
      async () => new Response(null, { status: 204 }),
    );

    await expect(CollectionService.getForUser(1)).resolves.toEqual([]);
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("returns null on a 403 without any toast", async () => {
    mockFetch.mockImplementation(async () =>
      json({ message: "Forbidden" }, 403),
    );

    await expect(CollectionService.getForUser(3)).resolves.toBeNull();
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it.each([400, 401, 404, 500])(
    "rejects with the HttpError on status %s and shows no toast",
    async (status) => {
      mockFetch.mockImplementation(async () =>
        json({ message: "boom" }, status),
      );

      const failure = CollectionService.getForUser(2);

      await expect(failure).rejects.toBeInstanceOf(HttpError);
      await expect(failure).rejects.toMatchObject({ status });
      expect(toast.danger).not.toHaveBeenCalled();
    },
  );

  it("rejects on a network failure and shows no toast", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(CollectionService.getForUser(2)).rejects.toBeInstanceOf(
      TypeError,
    );
    expect(toast.danger).not.toHaveBeenCalled();
  });
});

describe("collectionSummaryDtoToModel", () => {
  const toModel = (dto: Record<string, unknown>) =>
    collectionSummaryDtoToModel(dto as unknown as CollectionSummaryDto);

  it("maps every field of a custom collection", () => {
    expect(toModel(CUSTOM_DTO)).toEqual({
      id: 5,
      kind: "custom",
      name: "Trappistes",
      beerCount: 1,
    });
  });

  it("keeps a null id and an empty name for the wishlist", () => {
    expect(toModel(WISHLIST_DTO)).toEqual({
      id: null,
      kind: "wishlist",
      name: "",
      beerCount: 2,
    });
  });

  it("applies the defaults when every field is missing", () => {
    expect(toModel({})).toEqual({
      id: null,
      kind: "custom",
      name: "",
      beerCount: 0,
    });
  });

  it("applies the defaults to null fields and falls back to custom on an unknown kind", () => {
    expect(
      toModel({ id: null, kind: "mystery", name: null, beerCount: null }),
    ).toEqual({
      id: null,
      kind: "custom",
      name: "",
      beerCount: 0,
    });
  });

  it("keeps the falsy-but-valid values", () => {
    expect(toModel({ id: 0, kind: "custom", name: "", beerCount: 0 })).toEqual({
      id: 0,
      kind: "custom",
      name: "",
      beerCount: 0,
    });
  });

  it("maps the present fields and defaults the missing ones", () => {
    expect(toModel({ id: 8, name: "IPA" })).toEqual({
      id: 8,
      kind: "custom",
      name: "IPA",
      beerCount: 0,
    });
  });
});

describe("isCollectionKind", () => {
  it("accepts the two contract kinds only", () => {
    expect(CollectionKindEnum.WISHLIST).toBe("wishlist");
    expect(CollectionKindEnum.CUSTOM).toBe("custom");
    expect(isCollectionKind("wishlist")).toBe(true);
    expect(isCollectionKind("custom")).toBe(true);
    expect(isCollectionKind("other")).toBe(false);
    expect(isCollectionKind(null)).toBe(false);
  });
});

describe("CollectionService.create", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds the my collections route under the api root", () => {
    expect(ME_COLLECTIONS()).toBe(`${API_V1()}/me/collections`);
  });

  it("posts exactly the trimmed name as json to the my collections route", async () => {
    mockFetch.mockImplementation(async () =>
      json({ id: 8, kind: "custom", name: "Trappistes", beerCount: 0 }, 201),
    );

    await CollectionService.create("  Trappistes  ");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_V1()}/me/collections`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ name: "Trappistes" });
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
  });

  it("returns the created collection as a model with no beer and shows no toast", async () => {
    mockFetch.mockImplementation(async () =>
      json({ id: 8, kind: "custom", name: "Trappistes", beerCount: 0 }, 201),
    );

    await expect(CollectionService.create("Trappistes")).resolves.toEqual({
      id: 8,
      kind: "custom",
      name: "Trappistes",
      beerCount: 0,
    });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("toasts the dedicated name message once and rethrows on a 409", async () => {
    mockFetch.mockImplementation(async () =>
      json({ message: "Conflict" }, 409),
    );

    const failure = CollectionService.create("Trappistes");

    await expect(failure).rejects.toBeInstanceOf(HttpError);
    await expect(failure).rejects.toMatchObject({ status: 409 });
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("Ce nom est déjà pris");
  });

  const answerCreateConflict = (customCount: number) =>
    mockFetch.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? json({ message: "Conflict" }, 409)
        : json([
            WISHLIST_DTO,
            ...Array.from({ length: customCount }, (_, index) => ({
              ...CUSTOM_DTO,
              id: index + 1,
              name: `C${index + 1}`,
            })),
          ]),
    );

  it("on a 409 reads the collections of the current user again to tell the limit from a taken name", async () => {
    answerCreateConflict(20);

    await expect(CollectionService.create("Trappistes")).rejects.toMatchObject({
      status: 409,
    });

    const [url, init] = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(url).toBe(USER_COLLECTIONS(1));
    expect(init.method).toBe("GET");
  });

  it("toasts the limit message once when a 409 comes while twenty custom collections exist, wishlist apart", async () => {
    answerCreateConflict(20);

    await expect(CollectionService.create("Trappistes")).rejects.toMatchObject({
      status: 409,
    });

    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("20 collections au plus");
  });

  it("toasts the name message when a 409 comes while the user is below the limit", async () => {
    answerCreateConflict(19);

    await expect(CollectionService.create("Trappistes")).rejects.toMatchObject({
      status: 409,
    });

    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("Ce nom est déjà pris");
  });

  it("falls back to the name message when the collections cannot be read again after a 409", async () => {
    mockFetch.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? json({ message: "Conflict" }, 409)
        : json({ message: "boom" }, 500),
    );

    await expect(CollectionService.create("Trappistes")).rejects.toMatchObject({
      status: 409,
    });

    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("Ce nom est déjà pris");
  });

  it("does not read the collections again on a failure other than a 409", async () => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, 500));

    await expect(CollectionService.create("Trappistes")).rejects.toMatchObject({
      status: 500,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    [400, "La demande est invalide."],
    [401, "Vous devez être identifié."],
    [500, "Une erreur est survenue. Réessayez."],
  ])(
    "toasts the generic message of status %s once and rethrows",
    async (status, message) => {
      mockFetch.mockImplementation(async () =>
        json({ message: "boom" }, status),
      );

      await expect(
        CollectionService.create("Trappistes"),
      ).rejects.toMatchObject({ status });
      expect(toast.danger).toHaveBeenCalledTimes(1);
      expect(toast.danger).toHaveBeenCalledWith(message);
    },
  );

  it("toasts the generic message once and rethrows on a network failure", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(CollectionService.create("Trappistes")).rejects.toBeInstanceOf(
      TypeError,
    );
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith(
      "Une erreur est survenue. Réessayez.",
    );
  });

  it("rejects and toasts once when the created collection comes back empty", async () => {
    mockFetch.mockImplementation(
      async () => new Response(null, { status: 204 }),
    );

    await expect(CollectionService.create("Trappistes")).rejects.toBeInstanceOf(
      HttpError,
    );
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });
});

describe("CollectionService.rename", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds the route of one of my collections under the my collections route", () => {
    expect(ME_COLLECTION(5)).toBe(`${ME_COLLECTIONS()}/5`);
    expect(ME_COLLECTION(5)).toBe(`${API_V1()}/me/collections/5`);
  });

  it("patches exactly the trimmed name as json to the route of the collection", async () => {
    mockFetch.mockImplementation(async () =>
      json({ id: 5, kind: "custom", name: "Abbayes", beerCount: 3 }),
    );

    await CollectionService.rename(5, "  Abbayes  ");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_V1()}/me/collections/5`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ name: "Abbayes" });
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
  });

  it("returns the renamed collection as a model and shows no toast", async () => {
    mockFetch.mockImplementation(async () =>
      json({ id: 5, kind: "custom", name: "Abbayes", beerCount: 3 }),
    );

    await expect(CollectionService.rename(5, "Abbayes")).resolves.toEqual({
      id: 5,
      kind: "custom",
      name: "Abbayes",
      beerCount: 3,
    });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("toasts the dedicated name message once and rethrows on a 409", async () => {
    mockFetch.mockImplementation(async () =>
      json({ message: "Conflict" }, 409),
    );

    const failure = CollectionService.rename(5, "Abbayes");

    await expect(failure).rejects.toBeInstanceOf(HttpError);
    await expect(failure).rejects.toMatchObject({ status: 409 });
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("Ce nom est déjà pris");
  });

  it.each([
    [400, "La demande est invalide."],
    [401, "Vous devez être identifié."],
    [404, "La ressource demandée est introuvable."],
    [500, "Une erreur est survenue. Réessayez."],
  ])(
    "toasts the generic message of status %s once and rethrows",
    async (status, message) => {
      mockFetch.mockImplementation(async () =>
        json({ message: "boom" }, status),
      );

      await expect(
        CollectionService.rename(5, "Abbayes"),
      ).rejects.toMatchObject({ status });
      expect(toast.danger).toHaveBeenCalledTimes(1);
      expect(toast.danger).toHaveBeenCalledWith(message);
    },
  );

  it("toasts the generic message once and rethrows on a network failure", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(CollectionService.rename(5, "Abbayes")).rejects.toBeInstanceOf(
      TypeError,
    );
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith(
      "Une erreur est survenue. Réessayez.",
    );
  });

  it("rejects and toasts once when the renamed collection comes back empty", async () => {
    mockFetch.mockImplementation(
      async () => new Response(null, { status: 204 }),
    );

    await expect(CollectionService.rename(5, "Abbayes")).rejects.toBeInstanceOf(
      HttpError,
    );
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });
});

describe("CollectionService.remove", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends one DELETE to the route of the collection without a body", async () => {
    mockFetch.mockImplementation(
      async () => new Response(null, { status: 204 }),
    );

    await expect(CollectionService.remove(5)).resolves.toBeUndefined();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_V1()}/me/collections/5`);
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it.each([
    [400, "La demande est invalide."],
    [401, "Vous devez être identifié."],
    [404, "La ressource demandée est introuvable."],
    [500, "Une erreur est survenue. Réessayez."],
  ])(
    "toasts the generic message of status %s once and rethrows",
    async (status, message) => {
      mockFetch.mockImplementation(async () =>
        json({ message: "boom" }, status),
      );

      await expect(CollectionService.remove(5)).rejects.toMatchObject({
        status,
      });
      expect(toast.danger).toHaveBeenCalledTimes(1);
      expect(toast.danger).toHaveBeenCalledWith(message);
    },
  );

  it("toasts the generic message once and rethrows on a network failure", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(CollectionService.remove(5)).rejects.toBeInstanceOf(TypeError);
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });
});

describe("CollectionService.removeBeer", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds the beer route under the collection route of the current user", () => {
    expect(ME_COLLECTION_BEER(5, 12)).toBe(`${ME_COLLECTION(5)}/beers/12`);
    expect(ME_COLLECTION_BEER(5, 12)).toBe(
      `${API_V1()}/me/collections/5/beers/12`,
    );
  });

  it("sends one DELETE to the beer route without a body and shows no toast", async () => {
    mockFetch.mockImplementation(
      async () => new Response(null, { status: 204 }),
    );

    await expect(CollectionService.removeBeer(5, 12)).resolves.toBeUndefined();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_V1()}/me/collections/5/beers/12`);
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it.each([
    [400, "La demande est invalide."],
    [401, "Vous devez être identifié."],
    [404, "La ressource demandée est introuvable."],
    [500, "Une erreur est survenue. Réessayez."],
  ])(
    "toasts the generic message of status %s once and rethrows",
    async (status, message) => {
      mockFetch.mockImplementation(async () =>
        json({ message: "boom" }, status),
      );

      await expect(CollectionService.removeBeer(5, 12)).rejects.toMatchObject({
        status,
      });
      expect(toast.danger).toHaveBeenCalledTimes(1);
      expect(toast.danger).toHaveBeenCalledWith(message);
    },
  );

  it("toasts the generic message once and rethrows on a network failure", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(CollectionService.removeBeer(5, 12)).rejects.toBeInstanceOf(
      TypeError,
    );
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });
});

describe("buildSaveCollectionDto", () => {
  it("trims the name and carries nothing else", () => {
    expect(buildSaveCollectionDto("  Trappistes  ")).toEqual({
      name: "Trappistes",
    });
    expect(Object.keys(buildSaveCollectionDto("  Trappistes  "))).toEqual([
      "name",
    ]);
  });

  it("keeps the inner spaces and a name of exactly 40 characters", () => {
    const forty = `${"a".repeat(19)} ${"b".repeat(20)}`;

    expect(buildSaveCollectionDto(` ${forty} `)).toEqual({ name: forty });
    expect(buildSaveCollectionDto("Bières  de  garde")).toEqual({
      name: "Bières  de  garde",
    });
  });

  it("keeps an empty name empty", () => {
    expect(buildSaveCollectionDto("   ")).toEqual({ name: "" });
  });
});

const BEER_DTO = {
  beerId: 12,
  beerName: "Orval",
  styleName: "Trappiste",
  family: "trappist",
  drunkByMe: true,
  addedAt: "2026-10-12T10:00:00.000Z",
};
const DETAIL_DTO = {
  id: 5,
  kind: "custom",
  name: "Trappistes",
  ownerId: 2,
  beers: [BEER_DTO],
};
const WISHLIST_DETAIL_DTO = {
  id: null,
  kind: "wishlist",
  name: "",
  ownerId: 2,
  beers: [],
};
const DETAIL_MODEL = {
  id: 5,
  kind: "custom",
  name: "Trappistes",
  ownerId: 2,
  beers: [
    {
      beerId: 12,
      beerName: "Orval",
      styleName: "Trappiste",
      family: "trappist",
      drunkByMe: true,
      addedAt: new Date("2026-10-12T10:00:00.000Z"),
    },
  ],
};

describe("collection detail routes", () => {
  it("builds the collection and wishlist routes of a user under the users route", () => {
    expect(USER_COLLECTION(2, 5)).toBe(`${API_V1()}/users/2/collections/5`);
    expect(USER_WISHLIST(2)).toBe(`${API_V1()}/users/2/wishlist`);
  });
});

describe.each([
  [
    "getDetail",
    () => CollectionService.getDetail(2, 5),
    `${API_V1()}/users/2/collections/5`,
    DETAIL_DTO,
    DETAIL_MODEL,
  ],
  [
    "getWishlistOf",
    () => CollectionService.getWishlistOf(2),
    `${API_V1()}/users/2/wishlist`,
    WISHLIST_DETAIL_DTO,
    { id: null, kind: "wishlist", name: "", ownerId: 2, beers: [] },
  ],
])("CollectionService.%s", (_name, call, expectedUrl, dto, expectedModel) => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests the route with a GET and returns the detail as a model", async () => {
    mockFetch.mockImplementation(async () => json(dto));

    const detail = await call();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(expectedUrl);
    expect(init.method).toBe("GET");
    expect(detail).toEqual(expectedModel);
  });

  it.each([403, 404])(
    "returns null on a %s without any toast",
    async (status) => {
      mockFetch.mockImplementation(async () =>
        json({ message: "nope" }, status),
      );

      await expect(call()).resolves.toBeNull();
      expect(toast.danger).not.toHaveBeenCalled();
    },
  );

  it("returns null on a 204 without any toast", async () => {
    mockFetch.mockImplementation(
      async () => new Response(null, { status: 204 }),
    );

    await expect(call()).resolves.toBeNull();
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it.each([400, 401, 500])(
    "rejects with the HttpError on status %s and shows no toast",
    async (status) => {
      mockFetch.mockImplementation(async () =>
        json({ message: "boom" }, status),
      );

      const failure = call();

      await expect(failure).rejects.toBeInstanceOf(HttpError);
      await expect(failure).rejects.toMatchObject({ status });
      expect(toast.danger).not.toHaveBeenCalled();
    },
  );

  it("rejects on a network failure and shows no toast", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(call()).rejects.toBeInstanceOf(TypeError);
    expect(toast.danger).not.toHaveBeenCalled();
  });
});

describe("collectionBeerDtoToModel", () => {
  const toModel = (dto: Record<string, unknown>) =>
    collectionBeerDtoToModel(dto as unknown as CollectionBeerDto);

  it("maps every field and turns the date into a Date", () => {
    expect(toModel(BEER_DTO)).toEqual(DETAIL_MODEL.beers[0]);
  });

  it("applies the defaults when every field is missing", () => {
    expect(toModel({})).toEqual({
      beerId: 0,
      beerName: "",
      styleName: "",
      family: null,
      drunkByMe: false,
      addedAt: null,
    });
  });

  it("applies the defaults to null fields and drops an unknown family", () => {
    expect(
      toModel({
        beerId: null,
        beerName: null,
        styleName: null,
        family: "mystery",
        drunkByMe: null,
        addedAt: null,
      }),
    ).toEqual({
      beerId: 0,
      beerName: "",
      styleName: "",
      family: null,
      drunkByMe: false,
      addedAt: null,
    });
  });

  it("keeps the falsy-but-valid values", () => {
    expect(
      toModel({
        beerId: 0,
        beerName: "",
        styleName: "",
        family: "lager",
        drunkByMe: false,
        addedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toEqual({
      beerId: 0,
      beerName: "",
      styleName: "",
      family: "lager",
      drunkByMe: false,
      addedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
  });

  it("maps the present fields and defaults the missing ones", () => {
    expect(toModel({ beerId: 3, beerName: "Duvel" })).toEqual({
      beerId: 3,
      beerName: "Duvel",
      styleName: "",
      family: null,
      drunkByMe: false,
      addedAt: null,
    });
  });
});

describe("collectionDetailDtoToModel", () => {
  const toModel = (dto: Record<string, unknown>) =>
    collectionDetailDtoToModel(dto as unknown as CollectionDetailDto);

  it("maps every field and each beer", () => {
    expect(toModel(DETAIL_DTO)).toEqual(DETAIL_MODEL);
  });

  it("keeps a null id and an empty name for the wishlist", () => {
    expect(toModel(WISHLIST_DETAIL_DTO)).toEqual({
      id: null,
      kind: "wishlist",
      name: "",
      ownerId: 2,
      beers: [],
    });
  });

  it("applies the defaults when every field is missing", () => {
    expect(toModel({})).toEqual({
      id: null,
      kind: "custom",
      name: "",
      ownerId: 0,
      beers: [],
    });
  });

  it("applies the defaults to null fields and falls back to custom on an unknown kind", () => {
    expect(
      toModel({
        id: null,
        kind: "mystery",
        name: null,
        ownerId: null,
        beers: null,
      }),
    ).toEqual({
      id: null,
      kind: "custom",
      name: "",
      ownerId: 0,
      beers: [],
    });
  });

  it("keeps the falsy-but-valid values", () => {
    expect(
      toModel({ id: 0, kind: "custom", name: "", ownerId: 0, beers: [] }),
    ).toEqual({
      id: 0,
      kind: "custom",
      name: "",
      ownerId: 0,
      beers: [],
    });
  });

  it("maps the present fields and defaults the missing ones", () => {
    expect(toModel({ id: 8, name: "IPA" })).toEqual({
      id: 8,
      kind: "custom",
      name: "IPA",
      ownerId: 0,
      beers: [],
    });
  });
});

const MY_WISHLIST_DTO = {
  id: null,
  kind: "wishlist",
  name: "",
  beerCount: 2,
  containsBeer: true,
};
const MY_CUSTOM_DTO = {
  id: 5,
  kind: "custom",
  name: "Trappistes",
  beerCount: 1,
  containsBeer: false,
};

describe("my collections routes", () => {
  it("builds the my collections route with the beer id as query", () => {
    expect(ME_COLLECTIONS_CONTAINING(12)).toBe(
      `${API_V1()}/me/collections?beerId=12`,
    );
    expect(ME_COLLECTION_BEERS(5)).toBe(`${API_V1()}/me/collections/5/beers`);
  });
});

describe("CollectionService.getMine", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests my collections with the beer id and maps them in the order received", async () => {
    mockFetch.mockImplementation(async () =>
      json([MY_WISHLIST_DTO, MY_CUSTOM_DTO]),
    );

    const collections = await CollectionService.getMine(12);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_V1()}/me/collections?beerId=12`);
    expect(init.method).toBe("GET");
    expect(collections).toEqual([
      {
        id: null,
        kind: "wishlist",
        name: "",
        beerCount: 2,
        containsBeer: true,
      },
      {
        id: 5,
        kind: "custom",
        name: "Trappistes",
        beerCount: 1,
        containsBeer: false,
      },
    ]);
  });

  it("returns an empty list on a 204", async () => {
    mockFetch.mockImplementation(
      async () => new Response(null, { status: 204 }),
    );

    await expect(CollectionService.getMine(12)).resolves.toEqual([]);
  });

  it.each([404, 500])(
    "rethrows the status %s without a toast",
    async (status) => {
      mockFetch.mockImplementation(async () =>
        json({ message: "boom" }, status),
      );

      await expect(CollectionService.getMine(12)).rejects.toMatchObject({
        status,
      });
      expect(toast.danger).not.toHaveBeenCalled();
    },
  );
});

describe("CollectionService.addBeer", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the beer id to the beers route of the collection and returns the summary", async () => {
    mockFetch.mockImplementation(async () =>
      json({ ...CUSTOM_DTO, beerCount: 2 }, 201),
    );

    const summary = await CollectionService.addBeer(5, 12);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_V1()}/me/collections/5/beers`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ beerId: 12 });
    expect(summary).toEqual({
      id: 5,
      kind: "custom",
      name: "Trappistes",
      beerCount: 2,
    });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("throws and toasts once when the server answers without a body", async () => {
    mockFetch.mockImplementation(
      async () => new Response(null, { status: 204 }),
    );

    await expect(CollectionService.addBeer(5, 12)).rejects.toBeInstanceOf(
      HttpError,
    );
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });

  it.each([
    [400, "La demande est invalide."],
    [404, "La ressource demandée est introuvable."],
    [409, "Cette action entre en conflit avec l'état actuel."],
    [500, "Une erreur est survenue. Réessayez."],
  ])(
    "toasts the generic message of status %s once and rethrows",
    async (status, message) => {
      mockFetch.mockImplementation(async () =>
        json({ message: "boom" }, status),
      );

      await expect(CollectionService.addBeer(5, 12)).rejects.toMatchObject({
        status,
      });
      expect(toast.danger).toHaveBeenCalledTimes(1);
      expect(toast.danger).toHaveBeenCalledWith(message);
    },
  );
});

describe("myCollectionDtoToModel", () => {
  const toModel = (dto: Record<string, unknown>) =>
    myCollectionDtoToModel(dto as unknown as MyCollectionDto);

  it("maps every field of a custom collection", () => {
    expect(toModel(MY_CUSTOM_DTO)).toEqual({
      id: 5,
      kind: "custom",
      name: "Trappistes",
      beerCount: 1,
      containsBeer: false,
    });
  });

  it("keeps the null id of the wishlist and its membership", () => {
    expect(toModel(MY_WISHLIST_DTO)).toEqual({
      id: null,
      kind: "wishlist",
      name: "",
      beerCount: 2,
      containsBeer: true,
    });
  });

  it("applies the defaults when every field is missing or null", () => {
    const expected = {
      id: null,
      kind: "custom",
      name: "",
      beerCount: 0,
      containsBeer: false,
    };
    expect(toModel({})).toEqual(expected);
    expect(
      toModel({
        id: null,
        kind: "mystery",
        name: null,
        beerCount: null,
        containsBeer: null,
      }),
    ).toEqual(expected);
  });

  it("keeps the falsy-but-valid values and maps the present fields of a partial dto", () => {
    expect(
      toModel({
        id: 0,
        kind: "custom",
        name: "",
        beerCount: 0,
        containsBeer: false,
      }),
    ).toEqual({
      id: 0,
      kind: "custom",
      name: "",
      beerCount: 0,
      containsBeer: false,
    });
    expect(toModel({ id: 8, name: "IPA", containsBeer: true })).toEqual({
      id: 8,
      kind: "custom",
      name: "IPA",
      beerCount: 0,
      containsBeer: true,
    });
  });
});
