import { act, renderHook } from "@testing-library/react";
import { useGeolocation } from "@/pages/map/hooks/useGeolocation";
import { GeolocationStatusEnum } from "@/pages/map/types/geolocationStatusEnum";

type SuccessCallback = (position: { coords: { latitude: number; longitude: number } }) => void;
type FailureCallback = (error: { code: number }) => void;

const getCurrentPosition = vi.fn<(success: SuccessCallback, failure: FailureCallback, options: PositionOptions) => void>();

const defineGeolocation = (value: unknown) => {
  Object.defineProperty(navigator, "geolocation", { configurable: true, value });
};

describe("useGeolocation", () => {
  beforeEach(() => {
    getCurrentPosition.mockReset();
    defineGeolocation({ getCurrentPosition });
  });

  it("starts idle without a position and asks nothing from the browser", () => {
    const { result } = renderHook(() => useGeolocation());

    expect(result.current.status).toBe(GeolocationStatusEnum.IDLE);
    expect(result.current.position).toBeNull();
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("AC1 locates the user with a ten second timeout and exposes the position", () => {
    getCurrentPosition.mockImplementation((success) => success({ coords: { latitude: 48.85, longitude: 2.35 } }));
    const { result } = renderHook(() => useGeolocation());

    act(() => result.current.locate());

    expect(result.current.status).toBe(GeolocationStatusEnum.LOCATED);
    expect(result.current.position).toEqual({ latitude: 48.85, longitude: 2.35 });
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(getCurrentPosition.mock.calls[0][2]).toEqual({ timeout: 10000 });
  });

  it("does not remember the position once the hook is unmounted and mounted again", () => {
    getCurrentPosition.mockImplementation((success) => success({ coords: { latitude: 48.85, longitude: 2.35 } }));
    const first = renderHook(() => useGeolocation());
    act(() => first.result.current.locate());
    expect(first.result.current.status).toBe(GeolocationStatusEnum.LOCATED);
    first.unmount();

    const second = renderHook(() => useGeolocation());

    expect(second.result.current.position).toBeNull();
    expect(second.result.current.status).toBe(GeolocationStatusEnum.IDLE);
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("AC4 is locating while the request is pending and ignores any other locate, even in the same tick", () => {
    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.locate();
      result.current.locate();
    });

    expect(result.current.status).toBe(GeolocationStatusEnum.LOCATING);
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);

    act(() => result.current.locate());

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("AC4 accepts a new locate once the previous request is over", () => {
    getCurrentPosition.mockImplementation((success) => success({ coords: { latitude: 45.76, longitude: 4.83 } }));
    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.locate());
    getCurrentPosition.mockImplementation((success) => success({ coords: { latitude: 43.3, longitude: 5.37 } }));

    act(() => result.current.locate());

    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe(GeolocationStatusEnum.LOCATED);
    expect(result.current.position).toEqual({ latitude: 43.3, longitude: 5.37 });
  });

  it("AC2 reports a denied permission (code 1) without any position", () => {
    getCurrentPosition.mockImplementation((_success, failure) => failure({ code: 1 }));
    const { result } = renderHook(() => useGeolocation());

    act(() => result.current.locate());

    expect(result.current.status).toBe(GeolocationStatusEnum.DENIED);
    expect(result.current.position).toBeNull();
  });

  it("AC2 lets the user try again after a refusal", () => {
    getCurrentPosition.mockImplementation((_success, failure) => failure({ code: 1 }));
    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.locate());

    act(() => result.current.locate());

    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it.each([2, 3])("AC3 reports an unavailable position for the error code %i", async (code) => {
    getCurrentPosition.mockImplementation((_success, failure) => failure({ code }));
    const { result } = renderHook(() => useGeolocation());

    act(() => result.current.locate());

    expect(result.current.status).toBe(GeolocationStatusEnum.UNAVAILABLE);
    expect(result.current.position).toBeNull();
  });

  it("AC3 reports an unavailable position when the browser has no geolocation", () => {
    defineGeolocation(undefined);
    const { result } = renderHook(() => useGeolocation());

    act(() => result.current.locate());

    expect(result.current.status).toBe(GeolocationStatusEnum.UNAVAILABLE);
    expect(result.current.position).toBeNull();
  });
});
