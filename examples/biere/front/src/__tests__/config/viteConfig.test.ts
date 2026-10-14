import path from "node:path";
import { loadConfigFromFile } from "vite";
import type { Plugin, PluginOption, UserConfig } from "vite";

const VITE_CONFIG_PATH = path.resolve(process.cwd(), "vite.config.ts");

const flattenPlugins = (option: PluginOption): Plugin[] => {
  if (Array.isArray(option)) {
    return option.flatMap(flattenPlugins);
  }
  return option && typeof option === "object" && "name" in option ? [option] : [];
};

const loadViteConfig = async (): Promise<UserConfig> => {
  const loaded = await loadConfigFromFile({ command: "build", mode: "production" }, VITE_CONFIG_PATH);
  if (!loaded) {
    throw new Error("vite.config.ts not found");
  }
  return loaded.config;
};

describe("vite config", () => {
  it("registers the vite-plugin-pwa plugins", async () => {
    const config = await loadViteConfig();

    const names = flattenPlugins(config.plugins).map((plugin) => plugin.name);

    expect(names.some((name) => name.startsWith("vite-plugin-pwa"))).toBe(true);
  });

  it("keeps react and tailwind registered next to the pwa plugins", async () => {
    const config = await loadViteConfig();

    const names = flattenPlugins(config.plugins).map((plugin) => plugin.name);

    expect(names.some((name) => name.includes("react"))).toBe(true);
    expect(names.some((name) => name.includes("tailwindcss"))).toBe(true);
  });

  it("keeps the build manifest and the dev server port", async () => {
    const config = await loadViteConfig();

    expect(config.build?.manifest).toBe(true);
    expect(config.server).toEqual({ port: 5173 });
  });
});
