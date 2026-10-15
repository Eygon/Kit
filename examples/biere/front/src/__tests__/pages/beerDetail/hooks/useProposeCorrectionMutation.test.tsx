import { toast } from "@heroui/react";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import i18n from "@/i18n/i18n";
import { useProposeCorrectionMutation } from "@/pages/beerDetail/hooks/useProposeCorrectionMutation";
import { BeerCharacteristicEnum } from "@/types/enums/beer/beerCharacteristicEnum";
import { proposeCorrection } from "@/utils/queryFunctions/correctionQueryFunctions";
import { correctionKeys } from "@/utils/queryKeys/correctionQueryKeys";

vi.mock("@heroui/react", () => ({
  toast: { success: vi.fn(), danger: vi.fn() },
}));

vi.mock("@/utils/queryFunctions/correctionQueryFunctions", () => ({
  proposeCorrection: vi.fn(),
}));

const NEW_CORRECTION = { characteristic: BeerCharacteristicEnum.IBU, value: 35, reason: "Fiche du brasseur" };

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useProposeCorrectionMutation", () => {
  let client: QueryClient;
  let invalidate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createTestQueryClient();
    invalidate = vi.spyOn(client, "invalidateQueries");
  });

  it("sends the beer id and the correction to the query function", async () => {
    (proposeCorrection as Mock).mockResolvedValue({ id: 11 });
    const { result } = renderHook(() => useProposeCorrectionMutation(7), { wrapper: wrapperFor(client) });

    let created: unknown;
    await act(async () => {
      created = await result.current.mutateAsync(NEW_CORRECTION);
    });

    expect(proposeCorrection).toHaveBeenCalledTimes(1);
    expect((proposeCorrection as Mock).mock.calls[0]).toEqual([7, NEW_CORRECTION]);
    expect(created).toEqual({ id: 11 });
  });

  it("invalidates the corrections only, then shows the success toast once", async () => {
    (proposeCorrection as Mock).mockResolvedValue({ id: 11 });
    const { result } = renderHook(() => useProposeCorrectionMutation(7), { wrapper: wrapperFor(client) });

    await act(async () => {
      await result.current.mutateAsync(NEW_CORRECTION);
    });

    const keys = invalidate.mock.calls.map(([filters]: [{ queryKey: unknown }]) => filters.queryKey);
    expect(keys).toEqual([correctionKeys.all()]);
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith(i18n.t("corrections.propose.saved"));
    expect(i18n.t("corrections.propose.saved")).toBe("Proposition envoyée au vote");
  });

  it("neither invalidates nor shows a toast when the proposal fails, and reports the error", async () => {
    (proposeCorrection as Mock).mockRejectedValue(new Error("refused"));
    const { result } = renderHook(() => useProposeCorrectionMutation(7), { wrapper: wrapperFor(client) });

    await act(async () => {
      await result.current.mutateAsync(NEW_CORRECTION).catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("reports pending while the request is in flight", async () => {
    let resolve!: (value: unknown) => void;
    (proposeCorrection as Mock).mockReturnValue(new Promise((res) => (resolve = res)));
    const { result } = renderHook(() => useProposeCorrectionMutation(7), { wrapper: wrapperFor(client) });
    expect(result.current.isPending).toBe(false);

    let sending!: Promise<unknown>;
    act(() => {
      sending = result.current.mutateAsync(NEW_CORRECTION);
    });
    await waitFor(() => expect(result.current.isPending).toBe(true));

    await act(async () => {
      resolve({ id: 11 });
      await sending;
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });
});
