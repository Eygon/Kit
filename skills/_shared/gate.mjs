// Gate ciblee, une commande pour toutes les stacks : `node gate.mjs <fichier de test>...`
// - .ts/.tsx/.js/.jsx : vitest run --coverage=false sur ces fichiers ;
// - .cs : dotnet test du projet de test le plus proche, filtre sur la ou les classes
//   (nom du fichier = nom de la classe, convention du depot).
// Le code de sortie est celui du runner. Banc Miro F8 : le brief d une US back citait la gate
// vitest et le typecheck tsc, que le worker devait ecarter lui-meme.
import { existsSync, readdirSync } from "node:fs";
import { dirname, basename, resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export function planGate(files, exists = existsSync, list = (d) => readdirSync(d)) {
  const js = files.filter((f) => /\.[cm]?[jt]sx?$/.test(f));
  const cs = files.filter((f) => /\.cs$/.test(f));
  const runs = [];
  if (js.length) runs.push({ cmd: "node", args: ["node_modules/vitest/vitest.mjs", "run", "--coverage=false", ...js] });
  const byProject = new Map();
  for (const f of cs) {
    let dir = dirname(resolve(f));
    let proj = null;
    while (dir && dir !== dirname(dir)) {
      const p = exists(dir) ? list(dir).find((n) => n.endsWith(".csproj")) : null;
      if (p) { proj = join(dir, p); break; }
      dir = dirname(dir);
    }
    if (!proj) throw new Error(`aucun .csproj au-dessus de ${f}`);
    if (!byProject.has(proj)) byProject.set(proj, []);
    byProject.get(proj).push(basename(f, ".cs"));
  }
  for (const [proj, classes] of byProject) {
    const filter = classes.map((c) => `FullyQualifiedName~${c}`).join("|");
    runs.push({ cmd: "dotnet", args: ["test", proj, "--nologo", "-v", "q", "--filter", filter] });
  }
  return runs;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error("usage : node gate.mjs <fichier de test>...");
    process.exit(2);
  }
  let code = 0;
  for (const r of planGate(files)) {
    const res = spawnSync(r.cmd, r.args, { stdio: "inherit", shell: process.platform === "win32" });
    if (res.status !== 0) code = res.status ?? 1;
  }
  process.exit(code);
}
