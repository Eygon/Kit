import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { BrowserRouter } from "react-router";
import { App } from "@/app";
import { queryClient } from "@/config/queryClient";
import i18n from "@/i18n/i18n";
import "@/index.css";

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </I18nextProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}
