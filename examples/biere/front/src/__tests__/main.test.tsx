import { registerSW as registerSWDouble } from "@/__tests__/utils/pwaRegisterDouble";
import { render, screen } from "@testing-library/react";
import { useInRouterContext } from "react-router";
import type { RegisterServiceWorkerOptions } from "@/types/serviceWorker/registerServiceWorkerOptions";

const { renderMock, createRootMock, registerServiceWorkerMock } = vi.hoisted(() => {
  const render = vi.fn();
  return {
    renderMock: render,
    createRootMock: vi.fn(() => ({ render })),
    registerServiceWorkerMock: vi.fn<(options: RegisterServiceWorkerOptions) => Promise<void>>(async () => undefined),
  };
});

vi.mock("react-dom/client", () => ({ createRoot: createRootMock }));
vi.mock("@/index.css", () => ({}));
vi.mock("@/app", () => ({ App: () => <div data-testid="app-double" /> }));
vi.mock("@/components/modules/offlineBanner/offlineBanner", () => ({
  OfflineBanner: () => <div data-testid="offline-banner-double" data-in-router={String(useInRouterContext())} />,
}));
vi.mock("@/utils/serviceWorker/registerServiceWorker", () => ({ registerServiceWorker: registerServiceWorkerMock }));

const mountRoot = () => {
  const root = document.createElement("div");
  root.id = "root";
  document.body.appendChild(root);
  return root;
};

const getRegistrationOptions = (): RegisterServiceWorkerOptions => registerServiceWorkerMock.mock.calls[0][0];

describe("main", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    Reflect.deleteProperty(window.navigator, "serviceWorker");
  });

  it("mounts the app into the root element", async () => {
    const root = mountRoot();

    await import("@/main");

    expect(createRootMock).toHaveBeenCalledWith(root);
    expect(renderMock).toHaveBeenCalledTimes(1);
  });

  it("does nothing without a root element", async () => {
    await import("@/main");

    expect(createRootMock).not.toHaveBeenCalled();
    expect(registerServiceWorkerMock).not.toHaveBeenCalled();
  });

  it("registers the service worker once, after the render, disabled under test", async () => {
    mountRoot();

    await import("@/main");

    expect(registerServiceWorkerMock).toHaveBeenCalledTimes(1);
    expect(getRegistrationOptions().isEnabled).toBe(false);
    expect(renderMock.mock.invocationCallOrder[0]).toBeLessThan(registerServiceWorkerMock.mock.invocationCallOrder[0]);
  });

  it("enables the registration in production when the browser has service workers", async () => {
    mountRoot();
    vi.stubEnv("PROD", true);
    Object.defineProperty(window.navigator, "serviceWorker", { value: {}, configurable: true });

    await import("@/main");

    expect(getRegistrationOptions().isEnabled).toBe(true);
  });

  it("keeps the registration disabled in production without service worker support", async () => {
    mountRoot();
    vi.stubEnv("PROD", true);

    await import("@/main");

    expect(registerServiceWorkerMock).toHaveBeenCalledTimes(1);
    expect(getRegistrationOptions().isEnabled).toBe(false);
  });

  it("keeps the registration disabled outside production even with service worker support", async () => {
    mountRoot();
    vi.stubEnv("PROD", false);
    Object.defineProperty(window.navigator, "serviceWorker", { value: {}, configurable: true });

    await import("@/main");

    expect(getRegistrationOptions().isEnabled).toBe(false);
  });

  it("hands over a loader that resolves on the register double", async () => {
    mountRoot();

    await import("@/main");
    const { registerSW } = await getRegistrationOptions().loadRegisterSW();

    const updateSW = registerSW();

    expect(registerSW.toString()).toBe(registerSWDouble.toString());
    await expect(updateSW()).resolves.toBeUndefined();
  });

  it("renders the offline banner right after the app inside the router", async () => {
    mountRoot();

    await import("@/main");
    render(renderMock.mock.calls[0][0]);

    const app = screen.getByTestId("app-double");
    const banner = screen.getByTestId("offline-banner-double");
    expect(app.parentElement).toBe(banner.parentElement);
    expect(app.nextElementSibling).toBe(banner);
    expect(banner).toHaveAttribute("data-in-router", "true");
  });
});
