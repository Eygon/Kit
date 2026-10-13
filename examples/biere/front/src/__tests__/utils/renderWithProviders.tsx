import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router";
import i18n from "@/i18n/i18n";

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

type ProvidersOptions = Readonly<{
  initialPath?: string;
  queryClient?: QueryClient;
}>;

export const renderWithProviders = (
  ui: ReactElement,
  { initialPath = "/", queryClient = createTestQueryClient(), ...options }: ProvidersOptions & Omit<RenderOptions, "wrapper"> = {},
) => {
  const AllProviders = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
  return render(ui, { wrapper: AllProviders, ...options });
};
