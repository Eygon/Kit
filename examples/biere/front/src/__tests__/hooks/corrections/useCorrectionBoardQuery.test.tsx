import type { QueryClient, QueryObserverOptions } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import CorrectionService from "@/api/corrections/correctionService";
import { queryTimes } from "@/config/tanstackQuery";
import { useCorrectionBoardQuery } from "@/hooks/corrections/useCorrectionBoardQuery";
import { correctionKeys } from "@/utils/queryKeys/correctionQueryKeys";

vi.mock("@/api/corrections/correctionService", () => ({
  default: { getBoard: vi.fn() },
}));

const BOARD = { open: [], recentlyClosed: [], pendingCount: 4 };
const EMPTY_BOARD = { open: [], recentlyClosed: [], pendingCount: 0 };

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useCorrectionBoardQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds the board key under the corrections root", () => {
    expect(correctionKeys.board()).toEqual([...correctionKeys.all(), "board"]);
  });

  it("starts pending on the empty board, then exposes the board", async () => {
    (CorrectionService.getBoard as Mock).mockResolvedValue(BOARD);

    const { result } = renderHook(() => useCorrectionBoardQuery(), { wrapper: wrapperFor(createTestQueryClient()) });

    expect(result.current.isPending).toBe(true);
    expect(result.current.board).toEqual(EMPTY_BOARD);
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.board).toEqual(BOARD);
    expect(result.current.isError).toBe(false);
    expect(CorrectionService.getBoard).toHaveBeenCalledTimes(1);
  });

  it("reports the error and keeps the empty board when the service rejects", async () => {
    (CorrectionService.getBoard as Mock).mockRejectedValue(new Error("down"));

    const { result } = renderHook(() => useCorrectionBoardQuery(), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.board).toEqual(EMPTY_BOARD);
  });

  it("reads the board again on refetch and recovers from an error", async () => {
    (CorrectionService.getBoard as Mock).mockRejectedValueOnce(new Error("down")).mockResolvedValue(BOARD);

    const { result } = renderHook(() => useCorrectionBoardQuery(), { wrapper: wrapperFor(createTestQueryClient()) });
    await waitFor(() => expect(result.current.isError).toBe(true));

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.isError).toBe(false));
    expect(result.current.board).toEqual(BOARD);
    expect(CorrectionService.getBoard).toHaveBeenCalledTimes(2);
  });

  it("registers the query under the board key with the short stale time", async () => {
    (CorrectionService.getBoard as Mock).mockResolvedValue(BOARD);
    const client = createTestQueryClient();

    renderHook(() => useCorrectionBoardQuery(), { wrapper: wrapperFor(client) });

    await waitFor(() => expect(client.getQueryData(correctionKeys.board())).toEqual(BOARD));
    const options = client.getQueryCache().find({ queryKey: correctionKeys.board() })?.options as QueryObserverOptions;
    expect(options.staleTime).toBe(queryTimes.short.staleTime);
    expect(options.gcTime).toBe(queryTimes.short.gcTime);
  });
});
