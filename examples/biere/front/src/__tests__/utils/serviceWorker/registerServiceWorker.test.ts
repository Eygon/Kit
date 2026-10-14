import type { RegisterSWOptions } from "vite-plugin-pwa/types";
import { registerServiceWorker } from "@/utils/serviceWorker/registerServiceWorker";

const { showUpdateAvailableToastMock } = vi.hoisted(() => ({ showUpdateAvailableToastMock: vi.fn(() => "toast-id") }));

vi.mock("@/utils/serviceWorker/showUpdateAvailableToast", () => ({
  showUpdateAvailableToast: showUpdateAvailableToastMock,
}));

const createLoader = () => {
  const updateSW = vi.fn(async () => undefined);
  const registerSW = vi.fn((options?: RegisterSWOptions) => {
    void options;
    return updateSW;
  });
  const loadRegisterSW = vi.fn(async () => ({ registerSW }));
  const getOnNeedRefresh = () => {
    const onNeedRefresh = registerSW.mock.calls[0][0]?.onNeedRefresh;
    if (!onNeedRefresh) {
      throw new Error("onNeedRefresh was not handed to registerSW");
    }
    return onNeedRefresh;
  };
  return { registerSW, loadRegisterSW, updateSW, getOnNeedRefresh };
};

describe("registerServiceWorker", () => {
  beforeEach(() => vi.clearAllMocks());

  it("never loads the register module when disabled", async () => {
    const { registerSW, loadRegisterSW } = createLoader();

    await registerServiceWorker({ isEnabled: false, loadRegisterSW });

    expect(loadRegisterSW).not.toHaveBeenCalled();
    expect(registerSW).not.toHaveBeenCalled();
  });

  it("registers once with immediate when enabled", async () => {
    const { registerSW, loadRegisterSW } = createLoader();

    await registerServiceWorker({ isEnabled: true, loadRegisterSW });

    expect(loadRegisterSW).toHaveBeenCalledTimes(1);
    expect(registerSW).toHaveBeenCalledTimes(1);
    expect(registerSW).toHaveBeenCalledWith({ immediate: true, onNeedRefresh: expect.any(Function) });
  });

  it("swallows a loader that rejects, without any error shown", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const loadRegisterSW = vi.fn(async () => {
      throw new Error("chunk failed to load");
    });

    await expect(registerServiceWorker({ isEnabled: true, loadRegisterSW })).resolves.toBeUndefined();

    expect(loadRegisterSW).toHaveBeenCalledTimes(1);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("swallows a registerSW that throws", async () => {
    const registerSW = vi.fn(() => {
      throw new Error("registration refused");
    });
    const loadRegisterSW = vi.fn(async () => ({ registerSW }));

    await expect(registerServiceWorker({ isEnabled: true, loadRegisterSW })).resolves.toBeUndefined();

    expect(registerSW).toHaveBeenCalledTimes(1);
  });

  it("never updates nor prompts when no new version is reported", async () => {
    const { updateSW, loadRegisterSW } = createLoader();

    await registerServiceWorker({ isEnabled: true, loadRegisterSW });

    expect(updateSW).not.toHaveBeenCalled();
    expect(showUpdateAvailableToastMock).not.toHaveBeenCalled();
  });

  it("shows the update prompt without reloading when a new version is ready", async () => {
    const { updateSW, loadRegisterSW, getOnNeedRefresh } = createLoader();
    await registerServiceWorker({ isEnabled: true, loadRegisterSW });

    getOnNeedRefresh()();

    expect(showUpdateAvailableToastMock).toHaveBeenCalledTimes(1);
    expect(updateSW).not.toHaveBeenCalled();
  });

  it("shows a single prompt, without reloading, when the new version is reported twice, and that prompt activates the latest version once", async () => {
    const { updateSW, loadRegisterSW, getOnNeedRefresh } = createLoader();
    await registerServiceWorker({ isEnabled: true, loadRegisterSW });

    getOnNeedRefresh()();
    getOnNeedRefresh()();

    expect(showUpdateAvailableToastMock).toHaveBeenCalledTimes(1);
    expect(updateSW).not.toHaveBeenCalled();

    const [onRefresh] = showUpdateAvailableToastMock.mock.calls[0] as unknown as [() => void];
    onRefresh();

    expect(updateSW).toHaveBeenCalledTimes(1);
    expect(updateSW).toHaveBeenCalledWith(true);
  });

  it("activates the new version once with a reload when the refresh action is pressed", async () => {
    const { updateSW, loadRegisterSW, getOnNeedRefresh } = createLoader();
    await registerServiceWorker({ isEnabled: true, loadRegisterSW });
    getOnNeedRefresh()();

    const [onRefresh] = showUpdateAvailableToastMock.mock.calls[0] as unknown as [() => void];
    onRefresh();

    expect(updateSW).toHaveBeenCalledTimes(1);
    expect(updateSW).toHaveBeenCalledWith(true);
  });

  it("proposes the prompt again at the next session while the version is still waiting", async () => {
    const first = createLoader();
    await registerServiceWorker({ isEnabled: true, loadRegisterSW: first.loadRegisterSW });
    first.getOnNeedRefresh()();
    const second = createLoader();
    await registerServiceWorker({ isEnabled: true, loadRegisterSW: second.loadRegisterSW });

    second.getOnNeedRefresh()();

    expect(showUpdateAvailableToastMock).toHaveBeenCalledTimes(2);
  });
});
