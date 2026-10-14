import { toast } from "@heroui/react";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { HttpError } from "@/api/httpError";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import { useCreateVenueMutation } from "@/pages/map/hooks/useCreateVenueMutation";
import { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";
import { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";
import type { NewVenue } from "@/types/models/venue/newVenue";
import type { Venue } from "@/types/models/venue/venue";
import { createVenue } from "@/utils/queryFunctions/venueQueryFunctions";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

vi.mock("@heroui/react", () => ({
  toast: { success: vi.fn(), danger: vi.fn() },
}));

vi.mock("@/utils/queryFunctions/venueQueryFunctions", () => ({
  createVenue: vi.fn(),
}));

const NEW_VENUE: NewVenue = {
  name: "Le Trappiste",
  type: VenueTypeEnum.BAR,
  address: "1 rue de la Bière",
  city: "Paris",
  description: "",
  latitude: 48.85,
  longitude: 2.35,
};

const CREATED: Venue = {
  ...NEW_VENUE,
  id: 40,
  type: VenueTypeEnum.BAR,
  distanceKm: null,
  checkinCount: 0,
  lastCheckinAt: null,
  status: AvailabilityStatusEnum.UNKNOWN,
};

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const setup = () => {
  const client = createTestQueryClient();
  client.setQueryData(venueKeys.list({} as never), []);
  client.setQueryData(venueKeys.beers(12), []);
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const hook = renderHook(() => useCreateVenueMutation(), { wrapper: wrapperFor(client) });
  return { client, invalidate, hook };
};

describe("useCreateVenueMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the venue it is given through the query function", async () => {
    (createVenue as Mock).mockResolvedValue(CREATED);
    const { hook } = setup();

    act(() => hook.result.current.mutate(NEW_VENUE));

    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(createVenue).toHaveBeenCalledTimes(1);
    expect(createVenue).toHaveBeenCalledWith(NEW_VENUE);
    expect(hook.result.current.data).toEqual(CREATED);
  });

  it("AC1 reloads every venue list, not the beers of a venue, and shows one success toast", async () => {
    (createVenue as Mock).mockResolvedValue(CREATED);
    const { invalidate, hook } = setup();

    act(() => hook.result.current.mutate(NEW_VENUE));

    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: venueKeys.lists() });
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Lieu proposé");
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it.each([400, 409, 500])("on status %s reloads nothing and adds no toast of its own", async (status) => {
    (createVenue as Mock).mockRejectedValue(new HttpError(status, "boom"));
    const { invalidate, hook } = setup();

    act(() => hook.result.current.mutate(NEW_VENUE));

    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(invalidate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("on a network failure reloads nothing and adds no toast", async () => {
    (createVenue as Mock).mockRejectedValue(new TypeError("Failed to fetch"));
    const { invalidate, hook } = setup();

    act(() => hook.result.current.mutate(NEW_VENUE));

    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(invalidate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
