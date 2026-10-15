import type { QueryClient, QueryObserverOptions } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import CorrectionService from "@/api/corrections/correctionService";
import { queryTimes } from "@/config/tanstackQuery";
import { useBeerCorrectionsQuery } from "@/pages/beerDetail/hooks/useBeerCorrectionsQuery";
import { correctionKeys } from "@/utils/queryKeys/correctionQueryKeys";

vi.mock("@/api/corrections/correctionService", () => ({
  default: { getForBeer: vi.fn() },
}));

const CORRECTIONS = [{ id: 5, beerId: 7, characteristic: "ibu" }];

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useBeerCorrectionsQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches the corrections of the beer and exposes them", async () => {
    (CorrectionService.getForBeer as Mock).mockResolvedValue(CORRECTIONS);

    const { result } = renderHook(() => useBeerCorrectionsQuery(7), { wrapper: wrapperFor(createTestQueryClient()) });

    expect(result.current.isPending).toBe(true);
    expect(result.current.corrections).toEqual([]);
    await waitFor(() => expect(result.current.corrections).toEqual(CORRECTIONS));
    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(CorrectionService.getForBeer).toHaveBeenCalledTimes(1);
    expect(CorrectionService.getForBeer).toHaveBeenCalledWith(7);
  });

  it("flags the error and keeps an empty list when the request fails", async () => {
    (CorrectionService.getForBeer as Mock).mockRejectedValue(new Error("server down"));

    const { result } = renderHook(() => useBeerCorrectionsQuery(7), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.corrections).toEqual([]);
  });

  it("keeps the corrections of each beer under its own key", async () => {
    (CorrectionService.getForBeer as Mock).mockImplementation(async (beerId: number) => [{ id: beerId }]);
    const client = createTestQueryClient();

    const first = renderHook(() => useBeerCorrectionsQuery(7), { wrapper: wrapperFor(client) });
    const second = renderHook(() => useBeerCorrectionsQuery(8), { wrapper: wrapperFor(client) });

    await waitFor(() => expect(first.result.current.corrections).toEqual([{ id: 7 }]));
    await waitFor(() => expect(second.result.current.corrections).toEqual([{ id: 8 }]));
    expect(client.getQueryData(correctionKeys.forBeer(7))).toEqual([{ id: 7 }]);
    expect(client.getQueryData(correctionKeys.forBeer(8))).toEqual([{ id: 8 }]);
  });

  it("uses the short query times and a key under the corrections root", () => {
    (CorrectionService.getForBeer as Mock).mockResolvedValue([]);
    const client = createTestQueryClient();

    renderHook(() => useBeerCorrectionsQuery(7), { wrapper: wrapperFor(client) });

    const query = client.getQueryCache().find({ queryKey: correctionKeys.forBeer(7) });
    const options = query?.options as QueryObserverOptions;
    expect(options.staleTime).toBe(queryTimes.short.staleTime);
    expect(options.gcTime).toBe(queryTimes.short.gcTime);
    expect(correctionKeys.forBeer(7).slice(0, correctionKeys.all().length)).toEqual(correctionKeys.all());
    expect(correctionKeys.forBeer(7)).not.toEqual(correctionKeys.forBeer(8));
  });
});
