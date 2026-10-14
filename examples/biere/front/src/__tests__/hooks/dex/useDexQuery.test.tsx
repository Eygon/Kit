import type { QueryClient, QueryObserverOptions } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import DexService from "@/api/dex/dexService";
import { queryTimes } from "@/config/tanstackQuery";
import { useDexQuery } from "@/hooks/dex/useDexQuery";
import { dexKeys } from "@/utils/queryKeys/dexQueryKeys";

vi.mock("@/api/dex/dexService", () => ({
  default: { get: vi.fn() },
}));

const DEX = { discovered: 42, total: 120, families: [], beers: [] };

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useDexQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts pending with no dex, then exposes the dex", async () => {
    (DexService.get as Mock).mockResolvedValue(DEX);

    const { result } = renderHook(() => useDexQuery(), { wrapper: wrapperFor(createTestQueryClient()) });

    expect(result.current.isPending).toBe(true);
    expect(result.current.dex).toBeNull();
    expect(result.current.isError).toBe(false);
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.dex).toEqual(DEX);
    expect(result.current.isError).toBe(false);
    expect(DexService.get).toHaveBeenCalledTimes(1);
  });

  it("reports the error and no dex when the service rejects", async () => {
    (DexService.get as Mock).mockRejectedValue(new Error("down"));

    const { result } = renderHook(() => useDexQuery(), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.dex).toBeNull();
  });

  it("reads the dex again on refetch and recovers from an error", async () => {
    (DexService.get as Mock).mockRejectedValueOnce(new Error("down")).mockResolvedValue(DEX);

    const { result } = renderHook(() => useDexQuery(), { wrapper: wrapperFor(createTestQueryClient()) });
    await waitFor(() => expect(result.current.isError).toBe(true));

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.dex).toEqual(DEX));
    expect(result.current.isError).toBe(false);
    expect(DexService.get).toHaveBeenCalledTimes(2);
  });

  it("caches under dexKeys.me() with the short query times", async () => {
    (DexService.get as Mock).mockResolvedValue(DEX);
    const client = createTestQueryClient();

    const { result } = renderHook(() => useDexQuery(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.dex).toEqual(DEX));

    const cachedQuery = client.getQueryCache().find({ queryKey: dexKeys.me() });
    const options = cachedQuery?.options as QueryObserverOptions | undefined;
    expect(options).toBeDefined();
    expect(options?.staleTime).toBe(queryTimes.short.staleTime);
    expect(options?.gcTime).toBe(queryTimes.short.gcTime);
  });
});
