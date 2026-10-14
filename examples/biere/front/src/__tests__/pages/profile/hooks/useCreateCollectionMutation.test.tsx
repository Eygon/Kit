import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { HttpError } from "@/api/httpError";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import { useCreateCollectionMutation } from "@/pages/profile/hooks/useCreateCollectionMutation";
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";
import type { CollectionSummary } from "@/types/models/collection/collectionSummary";
import { createCollection } from "@/utils/queryFunctions/collectionQueryFunctions";
import { collectionKeys } from "@/utils/queryKeys/collectionQueryKeys";

vi.mock("@/utils/queryFunctions/collectionQueryFunctions", () => ({
  createCollection: vi.fn(),
}));

const CREATED: CollectionSummary = {
  id: 8,
  kind: "custom" as CollectionSummary["kind"],
  name: "Trappistes",
  beerCount: 0,
};

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const renderMutation = (client: QueryClient) =>
  renderHook(() => useCreateCollectionMutation(), {
    wrapper: wrapperFor(client),
  });

describe("useCreateCollectionMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the name, returns the created collection and invalidates every collection list", async () => {
    (createCollection as Mock).mockResolvedValue(CREATED);
    const client = createTestQueryClient();
    client.setQueryData(collectionKeys.list(1), []);
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderMutation(client);

    let created: unknown;
    await act(async () => {
      created = await result.current.createCollection("Trappistes");
    });

    expect(createCollection).toHaveBeenCalledTimes(1);
    expect(createCollection).toHaveBeenCalledWith("Trappistes");
    expect(created).toEqual(CREATED);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: collectionKeys.all() });
    expect(client.getQueryState(collectionKeys.list(1))?.isInvalidated).toBe(
      true,
    );
  });

  it("rethrows and invalidates nothing when the creation fails", async () => {
    (createCollection as Mock).mockRejectedValue(new Error("Down"));
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderMutation(client);

    await act(async () => {
      await expect(
        result.current.createCollection("Trappistes"),
      ).rejects.toThrow("Down");
    });

    expect(invalidate).not.toHaveBeenCalled();
  });

  it("rethrows and invalidates every collection list when the creation is refused with a 409, the cached count being stale", async () => {
    (createCollection as Mock).mockRejectedValue(
      new HttpError(HttpStatusCodeEnum.CONFLICT, "Conflict"),
    );
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderMutation(client);

    await act(async () => {
      await expect(
        result.current.createCollection("Trappistes"),
      ).rejects.toMatchObject({ status: 409 });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: collectionKeys.all() });
  });

  it("sends a single request when the creation is triggered twice in the same tick", async () => {
    let finish: (collection: CollectionSummary) => void = () => undefined;
    (createCollection as Mock).mockImplementation(
      () =>
        new Promise<CollectionSummary>((resolve) => {
          finish = resolve;
        }),
    );
    const client = createTestQueryClient();
    const { result } = renderMutation(client);

    let first: Promise<CollectionSummary | null> = Promise.resolve(null);
    let second: Promise<CollectionSummary | null> = Promise.resolve(CREATED);
    act(() => {
      first = result.current.createCollection("Trappistes");
      second = result.current.createCollection("Trappistes");
    });
    await waitFor(() => expect(result.current.isPending).toBe(true));
    await act(async () => {
      finish(CREATED);
      await first;
    });

    expect(createCollection).toHaveBeenCalledTimes(1);
    await expect(second).resolves.toBeNull();
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });

  it("accepts a new creation once the failed one is over", async () => {
    (createCollection as Mock)
      .mockRejectedValueOnce(new Error("Down"))
      .mockResolvedValueOnce(CREATED);
    const client = createTestQueryClient();
    const { result } = renderMutation(client);

    await act(async () => {
      await expect(
        result.current.createCollection("Trappistes"),
      ).rejects.toThrow("Down");
    });
    await act(async () => {
      await expect(
        result.current.createCollection("Trappistes"),
      ).resolves.toEqual(CREATED);
    });

    expect(createCollection).toHaveBeenCalledTimes(2);
  });
});
