// Writes the skeleton of FEATURE_DIR/recon.md (/sk-prep A.4bis) from the default branch, so the
// prep edits a sourced draft instead of rebuilding it by hand: `ls` of the shared components, the
// LOCALES line and its parity test, the tsconfig aliases, the starting grep-able bans. Every line
// carries its source and every path is read with `git ls-tree` / `git show` on the ref, never in
// the working tree (the local checkout is usually on another branch).
//
// Usage: node recon-seed.mjs [--root <repo>] [--ref origin/<default>] [--out <recon.md>]
//          [--dirs src/components/elements,src/components/widgets] [--force]
// Without --out, prints to stdout. Refuses to overwrite an existing recon.md without --force:
// on a resumed run the file carries the facts of the previous US.
import { writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { defaultBranch, localesOf, parityTestOf, aliasesOf } from "./sk-probe.mjs";

const git = (cwd, ...a) => {
  try {
    return execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 << 20 });
  } catch {
    return null;
  }
};

const DEFAULT_DIRS = ["src/components/elements", "src/components/widgets"];

// Props of a component, read from the destructuring of its signature (works whether the props
// type sits next to the component or in src/types/components).
export const propsOf = (src, name) => {
  const sig = new RegExp(`(?:const\\s+${name}\\s*=\\s*(?:<[^>]*>\\s*)?\\(|function\\s+${name}\\s*(?:<[^>]*>)?\\s*\\()\\s*\\{([^}]*)\\}`, "s");
  const m = src.match(sig);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((p) => p.trim().split(/[=:\s]/)[0].replace(/^\.\.\./, "..."))
    .filter((p) => p && /^[\w.]+$/.test(p));
};

const exportName = (src) => {
  const m = src.match(/export\s+(?:default\s+)?(?:const|function)\s+([A-Z]\w*)/);
  return m ? m[1] : null;
};

export const componentsOn = (root, ref, dirs, files) => {
  const out = [];
  for (const dir of dirs) {
    const folders = [...new Set(files.filter((f) => f.startsWith(dir + "/")).map((f) => f.slice(dir.length + 1).split("/")[0]))];
    for (const folder of folders.sort()) {
      const inside = files.filter((f) => f.startsWith(`${dir}/${folder}/`) && /\.(tsx|jsx)$/.test(f) && !/\.(test|spec|stories)\./.test(f));
      const main = inside.find((f) => f === `${dir}/${folder}/${folder}.tsx`) || inside.find((f) => /\/index\.(tsx|jsx)$/.test(f)) || inside.sort((a, b) => a.split("/").length - b.split("/").length)[0];
      if (!main) continue;
      const src = git(root, "show", `${ref}:${main}`) || "";
      const name = exportName(src) || folder;
      const line = src.split("\n").findIndex((l) => /\bexport\b/.test(l) && l.includes(name)) + 1;
      const props = propsOf(src, name).slice(0, 6);
      const row = `- ${name} — ${main} — props: ${props.length ? props.join(", ") : "aucune lue"} — source: ${main}:${line || 1}`;
      out.push(row.length > 200 ? `- ${name} — props: ${props.join(", ")} — source: ${main}:${line || 1}` : row);
    }
  }
  return out;
};

export const seed = (root, ref, dirs) => {
  const files = (git(root, "ls-tree", "-r", "--name-only", ref) || "").split("\n").filter(Boolean);
  const loc = localesOf(files);
  const parity = loc ? parityTestOf(root, ref, files) : null;
  const aliases = aliasesOf(root);
  const tsLine = (git(root, "show", `${ref}:tsconfig.json`) || "").split("\n").findIndex((l) => l.includes('"paths"')) + 1;
  const comps = componentsOn(root, ref, dirs, files);
  // Interdits et sections propres a une stack : seulement si le depot l a (banc jeu three.js :
  // `<table`, tokens Septeo et alias MySepteoWeb poses sur un depot sans JSX ni lib Septeo).
  const hasJsx = files.some((f) => /\.(tsx|jsx)$/.test(f));
  const hasSepteo = /"@septeo\//.test(git(root, "show", `${ref}:package.json`) || "");
  const modules = hasJsx ? [] : [...new Set(files.filter((f) => /^src\/[^/]+\/[^/]+\.[jt]s$/.test(f) && !f.includes("__tests__")).map((f) => f.split("/")[1]))].sort().map((d) => `- src/${d}/ : ${files.filter((f) => f.startsWith(`src/${d}/`) && !f.includes("__tests__")).map((f) => f.slice(d.length + 5)).join(", ")} — source: git ls-tree ${ref}`);
  const lines = [
    "# Recon de feature",
    "",
    `Squelette genere par recon-seed.mjs sur ${ref} (${(git(root, "rev-parse", "--short", ref) || "").trim()}). La prep garde ce qui sert la spec et ajoute ses faits.`,
    "",
    ...(hasJsx
      ? ["## Composants partages reutilisables", "", ...(comps.length ? comps : [`- aucun composant sous ${dirs.join(", ")} sur ${ref} — source: git ls-tree ${ref}`])]
      : ["## Modules existants", "", ...(modules.length ? modules : [`- aucun module sous src/ sur ${ref}`])]),
    "",
    "## Helpers et hooks de la feature",
    "",
    "## Pieges verifies",
    "",
  ];
  if (loc) {
    lines.push(`- LOCALES : ${loc.dir}/{${loc.langs.join(",")}}.json — chaque cle dans CHAQUE fichier ; parite : ${parity || "aucun test"} — source: git ls-tree ${ref}`);
  }
  if (aliases.length) lines.push(`- ALIAS tsconfig : ${aliases.join(" ; ")} — aucun autre alias n existe — source: tsconfig.json:${tsLine || 1}`);
  lines.push("", "## Recettes de test", "", "## Interdits grep-ables", "");
  if (hasJsx) {
    lines.push("- `<table`");
    lines.push("- `className=.*#[0-9A-Fa-f]{3,6}\\b`");
    lines.push("- `\\[[0-9.]+px\\]`");
  }
  if (hasSepteo) lines.push("- `--bg-page|--fg-|--blueS-|--grey-`");
  const aliasRoots = aliases.map((a) => a.split("->")[0].replace(/\/\*$/, ""));
  if (aliasRoots.length) {
    const ghosts = ["prjTypes", "@api", "@utils", "@prjTypes", "~"].filter((g) => !aliasRoots.includes(g));
    if (ghosts.length) lines.push(`- \`from ["'](${ghosts.join("|")})/\``);
  }
  return lines.join("\n") + "\n";
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (n) => {
    const i = args.indexOf(`--${n}`);
    return i >= 0 ? args[i + 1] : null;
  };
  const root = resolve(opt("root") || ".");
  const ref = opt("ref") || defaultBranch(root);
  if (!ref) {
    console.error("recon-seed : branche par defaut introuvable (--ref origin/<defaut>)");
    process.exit(2);
  }
  const dirs = (opt("dirs") || DEFAULT_DIRS.join(",")).split(",").map((d) => d.trim()).filter(Boolean);
  const text = seed(root, ref, dirs);
  const out = opt("out");
  if (!out) {
    process.stdout.write(text);
    process.exit(0);
  }
  if (existsSync(out) && !args.includes("--force")) {
    console.error(`recon-seed : ${out} existe deja (reprise ?), rien ecrit. --force pour ecraser.`);
    process.exit(3);
  }
  writeFileSync(out, text);
  console.log(`recon-seed : ${out} ecrit (${Buffer.byteLength(text)} octets)`);
}
