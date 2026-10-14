import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useCurrentUser } from "@/pages/profile/hooks/useCurrentUser";
import { StorageKeyEnum } from "@/types/enums/storage/storageKeyEnum";
import { DemoUserIdEnum } from "@/types/enums/user/demoUserIdEnum";
import { clearApiCache } from "@/utils/serviceWorker/clearApiCache";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";

vi.mock("@/utils/serviceWorker/clearApiCache", () => ({ clearApiCache: vi.fn() }));

const clearApiCacheMock = vi.mocked(clearApiCache);

const renderUseCurrentUser = () => {
  const queryClient = createTestQueryClient();
  const invalidateSpy = vi.spyOn(queryClient, "resetQueries");
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useCurrentUser(), { wrapper }), invalidateSpy };
};

describe("useCurrentUser data of the previous user", () => {
  it("does not keep the previous user's data when the refetch fails afterwards (offline)", async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["me", "dex"], { owner: "alice" });
    clearApiCacheMock.mockResolvedValue(undefined);
    const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    act(() => result.current.changeCurrentUser(DemoUserIdEnum.BOB));

    await waitFor(() => expect(queryClient.getQueryData(["me", "dex"])).toBeUndefined());
  });
});

describe("useCurrentUser", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearApiCacheMock.mockReset();
    clearApiCacheMock.mockResolvedValue(undefined);
  });

  it("starts from the stored user", () => {
    window.localStorage.setItem(StorageKeyEnum.CURRENT_USER_ID, "2");

    const { result } = renderUseCurrentUser();

    expect(result.current.currentUserId).toBe(DemoUserIdEnum.BOB);
  });

  it("persists the new user and resets every query once the cache is purged", async () => {
    const { result, invalidateSpy } = renderUseCurrentUser();

    act(() => result.current.changeCurrentUser(DemoUserIdEnum.CAROL));

    expect(result.current.currentUserId).toBe(DemoUserIdEnum.CAROL);
    expect(window.localStorage.getItem(StorageKeyEnum.CURRENT_USER_ID)).toBe("3");
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(1));
  });

  it("purges the API cache once, before resetting the queries", async () => {
    const { result, invalidateSpy } = renderUseCurrentUser();

    act(() => result.current.changeCurrentUser(DemoUserIdEnum.BOB));

    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(1));
    expect(clearApiCacheMock).toHaveBeenCalledTimes(1);
    expect(clearApiCacheMock.mock.invocationCallOrder[0]).toBeLessThan(invalidateSpy.mock.invocationCallOrder[0]);
  });

  it("does not reset any query before the purge has resolved", async () => {
    let finishPurge: () => void = () => undefined;
    clearApiCacheMock.mockReturnValue(new Promise<void>((resolve) => (finishPurge = resolve)));
    const { result, invalidateSpy } = renderUseCurrentUser();

    act(() => result.current.changeCurrentUser(DemoUserIdEnum.BOB));
    await Promise.resolve();

    expect(clearApiCacheMock).toHaveBeenCalledTimes(1);
    expect(result.current.currentUserId).toBe(DemoUserIdEnum.BOB);
    expect(invalidateSpy).not.toHaveBeenCalled();

    await act(async () => finishPurge());

    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(1));
  });

  it("stores the new user before the purge starts", () => {
    let storedAtPurge: string | null = null;
    clearApiCacheMock.mockImplementation(async () => {
      storedAtPurge = window.localStorage.getItem(StorageKeyEnum.CURRENT_USER_ID);
    });
    const { result } = renderUseCurrentUser();

    act(() => result.current.changeCurrentUser(DemoUserIdEnum.BOB));

    expect(clearApiCacheMock).toHaveBeenCalledTimes(1);
    expect(storedAtPurge).toBe("2");
  });
});
