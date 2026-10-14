import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { useOnlineStatus } from "@/components/modules/offlineBanner/hooks/useOnlineStatus";

const setNavigatorOnline = (isOnline: boolean) => vi.spyOn(navigator, "onLine", "get").mockReturnValue(isOnline);

describe("useOnlineStatus", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports online when the browser is online", () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toEqual({ isOnline: true });
  });

  it("turns false on the offline event", () => {
    const { result } = renderHook(() => useOnlineStatus());

    setNavigatorOnline(false);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current).toEqual({ isOnline: false });
  });

  it("turns true again on the online event", () => {
    const { result } = renderHook(() => useOnlineStatus());
    setNavigatorOnline(false);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    setNavigatorOnline(true);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(result.current).toEqual({ isOnline: true });
  });

  it("starts offline when the browser is already offline at mount", () => {
    setNavigatorOnline(false);

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toEqual({ isOnline: false });
  });

  it("removes both listeners on unmount", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useOnlineStatus());
    const addedTypes = addSpy.mock.calls.map(([type]) => type);
    unmount();

    expect(addedTypes).toEqual(expect.arrayContaining(["online", "offline"]));
    ["online", "offline"].forEach((type) => {
      const added = addSpy.mock.calls.find(([addedType]) => addedType === type);
      expect(removeSpy).toHaveBeenCalledWith(type, added?.[1]);
    });
  });

  it("renders true on the server snapshot", () => {
    setNavigatorOnline(false);
    const Probe = () => createElement("span", null, String(useOnlineStatus().isOnline));

    expect(renderToString(createElement(Probe))).toContain("true");
  });
});
