import type { RegisterSWOptions } from "vite-plugin-pwa/types";

export type RegisterServiceWorkerOptions = Readonly<{
  isEnabled: boolean;
  loadRegisterSW: () => Promise<{
    registerSW: (options?: RegisterSWOptions) => (reloadPage?: boolean) => Promise<void>;
  }>;
}>;
