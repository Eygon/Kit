import { toast } from "@heroui/react";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { HttpError } from "@/api/httpError";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import { useVoteCorrectionMutation } from "@/hooks/corrections/useVoteCorrectionMutation";
import { BeerCharacteristicEnum } from "@/types/enums/beer/beerCharacteristicEnum";
import { CorrectionVoteSenseEnum } from "@/types/enums/correction/correctionVoteSenseEnum";
import { CorrectionStatusEnum } from "@/types/enums/correction/correctionStatusEnum";
import type { Correction } from "@/types/models/correction/correction";
import { voteCorrection } from "@/utils/queryFunctions/correctionQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { correctionKeys } from "@/utils/queryKeys/correctionQueryKeys";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

vi.mock("@heroui/react", () => ({
  toast: { success: vi.fn(), danger: vi.fn() },
}));

vi.mock("@/utils/queryFunctions/correctionQueryFunctions", () => ({
  voteCorrection: vi.fn(),
}));

const VOTED: Correction = {
  id: 5,
  beerId: 7,
  beerName: "Chimay Rouge",
  characteristic: BeerCharacteristicEnum.IBU,
  currentValue: null,
  proposedValue: 35,
  reason: "",
  proposedBy: 2,
  proposedByName: "Bob",
  createdAt: "2026-10-10T10:00:00.000Z",
  closesAt: "2026-10-17T10:00:00.000Z",
  status: CorrectionStatusEnum.OPEN,
  resolvedAt: null,
  agreeCount: 3,
  disagreeCount: 1,
  myVote: CorrectionVoteSenseEnum.AGREE,
  isMine: false,
};

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const setup = () => {
  const client = createTestQueryClient();
  client.setQueryData(correctionKeys.forBeer(7), [VOTED]);
  client.setQueryData(beerKeys.detail(7), { id: 7 });
  client.setQueryData(venueKeys.lists(), []);
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const hook = renderHook(() => useVoteCorrectionMutation(), { wrapper: wrapperFor(client) });
  return { client, invalidate, hook };
};

describe("useVoteCorrectionMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("votes on the correction it is given with the pressed sense", async () => {
    (voteCorrection as Mock).mockResolvedValue(VOTED);
    const { hook } = setup();

    act(() => hook.result.current.mutate({ correctionId: 5, sense: CorrectionVoteSenseEnum.DISAGREE }));

    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(voteCorrection).toHaveBeenCalledTimes(1);
    expect(voteCorrection).toHaveBeenCalledWith(5, CorrectionVoteSenseEnum.DISAGREE);
  });

  it("on success refreshes the corrections and the beers, and shows one Vote enregistré toast", async () => {
    (voteCorrection as Mock).mockResolvedValue(VOTED);
    const { client, invalidate, hook } = setup();

    act(() => hook.result.current.mutate({ correctionId: 5, sense: CorrectionVoteSenseEnum.AGREE }));

    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: correctionKeys.all() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: beerKeys.all() });
    expect(client.getQueryState(correctionKeys.forBeer(7))?.isInvalidated).toBe(true);
    expect(client.getQueryState(beerKeys.detail(7))?.isInvalidated).toBe(true);
    expect(client.getQueryState(venueKeys.lists())?.isInvalidated).toBe(false);
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Vote enregistré");
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("on a 409 refreshes the corrections and the beers, adds no toast of its own and fails", async () => {
    (voteCorrection as Mock).mockRejectedValue(new HttpError(409, "Conflict"));
    const { client, invalidate, hook } = setup();

    act(() => hook.result.current.mutate({ correctionId: 5, sense: CorrectionVoteSenseEnum.AGREE }));

    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: correctionKeys.all() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: beerKeys.all() });
    expect(client.getQueryState(correctionKeys.forBeer(7))?.isInvalidated).toBe(true);
    expect(client.getQueryState(beerKeys.detail(7))?.isInvalidated).toBe(true);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("does not refresh anything before the vote settles", async () => {
    let rejectVote: (error: Error) => void = () => undefined;
    (voteCorrection as Mock).mockImplementation(
      () => new Promise<Correction>((_resolve, reject) => { rejectVote = reject; }),
    );
    const { invalidate, hook } = setup();

    act(() => hook.result.current.mutate({ correctionId: 5, sense: CorrectionVoteSenseEnum.AGREE }));

    await waitFor(() => expect(hook.result.current.isPending).toBe(true));
    expect(invalidate).not.toHaveBeenCalled();
    rejectVote(new Error("boom"));
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(2));
  });
});
