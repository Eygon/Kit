import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { createElement, Suspense } from "react";
import type { ComponentType } from "react";
import { useLazyPageComponent } from "@/components/modules/lazyPage/hooks/useLazyPageComponent";
import type { LazyPageLoader } from "@/types/components/lazyPage";

const createPage = (text: string): ComponentType => () => createElement("p", null, text);

const mountSuspended = (Page: ComponentType, fallbackText: string) =>
  render(createElement(Suspense, { fallback: createElement("p", null, fallbackText) }, createElement(Page)));

const reloadSpy = vi.fn();
const setOnLine = (value: boolean) => Object.defineProperty(window.navigator, "onLine", { value, configurable: true });

beforeEach(() => {
  reloadSpy.mockReset();
  setOnLine(true);
  vi.stubGlobal("location", { ...window.location, reload: reloadSpy });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useLazyPageComponent", () => {
  it("returns the same lazy instance for the same loader across renders", () => {
    const loader: LazyPageLoader = vi.fn(() => Promise.resolve({ default: createPage("page") }));

    const first = renderHook(() => useLazyPageComponent(loader));
    const second = renderHook(() => useLazyPageComponent(loader));
    first.rerender();

    expect(first.result.current.LazyComponent).toBeDefined();
    expect(first.result.current.LazyComponent).toBe(second.result.current.LazyComponent);
  });

  it("returns two different lazy instances for two different loaders", () => {
    const firstLoader: LazyPageLoader = () => Promise.resolve({ default: createPage("first") });
    const secondLoader: LazyPageLoader = () => Promise.resolve({ default: createPage("second") });

    const first = renderHook(() => useLazyPageComponent(firstLoader));
    const second = renderHook(() => useLazyPageComponent(secondLoader));

    expect(first.result.current.LazyComponent).not.toBe(second.result.current.LazyComponent);
  });

  it("calls the loader once and shows the page without waiting when it mounts a second time", async () => {
    const loader = vi.fn<LazyPageLoader>(() => Promise.resolve({ default: createPage("loaded page") }));
    const { LazyComponent } = renderHook(() => useLazyPageComponent(loader)).result.current;

    const firstMount = mountSuspended(LazyComponent, "waiting");
    expect(screen.getByText("waiting")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("loaded page")).toBeInTheDocument());
    firstMount.unmount();
    mountSuspended(LazyComponent, "waiting");

    expect(screen.getByText("loaded page")).toBeInTheDocument();
    expect(screen.queryByText("waiting")).not.toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("evicts a failed loader so a later render asks for the page again", async () => {
    const loader = vi
      .fn<LazyPageLoader>()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ default: createPage("recovered") });
    const failing = renderHook(() => useLazyPageComponent(loader));

    const initial = failing.result.current.LazyComponent;
    mountSuspended(initial, "waiting");
    await waitFor(() => expect(failing.result.current.hasFailed).toBe(true));
    failing.unmount();
    const retried = renderHook(() => useLazyPageComponent(loader)).result.current.LazyComponent;
    mountSuspended(retried, "waiting");

    expect(retried).not.toBe(initial);
    expect(await screen.findByText("recovered")).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(2);
  });
});

describe("useLazyPageComponent failure and retry", () => {
  it("reports the failure, then loads the page again after retry", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const loader = vi
      .fn<LazyPageLoader>()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ default: createPage("after retry") });
    const { result } = renderHook(() => useLazyPageComponent(loader));
    const failing = result.current.LazyComponent;
    expect(result.current.hasFailed).toBe(false);

    mountSuspended(failing, "waiting");
    await waitFor(() => expect(result.current.hasFailed).toBe(true));
    expect(loader).toHaveBeenCalledTimes(1);

    act(() => result.current.retry());

    expect(result.current.hasFailed).toBe(false);
    expect(result.current.LazyComponent).not.toBe(failing);
    mountSuspended(result.current.LazyComponent, "waiting");
    expect(await screen.findByText("after retry")).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(2);
    expect(result.current.hasFailed).toBe(false);
    consoleError.mockRestore();
  });

  it("fails again on a second rejection and still allows a third attempt", async () => {
    setOnLine(false);
    const loader = vi
      .fn<LazyPageLoader>()
      .mockRejectedValueOnce(new Error("first"))
      .mockRejectedValueOnce(new Error("second"))
      .mockResolvedValueOnce({ default: createPage("third time") });
    const { result } = renderHook(() => useLazyPageComponent(loader));

    mountSuspended(result.current.LazyComponent, "waiting");
    await waitFor(() => expect(result.current.hasFailed).toBe(true));
    act(() => result.current.retry());
    mountSuspended(result.current.LazyComponent, "waiting");
    await waitFor(() => expect(result.current.hasFailed).toBe(true));
    expect(loader).toHaveBeenCalledTimes(2);
    act(() => result.current.retry());
    mountSuspended(result.current.LazyComponent, "waiting");

    expect(await screen.findByText("third time")).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(3);
    expect(result.current.hasFailed).toBe(false);
  });

  it("calls the loader again and starts without failure when remounted after a failure", async () => {
    const loader = vi
      .fn<LazyPageLoader>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ default: createPage("back online") });
    const first = renderHook(() => useLazyPageComponent(loader));
    mountSuspended(first.result.current.LazyComponent, "waiting");
    await waitFor(() => expect(first.result.current.hasFailed).toBe(true));
    first.unmount();

    const second = renderHook(() => useLazyPageComponent(loader));
    expect(second.result.current.hasFailed).toBe(false);
    mountSuspended(second.result.current.LazyComponent, "waiting");

    expect(await screen.findByText("back online")).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("ignores a failure of a loader that is no longer the current one", async () => {
    let rejectAbandoned: (error: Error) => void = () => undefined;
    const abandoned: LazyPageLoader = () =>
      new Promise((_, reject) => {
        rejectAbandoned = reject;
      });
    const current: LazyPageLoader = () => Promise.resolve({ default: createPage("current") });
    const { result, rerender } = renderHook(({ loader }) => useLazyPageComponent(loader), {
      initialProps: { loader: abandoned },
    });
    mountSuspended(result.current.LazyComponent, "waiting");

    rerender({ loader: current });
    await act(async () => rejectAbandoned(new Error("late")));

    expect(result.current.hasFailed).toBe(false);
  });
});

describe("useLazyPageComponent retry that fails again (browser keeps the failed import)", () => {
  const failTwice = async () => {
    const loader = vi.fn<LazyPageLoader>().mockRejectedValue(new Error("cached failure"));
    const { result } = renderHook(() => useLazyPageComponent(loader));
    mountSuspended(result.current.LazyComponent, "waiting");
    await waitFor(() => expect(result.current.hasFailed).toBe(true));
    act(() => result.current.retry());
    mountSuspended(result.current.LazyComponent, "waiting");
    return { loader, result };
  };

  it("reloads the whole page when the attempt after Réessayer fails again while online", async () => {
    await failTwice();

    await waitFor(() => expect(reloadSpy).toHaveBeenCalledTimes(1));
  });

  it("does not reload on the first failure", async () => {
    const loader = vi.fn<LazyPageLoader>().mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useLazyPageComponent(loader));
    mountSuspended(result.current.LazyComponent, "waiting");
    await waitFor(() => expect(result.current.hasFailed).toBe(true));

    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("keeps the alert and does not reload while the browser is offline", async () => {
    setOnLine(false);
    const { result } = await failTwice();

    await waitFor(() => expect(result.current.hasFailed).toBe(true));
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});

describe("useLazyPageComponent rejection while unmounted", () => {
  it("calls the loader again and raises no failure when the page is remounted after a rejection that came while it was unmounted", async () => {
    let rejectPending: (error: Error) => void = () => undefined;
    const loader = vi
      .fn<LazyPageLoader>()
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectPending = reject;
          }),
      )
      .mockResolvedValueOnce({ default: createPage("after the tab came back") });
    const first = renderHook(() => useLazyPageComponent(loader));
    const view = mountSuspended(first.result.current.LazyComponent, "waiting");
    expect(loader).toHaveBeenCalledTimes(1);
    view.unmount();
    first.unmount();

    await act(async () => rejectPending(new Error("late failure")));
    const second = renderHook(() => useLazyPageComponent(loader));

    expect(second.result.current.hasFailed).toBe(false);
    mountSuspended(second.result.current.LazyComponent, "waiting");
    expect(await screen.findByText("after the tab came back")).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
