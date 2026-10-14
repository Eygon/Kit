export type AppIconSpec = {
  readonly fileName: string;
  readonly size: number;
  readonly scale: number;
  readonly background: string | null;
};

export const APP_ICON_SPECS: readonly AppIconSpec[];

export function generateAppIcons(sourcePath: string, outDir: string): Promise<string[]>;
