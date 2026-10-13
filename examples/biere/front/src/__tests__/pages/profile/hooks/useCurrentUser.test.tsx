import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { useCurrentUser } from "@/pages/profile/hooks/useCurrentUser";
import { StorageKeyEnum } from "@/types/enums/storage/storageKeyEnum";
import { DemoUserIdEnum } from "@/types/enums/user/demoUserIdEnum";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";

const renderUseCurrentUser = () => {
  const queryClient = createTestQueryClient();
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useCurrentUser(), { wrapper }), invalidateSpy };
};

describe("useCurrentUser", () => {
  beforeEach(() => window.localStorage.clear());

  it("starts from the stored user", () => {
    window.localStorage.setItem(StorageKeyEnum.CURRENT_USER_ID, "2");

    const { result } = renderUseCurrentUser();

    expect(result.current.currentUserId).toBe(DemoUserIdEnum.BOB);
  });

  it("persists the new user and refetches every query", () => {
    const { result, invalidateSpy } = renderUseCurrentUser();

    act(() => result.current.changeCurrentUser(DemoUserIdEnum.CAROL));

    expect(result.current.currentUserId).toBe(DemoUserIdEnum.CAROL);
    expect(window.localStorage.getItem(StorageKeyEnum.CURRENT_USER_ID)).toBe("3");
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });
});
