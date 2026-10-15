import { toast } from "@heroui/react";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { HttpError } from "@/api/httpError";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import { useCreateBeerMutation } from "@/pages/encyclopedia/hooks/useCreateBeerMutation";
import { createBeer } from "@/utils/queryFunctions/beerQueryFunctions";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";

vi.mock("@heroui/react", () => ({
  toast: { success: vi.fn(), danger: vi.fn() },
}));

vi.mock("@/utils/queryFunctions/beerQueryFunctions", () => ({
  createBeer: vi.fn(),
}));

const NEW_BEER = {
  name: "Orval",
  breweryName: "Brasserie d'Orval",
  country: "BE",
  styleId: 12,
  abv: 6.2,
  ibu: null,
  ebc: null,
  sweetness: null,
  acidity: null,
  body: null,
  aromas: [],
  formats: [],
  description: "",
};

const CREATED = { id: 90, name: "Orval" };

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const setup = () => {
  const client = createTestQueryClient();
  client.setQueryData(beerKeys.catalog({} as never), []);
  client.setQueryData(beerKeys.detail(7), null);
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const hook = renderHook(() => useCreateBeerMutation(), { wrapper: wrapperFor(client) });
  return { client, invalidate, hook };
};

describe("useCreateBeerMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the beer it is given through the query function", async () => {
    (createBeer as Mock).mockResolvedValue(CREATED);
    const { hook } = setup();

    act(() => hook.result.current.mutate(NEW_BEER));

    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(createBeer).toHaveBeenCalledTimes(1);
    expect(createBeer).toHaveBeenCalledWith(NEW_BEER);
    expect(hook.result.current.data).toEqual(CREATED);
  });

  it("reloads every beer query once and shows one success toast", async () => {
    (createBeer as Mock).mockResolvedValue(CREATED);
    const { invalidate, hook, client } = setup();

    act(() => hook.result.current.mutate(NEW_BEER));

    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: beerKeys.all() });
    expect(client.getQueryState(beerKeys.catalog({} as never))?.isInvalidated).toBe(true);
    expect(client.getQueryState(beerKeys.detail(7))?.isInvalidated).toBe(true);
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Bière ajoutée");
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it.each([400, 404, 409, 429, 500])("on status %s reloads nothing and adds no toast of its own", async (status) => {
    (createBeer as Mock).mockRejectedValue(new HttpError(status, "boom"));
    const { invalidate, hook } = setup();

    act(() => hook.result.current.mutate(NEW_BEER));

    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(invalidate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("on a network failure reloads nothing and adds no toast", async () => {
    (createBeer as Mock).mockRejectedValue(new TypeError("Failed to fetch"));
    const { invalidate, hook } = setup();

    act(() => hook.result.current.mutate(NEW_BEER));

    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(invalidate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
