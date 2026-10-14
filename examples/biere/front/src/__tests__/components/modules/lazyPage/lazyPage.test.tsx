import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Component } from "react";
import type { ComponentType, ReactNode } from "react";
import { LazyPage } from "@/components/modules/lazyPage/lazyPage";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import type { LazyPageLoader } from "@/types/components/lazyPage";

const createControlledLoader = () => {
  let resolveLoader: (page: { default: ComponentType }) => void = () => undefined;
  const loader: LazyPageLoader = () =>
    new Promise((resolve) => {
      resolveLoader = resolve;
    });
  return { loader, resolve: (page: { default: ComponentType }) => resolveLoader(page) };
};

describe("LazyPage", () => {
  it("shows the loading status then the loaded page once the loader resolves", async () => {
    const { loader, resolve } = createControlledLoader();
    const LoadedPage = () => <h1>Loaded page</h1>;

    renderWithProviders(<LazyPage loader={loader} />);

    expect(screen.getByRole("status")).toHaveTextContent("Chargement de la page…");
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();

    await act(async () => resolve({ default: LoadedPage }));

    expect(await screen.findByRole("heading", { level: 1, name: "Loaded page" })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });

  it("shows the loaded page without waiting again when the same loader is mounted a second time", async () => {
    const loader: LazyPageLoader = () => Promise.resolve({ default: () => <h1>Visited page</h1> });

    const first = renderWithProviders(<LazyPage loader={loader} />);
    expect(await screen.findByRole("heading", { level: 1, name: "Visited page" })).toBeInTheDocument();
    first.unmount();
    renderWithProviders(<LazyPage loader={loader} />);

    expect(screen.getByRole("heading", { level: 1, name: "Visited page" })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the new page when the loader changes and never the abandoned one afterwards", async () => {
    const abandoned = createControlledLoader();
    const current = createControlledLoader();

    const { rerender } = renderWithProviders(<LazyPage loader={abandoned.loader} />);
    rerender(<LazyPage loader={current.loader} />);
    await act(async () => current.resolve({ default: () => <h1>Current page</h1> }));
    await act(async () => abandoned.resolve({ default: () => <h1>Abandoned page</h1> }));

    expect(await screen.findByRole("heading", { level: 1, name: "Current page" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Abandoned page" })).not.toBeInTheDocument();
  });
});

class RenderCrashCatcher extends Component<{ children: ReactNode }, { hasCrashed: boolean }> {
  state = { hasCrashed: false };

  static getDerivedStateFromError() {
    return { hasCrashed: true };
  }

  render() {
    return this.state.hasCrashed ? <p>render crashed</p> : this.props.children;
  }
}

describe("LazyPage download failure", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it("announces the failure with a retry button when the loader rejects", async () => {
    const loader: LazyPageLoader = () => Promise.reject(new Error("offline"));

    renderWithProviders(<LazyPage loader={loader} />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Impossible de charger la page");
    expect(alert).toHaveTextContent("Vérifiez votre connexion, puis réessayez.");
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the loading status then the page when retry succeeds", async () => {
    const user = userEvent.setup();
    const retried = createControlledLoader();
    const loader = vi
      .fn<LazyPageLoader>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockImplementationOnce(retried.loader);

    renderWithProviders(<LazyPage loader={loader} />);
    await user.click(await screen.findByRole("button", { name: "Réessayer" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Chargement de la page…");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await act(async () => retried.resolve({ default: () => <h1>Recovered page</h1> }));
    expect(await screen.findByRole("heading", { level: 1, name: "Recovered page" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("shows the alert again when retry fails and allows a third attempt", async () => {
    const user = userEvent.setup();
    const loader = vi
      .fn<LazyPageLoader>()
      .mockRejectedValueOnce(new Error("first"))
      .mockRejectedValueOnce(new Error("second"))
      .mockResolvedValueOnce({ default: () => <h1>Third try page</h1> });

    renderWithProviders(<LazyPage loader={loader} />);
    await user.click(await screen.findByRole("button", { name: "Réessayer" }));
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    await user.click(await screen.findByRole("button", { name: "Réessayer" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Third try page" })).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(3);
  });

  it("asks for the page again when the page is mounted a second time after a failure", async () => {
    const loader = vi
      .fn<LazyPageLoader>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ default: () => <h1>Second visit page</h1> });

    const first = renderWithProviders(<LazyPage loader={loader} />);
    await screen.findByRole("alert");
    first.unmount();
    renderWithProviders(<LazyPage loader={loader} />);

    expect(await screen.findByRole("heading", { level: 1, name: "Second visit page" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("asks for the page again on a new visit when the download failed after the page was left", async () => {
    let rejectFirstDownload: (error: Error) => void = () => undefined;
    const loader = vi
      .fn<LazyPageLoader>()
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectFirstDownload = reject;
          }),
      )
      .mockResolvedValueOnce({ default: () => <h1>Revisited page</h1> });

    const left = renderWithProviders(<LazyPage loader={loader} />);
    left.unmount();
    await act(async () => rejectFirstDownload(new Error("late offline")));
    renderWithProviders(<LazyPage loader={loader} />);

    expect(await screen.findByRole("heading", { level: 1, name: "Revisited page" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("keeps the alert and does not call the loader again until retry is pressed", async () => {
    const loader = vi
      .fn<LazyPageLoader>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ default: () => <h1>Online page</h1> });

    renderWithProviders(<LazyPage loader={loader} />);
    await screen.findByRole("alert");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("lets a render error of the loaded page surface without the download alert", async () => {
    const CrashingPage = () => {
      throw new Error("render boom");
    };
    const loader: LazyPageLoader = () => Promise.resolve({ default: CrashingPage });

    renderWithProviders(
      <RenderCrashCatcher>
        <LazyPage loader={loader} />
      </RenderCrashCatcher>,
    );

    expect(await screen.findByText("render crashed")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
