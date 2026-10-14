export const ENTRY_BUDGET_BYTES: number;
export const INITIAL_JS_BUDGET_BYTES: number;

export type BundleCheckResult = {
  entryFile: string;
  entryBytes: number;
  initialJsBytes: number;
  violations: string[];
};

export function checkBundle(distDir: string): BundleCheckResult;
