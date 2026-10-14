import { toast } from "@heroui/react";
import type { Mock } from "vitest";
import { showUpdateAvailableToast } from "@/utils/serviceWorker/showUpdateAvailableToast";

vi.mock("@heroui/react", () => ({ toast: vi.fn() }));

const toastMock = toast as unknown as Mock;

describe("showUpdateAvailableToast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastMock.mockReturnValue("toast-id-1");
  });

  it("shows the persistent new version message with the refresh action", () => {
    showUpdateAvailableToast(vi.fn());

    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith(
      "Nouvelle version disponible",
      expect.objectContaining({
        timeout: 0,
        actionProps: expect.objectContaining({ children: "Actualiser", variant: "primary", size: "lg" }),
      }),
    );
  });

  it("calls onRefresh once when the action is pressed and not before", () => {
    const onRefresh = vi.fn();

    showUpdateAvailableToast(onRefresh);

    expect(onRefresh).not.toHaveBeenCalled();
    const { actionProps } = toastMock.mock.calls[0][1] as { actionProps: { onPress: () => void } };
    actionProps.onPress();
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("returns the id of the toast", () => {
    expect(showUpdateAvailableToast(vi.fn())).toBe("toast-id-1");
  });
});
