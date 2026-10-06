import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, basename, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);
const BOM = String.fromCharCode(65279);

const MAX_PROD_FILES_PER_STORY = 6;
const MAX_TASKS_PER_STORY = 6;
// Compagnons compris (« Create `hook.ts` and its key factory `keys.ts` ») : plafond dur.
const MAX_FILES_WITH_COMPANIONS = 8;
// Aligne sur sk-prep A.1 point 3 (2026-09-08) : « autant que le besoin l exige,
// typiquement 3-5, jusqu a une dizaine si les US traversent plusieurs groupes ».
// Le cap dur a 5 sortait un MEDIUM sur un trio L legitime (7 ancres, 2 US, 2 roots).
const STANDARDS_CAP = { min: 2, max: 10 };
const REQUIRED = ["spec.md", "plan.md", "tasks.md"];
const CONDITIONAL = ["research.md", "data-model.md", "quickstart.md"];
const EMPTY_MARKERS = /\b(aucune?|none|n\/a|non applicable|sans objet|rien)\b/i;

const TASK_LINE = /^\s*-\s*\[([ Xx])\]\s*(.+)$/;
// T085b, T085c : la prep insere des taches entre deux numeros. Sans le suffixe,
// ces lignes sortaient en task-without-id et leurs findings n avaient pas d id.
const TASK_ID = /\bT(\d{2,4})[a-z]?\b/;
const STORY_LABEL = /\[(US\d+)\]/;
const PATH_TOKEN = /[\w./\\@-]+\.(?:tsx?|jsx?|cs|csproj|json|ya?ml|s?css|md|sql)\b/g;
// `Design: design.md#C1` ou `Design: design.md#C1, #C2, C3` (plusieurs ancres sur une ligne).
const DESIGN_ANCHOR = /Design:\s*`?design\.md#(C\d+(?:\s*,\s*#?C\d+)*)/g;
// Pas de backtick dans les refs : `Legacy: doc.md#F15,R13` entre backticks capturait
// « R13` » et sortait legacy-ref-unknown sur une regle presente (916 : 13 faux HIGH).
// Un backtick optionnel apres les deux-points : la 913 ecrit `Legacy: \`docs/x.md#F3\``.
const LEGACY_ANCHOR = /Legacy:\s*`?([^\s#`]+)#([^\s,`]+(?:,[^\s,`]+)*)/g;
const CODE_ANCHOR = /Code:\s*`?([^\s#`]+)#(E\d+)/g;
// `### C1` autant que `## C1` : un design.md range ses ancres sous « ## 4. Composants »
// (916 : 38 faux design-anchor-dangling).
const DESIGN_SECTION = /^#{2,4}\s+(C\d+)\b/gm;
const STANDARDS_REF = /@agent-os\/standards\/[\w./-]+/g;
const CEREMONY = [
  { rx: /\b(lire|relire|consulter)\s+(les\s+)?standards\b/i, what: "lecture des standards" },
  { rx: /\bbaseline\b/i, what: "baseline" },
  { rx: /\brituel\s+RED\b/i, what: "rituel RED" },
  { rx: /\brevue\s+(de\s+)?(la\s+)?diff\b/i, what: "revue de diff" },
  { rx: /\bvalidation\s+manuelle\b/i, what: "validation manuelle" },
  { rx: /\bv[ée]rifier\s+le\s+design\b/i, what: "verification du design" },
];

// Faits verifies de plan.md : chaque chemin cite doit exister, et une ligne
// citee doit porter le symbole annonce. C est la mesure de la recon — la seule
// qui permette de comparer deux modeles d exploration (Sonnet / Haiku) sur
// autre chose qu une impression. Sur la spec 902, un chemin backend inexistant
// dans les Faits verifies a coute 17 min au worker.
const FACTS_HEADING = /^##\s+(?:Verified facts|Faits v[ée]rifi[ée]s)\b.*$/im;
const LINE_REF = /\b(?:lines?|l\.|ligne[s]?)\s*(\d+)(?:\s*[-–]\s*(\d+))?/i;
const CODE_SPAN = /`([A-Za-z_$][\w$]*)`/;
const CREATE_HINT = /\b(create|add|new|cr[ée]e|ajoute|nouveau)\b/i;

// Montage. Neuf recidives (016 x3, 015 x2, 018, 913, 916 US19 et US21) : un
// composant, un hook ou un service cree, teste, coche, et monte par personne.
// La tache qui cree dit ou le code est monte ; `(US<n>)` confie le montage a
// une autre US, qui doit alors porter une tache sur ce fichier.
const MOUNT_NOTE = /(?:Mont[ée]e?s?\s+dans|Mounted\s+in)\s*:\s*`?([\w./@-]+\.(?:tsx?|jsx?))`?(?:\s*\((US\d+)\))?/gi;
const CREATE_LEAD = /^(?:cr[ée]er|create)\b/i;
// « Implementer le composant X », « Ecrire le hook Y » creent aussi : revue du
// 2026-09-23, 6 taches orphelines sur 7 passaient muettes. Un chemin deja present sur
// la ref est une modification, pas une creation.
const CREATE_WEAK_LEAD = /^(?:impl[ée]menter|implement|[ée]crire|write|ajouter|add|extraire|extract)\b/i;
// « sur le modele de `x.tsx` » cite un fichier existant a imiter, jamais une creation
// (915 T020 : le modele advancedFolderSearch/…/useGridColumns.tsx sortait « cree »).
const MODEL_REF = /(?:sur\s+le\s+mod[eè]le\s+d[e'’]\s*|on\s+the\s+model\s+of\s+|sur\s+le\s+pr[ée]c[ée]dent\s+d[e'’]\s*|d['’]apr[eè]s\s+|[àa]\s+l['’]image\s+d[e'’]\s*|mirroring\s+(?:the\s+)?(?:existing\s+)?)`[^`]+`/gi;
const CREATE_IN = /(?:[àa]\s+cr[ée]er|to\s+(?:be\s+)?created?)\s+(?:dans|in)\s+`?([\w./@-]+\.(?:tsx?|jsx?))`?/gi;
const WIRE_LEAD = /^(?:brancher|c[âa]bler|monter|raccorder|int[ée]grer|connecter|wire|mount|plug|hook\s+up)\b/i;
const MOUNT_EXCLUDED = /(^|\/)(?:routes?|types?|models?|dtos?|mappers?|constants?|columns|utils|configs?|i18n|translate|__mocks__)\//i;
const NON_MOUNTABLE_FILE = /(?:Dto|Mapper|Model|Types?|Schema|Constants?)\.(?:ts|tsx)$/;
const leadOf = (body) => body.replace(/^T\d{2,4}[a-z]?\b\s*/i, "").replace(/^(?:\[[^\]]*\]\s*)+/, "");
// Exporte : mount-check.mjs classe les fichiers avec la meme regle.
export const mountKind = (p) => {
  if (!isProdPath(p)) return null;
  // Code applicatif seulement : pas un `.storybook/preview.tsx` ni un fichier de config.
  if (!/(^|\/)src\//.test(p) || /(^|\/)\.[\w-]+\//.test(p)) return null;
  if (/(^|\/)use[A-Z]\w*\.(?:ts|tsx|js|jsx)$/.test(p)) return "hook";
  if (MOUNT_EXCLUDED.test(p) || NON_MOUNTABLE_FILE.test(p)) return null;
  if (/(^|\/)(?:api|services?)\//i.test(p) || /Service\.(?:ts|tsx|js)$/.test(p)) return "service";
  if (/\.(?:tsx|jsx)$/.test(p) && !/(^|\/)index\.(?:tsx|jsx)$/.test(p)) return "component";
  return null;
};

const RECON_MAX_BYTES = 10 * 1024;
const RECON_MAX_LINE = 200;
// Chemins cites par recon.md : fichiers ET dossiers (un composant se cite par
// son dossier). Spec 916 US16 : recon.md decrivait un composant supprime par un
// commit deja merge dans dev ; le worker l a constate et a du s arreter.
const RECON_PATH = /(?<![\w./-])((?:src|api|app|lib|tests?|public|scripts)\/[\w./@{},-]*[\w}])/g;

// Lib UI du projet : ses d.ts et son css disent quels props et quels tokens
// existent vraiment. Spec 916 : design.md prescrivait `--font-display` (la lib
// definit `--font-family-display`) et `Button kind="primary" size="s"` (la lib
// a `variant` et `size: "sm" | "md" | "lg"`) ; les deux sont remontes du worker.
const LIB_SCOPES = ["@septeo"];
const HTML_ATTRS = new Set([
  "className", "style", "id", "title", "role", "tabIndex", "type", "name", "value",
  "disabled", "form", "autoFocus", "hidden", "lang", "dir", "draggable", "placeholder",
  "readOnly", "required", "checked", "defaultValue", "defaultChecked", "href", "target",
  "rel", "children", "key", "ref", "htmlFor", "alt", "src", "width", "height", "min",
  "max", "step", "maxLength", "minLength", "pattern", "autoComplete", "multiple",
  "accept", "rows", "cols", "wrap", "spellCheck", "contentEditable", "slot",
]);
const HTML_BASE = /\b(?:\w*HTMLAttributes|HTMLProps|ComponentProps\w*|SVGProps|SVGAttributes|AriaAttributes|DOMAttributes)\b/;

const findRepoRoot = (start) => {
  let dir = resolve(start);
  for (let i = 0; i < 12; i += 1) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
};

const linkedBackendRoot = (repoRoot) => {
  try {
    const cfg = JSON.parse(read(join(repoRoot, ".sk", "repos.json")) || "{}");
    return typeof cfg.backend === "string" && existsSync(cfg.backend) ? cfg.backend : null;
  } catch {
    return null;
  }
};

const sectionAfter = (text, headingRx) => {
  const m = text.match(headingRx);
  if (!m) return null;
  const rest = text.slice(m.index + m[0].length);
  const next = rest.search(/^##\s+/m);
  return next === -1 ? rest : rest.slice(0, next);
};

const git = (root, args, maxBuffer = 16 * 1024 * 1024) => {
  try {
    return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", maxBuffer, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
};

// La branche d integration, pas le working tree : un depot local est presque
// toujours checkoute sur autre chose (sk-prep, SECOND DEPOT).
const defaultRef = (root) => {
  const head = git(root, ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"]);
  if (head && head.trim()) return head.trim();
  for (const r of ["origin/dev", "origin/main", "origin/master"]) if (git(root, ["rev-parse", "--verify", "--quiet", r])) return r;
  return git(root, ["rev-parse", "--verify", "--quiet", "HEAD"]) ? "HEAD" : null;
};

const gitTree = (root, ref) => {
  if (!root || !ref) return null;
  const out = git(root, ["ls-tree", "-r", "-z", "--name-only", ref], 64 * 1024 * 1024);
  if (out === null) return null;
  const files = new Set(out.split("\0").filter(Boolean));
  const dirs = new Set();
  for (const f of files) {
    let i = f.lastIndexOf("/");
    while (i > 0) {
      const d = f.slice(0, i);
      if (dirs.has(d)) break;
      dirs.add(d);
      i = d.lastIndexOf("/");
    }
  }
  const norm = (p) => p.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
  return {
    ref,
    files,
    has: (p) => files.has(norm(p)) || dirs.has(norm(p)),
    show: (p) => git(root, ["show", `${ref}:${norm(p)}`]),
  };
};

const expandBraces = (p) => {
  const m = p.match(/^(.*?)\{([^{}]*)\}(.*)$/);
  if (!m) return [p];
  return m[2].split(",").flatMap((alt) => expandBraces(`${m[1]}${alt.trim()}${m[3]}`));
};

// Decoupe au niveau 0 (hors <>, (), {}, [] et chaines) : `A<B | C> | "x"`.
const splitTopLevel = (text, sep) => {
  const out = [];
  let depth = 0;
  let quote = null;
  let cur = "";
  for (const ch of text) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "\"" || ch === "'" || ch === "`") quote = ch;
    else if ("<({[".includes(ch)) depth += 1;
    else if (">)}]".includes(ch) && !(ch === ">" && cur.endsWith("="))) depth -= 1;
    if (ch === sep && depth === 0) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
};

// Texte d une declaration jusqu au `;` (ou a l accolade fermante) de niveau 0.
const readDeclaration = (text, start) => {
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if ("<({[".includes(ch)) depth += 1;
    else if (">)}]".includes(ch) && !(ch === ">" && text[i - 1] === "=")) {
      depth -= 1;
      if (depth === 0 && ch === "}" && text[start] === "{") return text.slice(start, i + 1);
    } else if (ch === ";" && depth === 0) return text.slice(start, i);
  }
  return text.slice(start);
};

const objectMembers = (body) => {
  let flat = body.trim().replace(/^\{/, "").replace(/\}$/, "");
  // Remplacement par un mot, pas par `{}` : `{}` rematche et la boucle ne finit pas.
  while (/\{[^{}]*\}/.test(flat)) flat = flat.replace(/\{[^{}]*\}/g, "OBJECT");
  const members = new Map();
  for (const raw of flat.split(/;|\n/)) {
    const prop = raw.match(/^\s*(?:readonly\s+)?["']?([A-Za-z_$][\w$-]*)["']?\??\s*:\s*([\s\S]+?)\s*$/);
    const method = raw.match(/^\s*([A-Za-z_$][\w$]*)\??\s*\(/);
    if (prop) members.set(prop[1], prop[2]);
    else if (method) members.set(method[1], "function");
  }
  return members;
};

const buildLibIndex = (repoRoot) => {
  const dts = [];
  const css = [];
  for (const scope of LIB_SCOPES) {
    const base = join(repoRoot, "node_modules", scope);
    let pkgs;
    try {
      pkgs = readdirSync(base);
    } catch {
      continue;
    }
    for (const pkg of pkgs) {
      for (const f of listFiles(join(base, pkg, "dist"))) {
        if (f.endsWith(".d.ts")) dts.push(f);
        else if (f.endsWith(".css")) css.push(f);
      }
    }
  }
  if (!dts.length && !css.length) return null;
  const props = new Map();
  const types = new Map();
  for (const f of dts) {
    const text = read(f) || "";
    for (const m of matchAll(text, /export\s+(?:declare\s+)?interface\s+(\w+)(?:<[^>{]*>)?\s*(?:extends\s+([^{]+))?\{/g)) {
      const body = readDeclaration(text, m.index + m[0].length - 1);
      props.set(m[1], { members: objectMembers(body), bases: (m[2] || "").trim() });
    }
    for (const m of matchAll(text, /export\s+(?:declare\s+)?type\s+(\w+)(?:<[^>=]*>)?\s*=\s*/g)) {
      const rhs = readDeclaration(text, m.index + m[0].length).trim();
      types.set(m[1], rhs);
      if (!m[1].endsWith("Props")) continue;
      const parts = splitTopLevel(rhs, "&").map((s) => s.trim());
      const members = new Map();
      parts.filter((p) => p.startsWith("{")).forEach((p) => objectMembers(p).forEach((v, k) => members.set(k, v)));
      props.set(m[1], { members, bases: parts.filter((p) => !p.startsWith("{")).join(", ") });
    }
  }
  return { props, types, css };
};

// Props connus d un composant de la lib ; open = une base n a pas pu etre
// resolue (type externe) : un prop inconnu n y prouve rien.
const resolveProps = (lib, name, seen = new Set()) => {
  const entry = lib.props.get(name);
  if (!entry || seen.has(name)) return null;
  seen.add(name);
  const members = new Map(entry.members);
  let html = HTML_BASE.test(entry.bases);
  let open = false;
  for (const base of matchAll(entry.bases.replace(new RegExp(HTML_BASE.source, "g"), ""), /\b([A-Z]\w*)\b/g).map((b) => b[1])) {
    if (["Omit", "Pick", "Partial", "Required", "Readonly", "HTMLElement", "HTMLButtonElement", "HTMLDivElement", "HTMLInputElement"].includes(base) || /^HTML\w*Element$/.test(base)) continue;
    const sub = resolveProps(lib, base, seen);
    if (!sub) {
      open = true;
      continue;
    }
    sub.members.forEach((v, k) => members.set(k, v));
    html = html || sub.html;
    open = open || sub.open;
  }
  return { members, html, open };
};

const literalValues = (lib, typeText, depth = 0) => {
  if (depth > 6 || !typeText) return null;
  const out = new Set();
  for (const part of splitTopLevel(typeText.trim(), "|").map((s) => s.trim()).filter(Boolean)) {
    if (/^(?:undefined|null)$/.test(part)) continue;
    const lit = part.match(/^["']([^"']*)["']$/);
    if (lit) {
      out.add(lit[1]);
      continue;
    }
    if (/^[A-Z]\w*$/.test(part) && lib.types.has(part)) {
      const sub = literalValues(lib, lib.types.get(part), depth + 1);
      if (!sub) return null;
      sub.forEach((v) => out.add(v));
      continue;
    }
    return null;
  }
  return out.size ? out : null;
};

// Definitions de custom properties : css du depot (lu sur la ref), theme
// Tailwind installe, css de la lib. Un token absent des trois n existe pas.
const collectCssDefs = (repoRoot, tree, lib) => {
  const defs = new Set();
  const addFrom = (text) => matchAll(text || "", /(--[A-Za-z][\w-]*)\s*:/g).forEach((m) => defs.add(m[1]));
  if (tree) [...tree.files].filter((f) => f.endsWith(".css")).slice(0, 200).forEach((f) => addFrom(tree.show(f)));
  else listFiles(join(repoRoot, "src")).filter((f) => f.endsWith(".css")).forEach((f) => addFrom(read(f)));
  const tailwindTheme = join(repoRoot, "node_modules", "tailwindcss", "theme.css");
  if (existsSync(tailwindTheme)) addFrom(read(tailwindTheme));
  (lib ? lib.css : []).forEach((f) => addFrom(read(f)));
  return defs;
};

const designSections = (text) => {
  const parts = [];
  const rx = /^##\s+(.*)$/gm;
  const heads = matchAll(text, rx);
  heads.forEach((h, i) => {
    const end = i + 1 < heads.length ? heads[i + 1].index : text.length;
    parts.push({ title: h[1].trim(), start: h.index, text: text.slice(h.index, end) });
  });
  return parts;
};

// Lignes de tableau markdown, avec la position de debut de ligne dans `text`.
const tableRows = (text) => {
  const rows = [];
  let pos = 0;
  for (const l of text.split(LF)) {
    if (/^\s*\|/.test(l) && !/^\s*\|[\s:|-]+\|\s*$/.test(l))
      rows.push({ pos, cells: splitTopLevel(l.trim().replace(/^\|/, "").replace(/\|$/, ""), "|").map((c) => c.trim()) });
    pos += l.length + 1;
  }
  return rows;
};

const lineOf = (text, index) => text.slice(0, index).split(LF).length;

// `.sql` : les vues SQL du backend (MySepteo.Api.DAL/Views/) ne sont pas de l UI ;
// sans elles, `Views/` sortait un story-mixes-api-and-ui faux sur une US backend.
const BACKEND_HINT = /\.(?:cs|csproj|sql)$|^api[\/\\]|(^|[\/\\])(?:Controllers|Repositories|EntityTypeConfigurations|Migrations)[\/\\]/;
const UI_HINT = /(^|[\/\\])(pages|components|views|widgets)[\/\\]|\.tsx$/i;
const isUiPath = (p) => UI_HINT.test(p) && !BACKEND_HINT.test(p);
// Une ancre Design ne se reclame qu a un composant visuel : un hook ou un util range
// sous pages/ n a rien a rendre au pixel (916 : 9 faux HIGH sur des hooks).
const isVisualPath = (p) => isUiPath(p) && /\.(?:tsx|jsx)$/.test(p) && !/(^|[\/\\])use[A-Z]\w*\.(?:tsx|jsx)$/.test(p);

const read = (p) => {
  try {
    const text = readFileSync(p, "utf8").split(CR + LF).join(LF);
    return text.startsWith(BOM) ? text.slice(1) : text;
  } catch {
    return null;
  }
};

const listFiles = (dir) => {
  const out = [];
  const walk = (d) => {
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(p);
    }
  };
  walk(dir);
  return out;
};

const matchAll = (text, rx) => {
  const out = [];
  rx.lastIndex = 0;
  let m;
  while ((m = rx.exec(text)) !== null) out.push(m);
  return out;
};

const normPath = (p) => p.replace(/\\/g, "/").replace(/^\.\//, "");

export const parseTasks = (text) => {
  const tasks = [];
  const lines = text.split("\n");
  let phase = null;
  // `## [US14] Titre` puis des lignes sans label : l US vient du titre. Sans
  // cet heritage, un tasks.md ecrit ainsi (916) comptait 0 US et aucune regle
  // par US ne tournait.
  let headingStory = null;
  lines.forEach((raw, i) => {
    const phaseMatch = raw.match(/^##+\s+(.*)$/);
    if (phaseMatch) {
      phase = phaseMatch[1].trim();
      const s = phase.match(STORY_LABEL);
      headingStory = s ? s[1] : null;
    }
    const m = raw.match(TASK_LINE);
    if (!m) return;
    const body = m[2];
    const story = body.match(STORY_LABEL);
    const id = body.match(TASK_ID);
    const mounts = matchAll(body, MOUNT_NOTE).map((x) => ({ target: normPath(x[1]), owner: x[2] ? x[2].toUpperCase() : null, raw: x[0] }));
    // Un montage confie a une autre US ne fait pas partie des chemins de celle-ci.
    let own = body;
    for (const mt of mounts) if (mt.owner) own = own.split(mt.raw).join(" ");
    const paths = [...new Set(matchAll(own, PATH_TOKEN).map((x) => normPath(x[0])))];
    // Files cited ONLY in a `Code:` segment are reused, not edited: they do not count in the
    // prod-file cap of the story (a utility the task calls is not a file the US touches).
    const codeSeg = matchAll(own, /(?:Code|Eviter|Avoid):\s*([^—]*)/g).map((x) => x[1]).join(" ");
    const rest = own.replace(/(?:Code|Eviter|Avoid):\s*[^—]*/g, " ");
    const reusedOnly = new Set(matchAll(codeSeg, PATH_TOKEN).map((x) => normPath(x[0])).filter((p) => !matchAll(rest, PATH_TOKEN).some((y) => normPath(y[0]) === p)));
    // Compagnons : fichiers annonces « and its <x> `p` » / « et son|sa|ses <x> `p` » dans la tache
    // de leur consommateur (cle de requete, props, type). sk-prep les range la ; ils ne comptent
    // pas dans le plafond de fichiers (banc : 8 fichiers dont 2 key factories, livres en 2 min 24).
    const companions = new Set(
      matchAll(rest, /(?:\band (?:its|their)\b|\bet (?:son|sa|ses|leur|leurs)\b)([^—(]*)/gi).flatMap((x) => matchAll(x[1], PATH_TOKEN).map((y) => normPath(y[0]))),
    );
    const lead = leadOf(body);
    const created = new Set(matchAll(body, CREATE_IN).map((x) => normPath(x[1])));
    const strong = CREATE_LEAD.test(lead);
    if (strong) {
      // Un nom de fichier nu (`offersValidationGrid.tsx:31`) est une reference, pas la cible.
      const first = matchAll(lead.replace(MODEL_REF, " "), PATH_TOKEN).map((x) => normPath(x[0])).find((p) => isProdPath(p) && p.includes("/"));
      if (first) created.add(first);
    }
    // Chemins prod que la tache pourrait creer ; la decision se prend dans lintSpec, qui
    // connait l arbre de la ref (un fichier present la-bas est modifie, pas cree).
    const mountTargets = new Set(mounts.map((mt) => mt.target));
    const candidates = [...new Set(matchAll(own.replace(MODEL_REF, " "), PATH_TOKEN).map((x) => normPath(x[0])))].filter((p) => isProdPath(p) && p.includes("/") && !mountTargets.has(p));
    // Tache dont le sujet est un test (« Ajouter un it a `x.test.ts` ») : elle n a pas de prod.
    const testSubject = matchAll(own.replace(/`?Test:\s*[^`\n]*`?/g, " "), PATH_TOKEN).some((x) => isTestPath(x[0]));
    tasks.push({
      line: i + 1,
      checked: m[1].toLowerCase() === "x",
      body,
      phase,
      story: story ? story[1] : headingStory,
      id: id ? id[0] : null,
      parallel: /\[P\]/.test(body),
      paths,
      reusedOnly,
      companions,
      mounts,
      created: [...created],
      createLead: strong ? "strong" : CREATE_WEAK_LEAD.test(lead) ? "weak" : null,
      candidates,
      testSubject,
      wire: WIRE_LEAD.test(lead),
    });
  });
  return tasks;
};

const isTestPath = (p) => /(^|[\/\\])(__tests__|tests?)[\/\\]|\.(test|spec)\.[jt]sx?$|Tests?\.cs$/i.test(p);
// La documentation n est pas du code de production : spec.md, plan.md et les
// ancres @agent-os/standards/*.md citees dans les corps de taches comptaient
// comme fichiers prod (6 annonces pour 2 reels, d ou un HIGH et un MEDIUM faux).
// contracts/ and specs/ are FEATURE_DIR artefacts, not prod code (v0 M run: contracts/x.yaml counted
// as a prod file of both stories and flagged path-missing in the verified facts).
const isDocPath = (p) => /\.md$/i.test(p) || /^(?:\.\/)?(?:contracts|specs)\//.test(p);
const isProdPath = (p) => !isTestPath(p) && !isDocPath(p);
// Fichiers « type pur » : crees dans la tache de leur consommateur (sk-prep A.2), ils ne comptent
// pas dans le cap de fichiers d une US. Sans eux, une US .NET en couches (interface de service et
// de repository, DTO, entite, config EF) depassait le cap a chaque fois : 5 HIGH sur 5 US au banc L.
const PURE_TYPE_FILE = /(?:^|\/)(?:Interfaces\/I[A-Z]\w*\.cs|[\w]*(?:Dto|Enum|Configuration)\.cs|Entities\/\w+\.cs|Enums\/\w+\.cs)$|(?:^|\/)(?:types|dtos|models)\/.*\.ts$|(?:Props|Dto|Model|Types?|Enum)\.ts$/;
const LOCALE_FILE = /(?:^|\/)(?:locales|i18n|translations|lang)(?:\/[\w-]+)*\/[a-z]{2}(?:[-_][A-Za-z]{2})?\.json$/;

// _meta.alwaysInject of agent-os/standards/index.yml: injected on every run, outside the cap
// (sk-prep A.3). Counting them sent a MEDIUM standards-over-cap on a 1-US trio with 6 real anchors.
const alwaysInjected = (dir) => {
  for (let d = resolve(dir); ; d = dirname(d)) {
    const idx = join(d, "agent-os", "standards", "index.yml");
    if (existsSync(idx)) {
      const m = (read(idx) || "").match(/alwaysInject:\s*\n((?:[ \t]+-[ \t]+.+\n?)+)/);
      return new Set(m ? matchAll(m[1], /-\s+(\S+)/g).map((x) => "@agent-os/standards/" + x[1].replace(/\.md$/, "")) : []);
    }
    if (dirname(d) === d) return new Set();
  }
};

const parseParallelYml = (text) => {
  const after = text.match(/^\s*after:\s*(\S+)/m);
  const contract = text.match(/^\s*contract:\s*(\S+)/m);
  const block = text.split(/^\s*parallel:\s*$/m)[1];
  // `- US2` (une US) ou `- [US1, US2]` (chaine sequentielle d un meme depot).
  const items = block ? matchAll(block, /^\s*-\s*(\[[^\]]*\]|US\d+)/gm).map((m) => matchAll(m[1], /US\d+/g).map((x) => x[0])) : [];
  const ids = items.flat();
  return {
    items,
    after: after ? (after[1] === "null" ? null : after[1]) : undefined,
    contract: contract ? contract[1] : null,
    parallel: ids,
  };
};

const collectContractFields = (dir) => {
  const contractsDir = join(dir, "contracts");
  if (!existsSync(contractsDir)) return { files: [], fields: [], unparsable: [] };
  const files = listFiles(contractsDir);
  const fields = new Set();
  const unparsable = [];
  for (const f of files) {
    const text = read(f);
    if (!text) continue;
    if (extname(f) === ".json") {
      const walk = (node) => {
        if (Array.isArray(node)) return node.forEach(walk);
        if (node && typeof node === "object") {
          for (const [k, v] of Object.entries(node)) {
            fields.add(k);
            walk(v);
          }
        }
      };
      try {
        walk(JSON.parse(text));
      } catch {
        unparsable.push(f);
      }
    } else {
      matchAll(text, /^\s*([A-Za-z_][\w-]{2,})\s*:/gm).forEach((m) => fields.add(m[1]));
    }
  }
  const noise = new Set([
    "openapi", "swagger", "info", "title", "version", "paths", "components",
    "schemas", "properties", "type", "required", "description", "responses",
    "content", "application", "get", "post", "put", "delete", "patch",
    "parameters", "in", "name", "items", "format", "tags", "summary",
    "operationId", "requestBody", "servers", "url", "schema", "example",
    "Content-Type", "Accept", "Authorization", "headers", "security",
  ]);
  return { files, fields: [...fields].filter((f) => !noise.has(f)), unparsable };
};

export const lintSpec = (dir, opts = {}) => {
  const findings = [];
  const add = (severity, rule, message, where) =>
    findings.push({ severity, rule, message, where });

  if (!existsSync(dir)) {
    add("high", "feature-dir-missing", `dossier introuvable: ${dir}`, dir);
    return { dir, findings, metrics: {} };
  }

  const files = listFiles(dir);
  const rel = (p) => p.slice(dir.length + 1).replace(/\\/g, "/");

  for (const name of REQUIRED) {
    const p = join(dir, name);
    if (!existsSync(p)) add("high", "required-file-missing", `${name} absent`, name);
    else if (statSync(p).size === 0) add("high", "empty-file", `${name} est vide`, name);
  }

  const checklistDir = join(dir, "checklists");
  if (!existsSync(checklistDir))
    add("medium", "checklists-missing", "checklists/ absent", "checklists/");

  for (const f of files) {
    if (statSync(f).size === 0) add("high", "empty-file", `${rel(f)} est vide`, rel(f));
  }

  for (const name of CONDITIONAL) {
    const p = join(dir, name);
    if (!existsSync(p)) continue;
    const text = read(p) || "";
    const body = text.replace(/^#.*$/gm, "").trim();
    if (body.length < 200 && EMPTY_MARKERS.test(body))
      add("medium", "conditional-artifact-hollow", `${name} n a pas de vrai contenu: il ne doit pas exister`, name);
  }

  const specText = read(join(dir, "spec.md")) || "";
  const planText = read(join(dir, "plan.md")) || "";
  const tasksText = read(join(dir, "tasks.md")) || "";
  const designText = read(join(dir, "design.md"));

  const tasks = parseTasks(tasksText);
  const stories = new Map();
  for (const t of tasks) {
    const key = t.story || "unassigned";
    if (!stories.has(key)) stories.set(key, []);
    stories.get(key).push(t);
  }

  const seenIds = new Map();
  for (const t of tasks) {
    if (!t.id) {
      add("low", "task-without-id", `tache sans identifiant: ${t.body.slice(0, 60)}`, `tasks.md:${t.line}`);
      continue;
    }
    if (seenIds.has(t.id))
      add("high", "duplicate-task-id", `${t.id} apparait deux fois (lignes ${seenIds.get(t.id)} et ${t.line})`, `tasks.md:${t.line}`);
    else seenIds.set(t.id, t.line);
  }

  for (const t of tasks) {
    for (const c of CEREMONY) {
      if (c.rx.test(t.body))
        add("medium", "ceremony-task", `tache de ceremonie (${c.what}): elle n a pas de livrable`, `tasks.md:${t.line}`);
    }
  }

  for (const [story, list] of stories) {
    if (story === "unassigned") continue;
    const prod = new Set();
    // The LOCALES files of a front repo are mandatory for any UI story (sk-prep recon.md): they
    // count as one file, not three, or every UI story with a label goes over the cap.
    const companionFiles = new Set();
    for (const t of list) for (const p of t.paths) {
      if (!isProdPath(p) || !p.includes("/") || t.reusedOnly.has(p) || PURE_TYPE_FILE.test(p)) continue;
      if (t.companions.has(p)) companionFiles.add(p);
      else prod.add(LOCALE_FILE.test(p) ? "<locales>" : p);
    }
    for (const p of prod) companionFiles.delete(p);

    if (list.length > MAX_TASKS_PER_STORY)
      add("high", "story-too-many-tasks", `${story} a ${list.length} taches (max ~${MAX_TASKS_PER_STORY}): recouper`, `tasks.md`);
    if (prod.size > MAX_PROD_FILES_PER_STORY)
      // The counted files are listed: without them the parent read the linter's source to find
      // out what it counted (918 prep: 12 lint runs in 5 min, 4 reads of this file).
      add("high", "story-too-many-prod-files", `${story} touche ${prod.size} fichiers de production (max ~${MAX_PROD_FILES_PER_STORY}) : ${[...prod].join(", ")} — un chemin cite comme modele compte aussi, pas un chemin cite seulement en Code:`, `tasks.md`);
    else if (prod.size + companionFiles.size > MAX_FILES_WITH_COMPANIONS)
      add("high", "story-too-many-prod-files", `${story} touche ${prod.size + companionFiles.size} fichiers, compagnons compris (max ~${MAX_FILES_WITH_COMPANIONS}) : ${[...prod, ...companionFiles].join(", ")}`, `tasks.md`);
    if (prod.size === 1 && stories.size > 1)
      add("low", "story-too-thin", `${story} ne porte qu un fichier de production: fusionner si c est le meme livrable`, `tasks.md`);

    const backend = [...prod].filter((p) => BACKEND_HINT.test(p));
    const ui = [...prod].filter(isUiPath);
    if (backend.length && ui.length)
      add("high", "story-mixes-api-and-ui", `${story} mele backend (${backend[0]}) et UI (${ui[0]}): interdit dans un meme [USn]`, `tasks.md`);
  }

  if (designText !== null) {
    const anchors = new Set(matchAll(designText, DESIGN_SECTION).map((m) => m[1]));
    const used = new Set();
    for (const t of tasks) {
      const refs = matchAll(t.body, DESIGN_ANCHOR).flatMap((m) => matchAll(m[1], /C\d+/g).map((x) => x[0]));
      refs.forEach((r) => used.add(r));
      for (const r of refs) {
        if (!anchors.has(r))
          add("high", "design-anchor-dangling", `ancre ${r} absente de design.md`, `tasks.md:${t.line}`);
      }
      // La cible `Monté dans:` d un hook ou d un service est un fichier d UI, mais
      // la tache qui cree le hook ne dessine rien : elle ne doit pas d ancre Design.
      const touchesUi = t.paths.some((p) => isVisualPath(p) && !isTestPath(p) && !t.mounts.some((m) => m.target === p));
      if (touchesUi && refs.length === 0)
        add("high", "ui-task-without-design-anchor", `tache UI sans ancre Design: design.md#C<n>`, `tasks.md:${t.line}`);
    }
    for (const a of anchors) {
      if (!used.has(a))
        add("medium", "design-section-uncovered", `${a} de design.md n est couvert par aucune tache`, "design.md");
    }
  } else if (/design\.md#C\d+|^\s*Design:\s*design\.md|DESIGN_PATH\s*=/m.test(planText)) {
    // Une CITATION est une ancre exploitable (design.md#C<n>, ligne Design:),
    // pas la simple occurrence du nom : « pas de design.md, donc aucune… »
    // documentait une ABSENCE et sortait en haut. Deux sessions sur trois.
    add("high", "design-cited-but-absent", "plan.md ancre design.md mais le fichier est absent", "plan.md");
  }

  for (const t of tasks) {
    for (const m of matchAll(t.body, LEGACY_ANCHOR)) {
      const [, docPath, refs] = m;
      const doc = read(docPath);
      if (doc === null) {
        add("medium", "legacy-doc-unreadable", `doc legacy introuvable depuis le cwd: ${docPath}`, `tasks.md:${t.line}`);
        continue;
      }
      for (const ref of refs.split(",")) {
        if (!new RegExp(`(^|\\s)[-#]*\\s*${ref}\\b`, "m").test(doc))
          add("high", "legacy-ref-unknown", `${ref} absent de ${basename(docPath)}`, `tasks.md:${t.line}`);
        if (/^R\d+$/.test(ref)) {
          const ruleLine = doc.split("\n").find((l) => new RegExp(`^-\\s*${ref}\\s`).test(l));
          const ruleText = ruleLine ? ruleLine.replace(/^-\s*R\d+\s*[—-]?\s*/, "").trim() : null;
          if (ruleText && ruleText.length > 12 && !specText.includes(ruleText.slice(0, 40)))
            add("high", "legacy-rule-not-in-ac", `${ref} ancre mais son texte n est dans aucun AC de spec.md: le worker et le reviewer ne verraient rien`, `tasks.md:${t.line}`);
        }
      }
    }
    for (const m of matchAll(t.body, CODE_ANCHOR)) {
      const doc = read(m[1]);
      if (doc === null)
        add("medium", "code-doc-unreadable", `doc code-search introuvable: ${m[1]}`, `tasks.md:${t.line}`);
      else if (!new RegExp(`\\b${m[2]}\\b`).test(doc))
        add("high", "code-ref-unknown", `${m[2]} absent de ${basename(m[1])}`, `tasks.md:${t.line}`);
    }
  }

  const contract = collectContractFields(dir);
  for (const f of contract.unparsable)
    add("high", "contract-unparsable", `contrat JSON illisible: ${rel(f)}`, rel(f));
  if (contract.files.length) {
    // Les mots-cles de schema (JSON Schema / OpenAPI) et les noms de composants
    // ne sont pas des champs de DONNEE : exiger leur source dans les Faits
    // verifies sortait 3 HIGH faux sur un contrat yaml legitime (2026-09-09).
    const SCHEMA_KEYWORDS = new Set([
      "type", "properties", "required", "items", "enum", "format", "nullable",
      "additionalProperties", "description", "title", "example", "examples",
      "default", "minLength", "maxLength", "minimum", "maximum", "pattern",
      "oneOf", "anyOf", "allOf", "$ref", "components", "schemas", "openapi",
      "paths", "responses", "content", "schema", "in", "name",
    ]);
    // MEDIUM, not HIGH: on a yaml that documents a whole existing DTO enriched with a few fields,
    // 21 of 23 findings were false positives (bench 2026-09-09) and 917 kept 17 HIGH through 4 runs,
    // which made the severity unreadable while the real gap (a spec attribute with no field) passed.
    const unsourced = contract.fields.filter(
      (f) => !SCHEMA_KEYWORDS.has(f) && !/^[A-Z][A-Za-z0-9]*$/.test(f) && !planText.includes(f)
    );
    for (const f of unsourced.slice(0, 20))
      add("medium", "contract-field-without-source", `champ "${f}" du contrat n apparait pas dans plan.md (Faits verifies: base, table, colonne, volumetrie)`, "contracts/");
    if (unsourced.length > 20)
      add("medium", "contract-field-without-source", `${unsourced.length - 20} autres champs sans source dans plan.md`, "contracts/");
  }

  const parallelPath = join(dir, "parallel.yml");
  // Voie parallele intra-depot : une US qui ne partage AUCUN fichier de prod avec les autres peut
  // tourner dans son propre slot (banc jeu : US4 disjointe, aucune parallel.yml proposee).
  if (!existsSync(parallelPath) && stories.size > 2) {
    const filesOf = new Map();
    for (const [story, list] of stories) {
      if (story === "unassigned") continue;
      const set = new Set();
      for (const t of list) for (const p of t.paths) if (isProdPath(p) && p.includes("/") && !t.reusedOnly.has(p)) set.add(p);
      filesOf.set(story, set);
    }
    for (const [story, set] of filesOf) {
      if (!set.size) continue;
      const shared = [...filesOf].some(([other, os]) => other !== story && [...set].some((p) => os.has(p)));
      if (!shared) add("low", "story-parallel-candidate", `${story} ne partage aucun fichier de prod avec les autres US : voie parallele possible (parallel.yml, sk-impl ref/parallel.md)`, "tasks.md");
    }
    // Paires sans fichier commun : deux voies possibles meme quand aucune US n est isolee
    // (banc jeu F4 : US1/US2 contre US6/US5, raisonne a la main).
    const ids = [...filesOf.keys()];
    const pairs = [];
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const a = filesOf.get(ids[i]), b = filesOf.get(ids[j]);
        if (a.size && b.size && ![...a].some((p) => b.has(p))) pairs.push(`${ids[i]}|${ids[j]}`);
      }
    if (pairs.length) add("low", "story-parallel-pairs", `paires d US sans fichier de prod commun (voies paralleles possibles) : ${pairs.slice(0, 8).join(", ")}${pairs.length > 8 ? ` +${pairs.length - 8}` : ""}`, "tasks.md");
  }
  if (existsSync(parallelPath)) {
    const y = parseParallelYml(read(parallelPath) || "");
    const known = new Set([...stories.keys()].filter((k) => k !== "unassigned"));
    const declared = [y.after, ...y.parallel].filter(Boolean);
    for (const id of declared) {
      if (!known.has(id))
        add("high", "parallel-unknown-id", `${id} de parallel.yml n existe pas dans tasks.md`, "parallel.yml");
    }
    if (y.after && contract.files.length)
      add("high", "parallel-useless-barrier", `after: ${y.after} alors que contracts/ existe deja: la barriere serialise sans rien apprendre au groupe parallel (mettre after: null)`, "parallel.yml");
    if (y.parallel.length < 2)
      add("medium", "parallel-single-item", "parallel.yml ne liste qu une US: aucun fan-out possible", "parallel.yml");
    if (!y.contract)
      add("high", "parallel-without-contract", "parallel.yml sans champ contract", "parallel.yml");
  }

  const standards = new Set([
    ...matchAll(planText, STANDARDS_REF).map((m) => m[0]),
    ...matchAll(tasksText, STANDARDS_REF).map((m) => m[0]),
  ]);
  const always = alwaysInjected(dir);
  // Avec des lignes `Standards:` par US (un depot par US), le cap vaut PAR US : une feature back +
  // front ancre legitimement deux jeux (banc L : 11 front + 8 back sortaient over-cap).
  const perStory = [...tasksText.matchAll(/^##\s+\[(US\d+)\][^\n]*\n+(?:[^\n]*\n)*?\s*Standards\s*:\s*([^\n]+)/gm)].map((m) => matchAll(m[2], STANDARDS_REF).map((x) => x[0]));
  const capped = perStory.length
    ? perStory.reduce((a, l) => (l.filter((s) => !always.has(s.replace(/\.md$/, ""))).length > a.length ? l.filter((s) => !always.has(s.replace(/\.md$/, ""))) : a), [])
    : [...standards].filter((s) => !always.has(s.replace(/\.md$/, "")));
  if (standards.size === 0)
    add("high", "standards-not-anchored", "aucun @agent-os/standards/ ancre dans plan.md ou tasks.md", "plan.md");
  else if (capped.length > STANDARDS_CAP.max)
    add("medium", "standards-over-cap", `${capped.length} standards ancres hors alwaysInject (cap ${STANDARDS_CAP.min}-${STANDARDS_CAP.max})`, "plan.md");

  // Faits verifies -> depot. Les fichiers que tasks.md demande de CREER ne sont
  // pas des faits, on les ecarte ; un chemin peut vivre dans le backend lie.
  const facts = { cited: 0, missing: 0, lineMismatch: 0 };
  const factsSection = sectionAfter(planText, FACTS_HEADING);
  const repoRoot = findRepoRoot(dir);
  if (factsSection && repoRoot) {
    const backRoot = linkedBackendRoot(repoRoot);
    const toCreate = new Set(
      tasks.filter((t) => CREATE_HINT.test(t.body)).flatMap((t) => t.paths.map((x) => x.replace(/\\/g, "/")))
    );
    // Ligne par ligne, pas par puce : une reference de ligne et un symbole ne
    // qualifient que le chemin de la MEME ligne markdown. Un nom de fichier nu
    // (sans / ni \) n est pas une ancre : le plan le cite en rappel d un chemin
    // deja donne, ou pour dire qu il est absent (« no parallel.yml »).
    for (const line of factsSection.split(LF)) {
      const paths = [...new Set(matchAll(line, PATH_TOKEN).map((x) => x[0]))].filter((x) => /[\/\\]/.test(x));
      if (!paths.length) continue;
      // `chemin:12-20` (format prescrit par sk-prep A.1) autant que « lignes 12-20 ».
      const lineRef = line.match(LINE_REF) || line.match(/\.[A-Za-z]{1,5}:(\d+)(?:\s*[-–]\s*(\d+))?\b/);
      const symbol = line.match(CODE_SPAN)?.[1];
      for (const raw of paths) {
        const rel = raw.replace(/\\/g, "/").replace(/^@/, "");
        if (isDocPath(rel) || toCreate.has(rel)) continue;
        facts.cited += 1;
        const abs = [join(repoRoot, rel), backRoot ? join(backRoot, rel) : null].filter(Boolean).find((c) => existsSync(c));
        if (!abs) {
          facts.missing += 1;
          add("high", "verified-fact-path-missing", "Faits verifies : `" + rel + "` n existe ni dans le depot ni dans le backend lie", "plan.md");
          continue;
        }
        if (!lineRef || !symbol || paths.length > 1) continue;
        // 10 lines above: a fact that cites a line INSIDE a function names the function, declared above.
        const fromLine = Math.max(1, Number(lineRef[1]) - 10);
        const toLine = Number(lineRef[2] || lineRef[1]) + 3;
        const slice = (read(abs) || "").split(LF).slice(fromLine - 1, toLine).join(LF);
        if (!slice.includes(symbol)) {
          facts.lineMismatch += 1;
          add("medium", "verified-fact-line-mismatch", "Faits verifies : `" + symbol + "` absent de " + rel + " lignes " + lineRef[1] + (lineRef[2] ? "-" + lineRef[2] : "") + " (-10/+3)", "plan.md");
        }
      }
    }
  } else if (planText && !factsSection) {
    add("low", "verified-facts-absent", "plan.md sans section Verified facts / Faits verifies : la recon n est pas tracee", "plan.md");
  }

  // Existence sur la branche d integration (--ref, defaut origin/HEAD). Sans
  // git lisible, les regles d existence se taisent plutot que de deviner.
  const ref = repoRoot ? opts.ref || defaultRef(repoRoot) : null;
  const tree = gitTree(repoRoot, ref);
  // Arbre du backend lie : lu seulement si un chemin manque cote front.
  let backTree;
  const backHas = (p) => {
    if (backTree === undefined) {
      const back = repoRoot ? linkedBackendRoot(repoRoot) : null;
      backTree = back ? gitTree(back, defaultRef(back)) : null;
    }
    return backTree ? backTree.has(p) : false;
  };
  // Creations decidees avec l arbre de la ref. Une tache « Creer » cree aussi ses autres
  // chemins absents de la ref ; une tache « Implementer / Ecrire / Ajouter » cree les siens
  // s ils y sont absents. Un chemin revient a la PREMIERE tache qui le cree : les suivantes
  // le modifient. Sans arbre lisible, seules les creations explicites comptent.
  const claimed = new Set(tasks.flatMap((t) => t.created));
  if (tree) {
    for (const t of tasks) {
      if (!t.createLead) continue;
      for (const p of t.candidates) {
        if (claimed.has(p) || tree.has(p) || backHas(p)) continue;
        claimed.add(p);
        t.created.push(p);
      }
    }
  }
  const createdSet = new Set(tasks.flatMap((t) => t.created));
  const citedSet = new Set(tasks.flatMap((t) => [...t.paths, ...t.mounts.map((m) => m.target)]));
  const exists = (p) => !tree || createdSet.has(p) || tree.has(p) || backHas(p);
  const storyOrder = [...stories.keys()].filter((k) => k !== "unassigned");
  const storyPaths = new Map([...stories].map(([s, list]) => [s, new Set(list.flatMap((t) => t.paths))]));
  const at = (t) => `tasks.md:${t.line}`;
  const tid = (t) => t.id || `ligne ${t.line}`;

  for (const t of tasks) {
    for (const c of t.created) {
      const kind = mountKind(c);
      if (!kind || t.mounts.length) continue;
      add("high", "mount-missing", `${tid(t)} cree le ${kind} ${basename(c)} sans dire ou il est monte : ajouter \`Monté dans: <fichier>\` (monte par cette US) ou \`Monté dans: <fichier> (US<n>)\` (US<n> porte la tache de montage)`, at(t));
    }
    for (const mt of t.mounts) {
      if (!exists(mt.target))
        add("high", "mount-target-missing", `${tid(t)} : cible de montage ${mt.target} absente de ${ref} et creee par aucune tache`, at(t));
      if (!mt.owner) continue;
      if (!stories.has(mt.owner)) {
        add("high", "mount-owner-missing", `${tid(t)} confie le montage a ${mt.owner}, qui n existe pas dans tasks.md`, at(t));
        continue;
      }
      if (!storyPaths.get(mt.owner).has(mt.target))
        add("high", "mount-owner-missing", `${tid(t)} confie le montage a ${mt.owner}, mais aucune tache de ${mt.owner} ne touche ${mt.target} : personne ne montera ${basename(t.created[0] || "ce code")}`, at(t));
      else if (t.story && storyOrder.indexOf(mt.owner) < storyOrder.indexOf(t.story))
        add("medium", "mount-planned-before", `${tid(t)} (${t.story}) confie le montage a ${mt.owner}, qui la precede : ce qu elle doit monter n existera pas encore`, at(t));
    }
    if (t.wire) {
      const prod = t.paths.filter(isProdPath).filter((p) => !t.mounts.some((m) => m.target === p));
      if (!prod.length && !t.mounts.length)
        add("high", "wire-target-missing", `${tid(t)} branche sans nommer sa cible : citer le fichier ou le branchement se fait (chemin dans la ligne ou \`Monté dans: <fichier>\`)`, at(t));
      for (const p of prod)
        if (!exists(p)) add("high", "wire-target-missing", `${tid(t)} : cible ${p} absente de ${ref} et creee par aucune tache`, at(t));
    }
  }

  // Tache restante sans aucun fichier de prod : le worker devra le chercher (916 : T082,
  // T091, T094, T098). Les taches backend citent leurs chemins autrement, on les laisse.
  for (const t of tasks) {
    // Tout chemin de prod compte ici, meme a la racine (`package.json`).
    if (t.checked || t.paths.some(isProdPath) || t.mounts.length || t.testSubject) continue;
    if (t.paths.some((p) => BACKEND_HINT.test(p))) continue;
    add("medium", "task-without-prod-path", `${tid(t)} ne nomme aucun fichier de prod : citer le fichier cree ou modifie, sinon le worker le cherche`, at(t));
  }
  // Tache qui prescrit une recherche au worker : elle n est pas prete, c est la part
  // mecanique du critere « ecrire sans chercher » (917 T025 : « localiser le service », un
  // mock livre a la place du service existant, FAIL US6). Le texte entre backticks (code,
  // chemins) est ignore : `findUser` n est pas une consigne.
  const SEARCH_VERB = /\b(localiser|localise[rz]?|chercher|rechercher|trouver|identifier|reperer|repérer|grep|locate|find|search for|look up|non r[ée]solue?s?|[àa] confirmer|[àa] d[ée]terminer|TBD)\b/i;
  for (const t of tasks) {
    if (t.checked) continue;
    // Les valeurs citees (backticks, guillemets droits ou francais) sont des donnees, pas des consignes :
    // un libelle « Rechercher un contact » sortait un faux HIGH.
    const prose = t.body.replace(/`[^`]*`/g, " ").replace(/"[^"]*"/g, " ").replace(/«[^»]*»/g, " ").replace(/“[^”]*”/g, " ");
    const hit = prose.match(SEARCH_VERB);
    if (hit) add("high", "task-needs-search", `${tid(t)} demande au worker de chercher (« ${hit[0]} ») : la prep tranche et ecrit le chemin, le symbole ou la valeur`, at(t));
  }
  // Test de hook dont le hook n est cree par aucune tache ni present sur la ref
  // (916 T094 : useTaskView.test.ts, aucun useTaskView.ts nulle part).
  const plannedNames = new Set(tasks.flatMap((t) => [...t.paths, ...t.mounts.map((m) => m.target)]).filter(isProdPath).map((p) => basename(p).replace(/\.[jt]sx?$/, "")));
  const refNames = tree ? new Set([...tree.files].map((f) => basename(f).replace(/\.[jt]sx?$/, ""))) : null;
  for (const t of tasks) {
    if (t.checked || !refNames) continue;
    for (const p of t.paths.filter(isTestPath)) {
      const hook = basename(p).match(/^(use[A-Z]\w*)\.(?:test|spec)\.[jt]sx?$/);
      if (!hook || plannedNames.has(hook[1]) || refNames.has(hook[1])) continue;
      add("medium", "test-without-subject", `${tid(t)} : ${basename(p)} teste le hook ${hook[1]}, qu aucune tache ne cree et qui n existe pas sur ${ref}`, at(t));
    }
  }

  const reconText = read(join(dir, "recon.md"));
  const recon = { bytes: 0, paths: 0, stale: 0 };
  if (reconText !== null) {
    recon.bytes = Buffer.byteLength(reconText, "utf8");
    if (recon.bytes > RECON_MAX_BYTES)
      add("medium", "recon-oversize", `recon.md pese ${Math.round(recon.bytes / 1024)} Ko (plafond ~${RECON_MAX_BYTES / 1024} Ko) : chaque worker et chaque reviewer le relit en entier`, "recon.md");
    const lines = reconText.split(LF);
    const long = lines.map((l, i) => ({ l, i })).filter(({ l }) => l.length > RECON_MAX_LINE);
    if (long.length)
      add("low", "recon-line-too-long", `${long.length} ligne(s) de plus de ${RECON_MAX_LINE} caracteres : un fait par ligne, la prose va ailleurs`, `recon.md:${long[0].i + 1}`);
    if (tree) {
      const stale = [];
      let section = "";
      lines.forEach((line, i) => {
        const h = line.match(/^##\s+(.*)$/);
        if (h) {
          section = h[1];
          return;
        }
        // Regex d interdits, faits barres (~~), faits d US (branche de feature).
        if (/interdits/i.test(section) || line.includes("~~") || /\(US\d+\)\s*$/.test(line.trim())) return;
        for (const m of matchAll(line, RECON_PATH)) {
          for (const p of expandBraces(m[1]).map(normPath)) {
            if (p.includes("*") || isDocPath(p)) continue;
            recon.paths += 1;
            if (citedSet.has(p) || exists(p)) continue;
            stale.push({ p, line: i + 1 });
          }
        }
      });
      recon.stale = stale.length;
      for (const s of stale.slice(0, 15))
        add("medium", "recon-path-stale", `\`${s.p}\` n existe pas sur ${ref} : fait ecrit sur une autre base, ou fichier supprime depuis`, `recon.md:${s.line}`);
      if (stale.length > 15) add("medium", "recon-path-stale", `${stale.length - 15} autres chemins absents de ${ref}`, "recon.md");
    }
  }

  const design = { tokensChecked: 0, snippetsChecked: 0 };
  if (designText !== null && repoRoot) {
    const lib = buildLibIndex(repoRoot);
    const defs = collectCssDefs(repoRoot, tree, lib);
    const sections = designSections(designText);
    const numbered = (n) => sections.filter((s) => new RegExp(`^${n}(?:[.)]|\\s)`).test(s.title));
    // `--font-size-*` designe une famille, pas un token : le lookahead l ecarte.
    const tokenRx = /--[A-Za-z][\w-]*[A-Za-z0-9](?![\w*-])/g;
    // Sans le css de la lib ou le theme Tailwind installes, un token absent ne prouve
    // rien : on le dit une fois au lieu d affirmer qu il n existe pas.
    const libCssOk = Boolean(lib && lib.css.length);
    const themeOk = existsSync(join(repoRoot, "node_modules", "tailwindcss", "theme.css"));
    if (!libCssOk || !themeOk)
      add("low", "design-tokens-unchecked", `tokens de design.md non verifies : ${[!libCssOk && "css de la lib", !themeOk && "theme Tailwind"].filter(Boolean).join(" et ")} absent(s) de node_modules`, "design.md");
    if (defs.size && libCssOk && themeOk) {
      const leftPatterns = [];
      const reported = new Set();
      const report = (rule, token, where, index) => {
        if (reported.has(token)) return;
        reported.add(token);
        const segs = token.replace(/^--/, "").split("-").filter((s) => s.length > 2);
        const near = [...defs].filter((d) => segs.length && segs.every((s) => d.includes(s))).slice(0, 3);
        const hint = near.length ? ` ; existe : ${near.join(", ")}` : "";
        const text = rule === "design-token-unknown"
          ? `${token} (${where}) n est defini ni dans le css du depot, ni dans la lib, ni dans le theme Tailwind${hint}`
          : `${token} (${where}) n a pas de ligne dans la table §3 et n existe pas cote projet : le worker n a pas de cible${hint}`;
        add("medium", rule, text, `design.md:${lineOf(designText, index)}`);
      };
      for (const s of numbered(3)) {
        for (const row of tableRows(s.text)) {
          const [left] = row.cells;
          const target = row.cells[row.cells.length - 1];
          if (row.cells.length < 2 || /^(design|variable|px|token)\b/i.test(left.replace(/`/g, ""))) continue;
          // Colonne gauche = nom cote design, motif compris (`grey-XX`, `green-*`).
          for (const m of matchAll(left, /(-{0,2}[A-Za-z][\w*-]*)/g))
            leftPatterns.push(new RegExp(`^--?${m[1].replace(/^-+/, "").replace(/XX|\*/g, "[\\w-]+")}$`));
          for (const m of matchAll(target, tokenRx)) {
            design.tokensChecked += 1;
            if (!defs.has(m[0])) report("design-token-unknown", m[0], "§3, cible", s.start + row.pos);
          }
        }
      }
      for (const s of numbered(5)) {
        for (const row of tableRows(s.text)) {
          if (row.cells.length < 2) continue;
          for (const m of matchAll(row.cells[row.cells.length - 1], tokenRx)) {
            design.tokensChecked += 1;
            if (!defs.has(m[0])) report("design-token-unknown", m[0], `§5 ${row.cells[0].replace(/[`*]/g, "")}, decision`, s.start + row.pos);
          }
        }
      }
      for (const s of sections.filter((x) => !/^(?:1|2|3|6)(?:[.)]|\s)/.test(x.title))) {
        for (const m of matchAll(s.text, tokenRx)) {
          design.tokensChecked += 1;
          if (defs.has(m[0]) || leftPatterns.some((rx) => rx.test(m[0]))) continue;
          report("design-token-unmapped", m[0], s.title.slice(0, 30), s.start + m.index);
        }
      }
    }
    // Section C<n> qui herite ses valeurs d une autre (« meme gabarit que C13 », « memes valeurs
    // que C9 ») : l extrait design-<US>.md ne porte que les sections des taches de l US, le worker
    // recoit le renvoi sans les valeurs. 913 C14, 916 C11, 917 C9.
    // Headings `## C14` and `### C11` both open a section; the current one is tracked line by line.
    {
      let current = null;
      designText.split("\n").forEach((line, i) => {
        const h = line.match(/^#{2,4}\s+(?:C(\d+)\b)?/);
        if (h) current = h[1] || null;
        if (!current) return;
        for (const m of matchAll(line, /\bm[êeÊE]mes?\s+[^.|\n]{0,40}?\b(?:que|qu')\s*(?:§|#)?C(\d+)\b/gi)) {
          if (m[1] === current) continue;
          add("medium", "design-section-inherits", `C${current} renvoie a C${m[1]} (« ${m[0].slice(0, 50)} ») : recopie les valeurs dans C${current}, l extrait d une US qui n a que C${current} les perd`, `design.md:${i + 1}`);
        }
      });
    }
    // Classe d echelle sur une police ou un rayon : Tailwind v4 n a d echelle numerique que pour
    // l espacement, la taille et l interligne. `text-3.75` et `rounded-1.5` compilent sans erreur
    // et ne produisent aucun CSS (verifie en compilant avec tailwindcss 4.2.2) : 917 a prescrit
    // text-3.75 dans §3, puis 4 revues se sont contredites dessus. Sauf token `--text-<n>` /
    // `--radius-<n>` defini par le projet.
    {
      const seen = new Set();
      for (const m of matchAll(designText, /(?<![\w-])(text|rounded(?:-(?:t|r|b|l|s|e|tl|tr|bl|br|ss|se|es|ee))?)-(\d+(?:\.\d+)?)(?![\w.\[-])/g)) {
        const [cls, kind, n] = m;
        const token = kind === "text" ? `--text-${n}` : `--radius-${n}`;
        if (seen.has(cls) || defs.has(token)) continue;
        seen.add(cls);
        add("medium", "design-class-invalid", `\`${cls}\` ne produit aucun CSS en Tailwind v4 (pas d echelle numerique pour ${kind === "text" ? "la police" : "le rayon"}) : token, rem entre crochets (\`${kind}-[${(Number(n) / 4).toString()}rem]\`) ou ecart §5`, `design.md:${lineOf(designText, m.index)}`);
      }
    }
    if (lib && lib.props.size) {
      for (const m of matchAll(designText, /`<?([A-Z][A-Za-z0-9]*)((?:\s+[A-Za-z][\w-]*=(?:"[^"]*"|'[^']*'|\{[^}`]*\}))+)[^`]*`/g)) {
        const resolved = resolveProps(lib, `${m[1]}Props`);
        if (!resolved) continue;
        design.snippetsChecked += 1;
        const where = `design.md:${lineOf(designText, m.index)}`;
        for (const a of matchAll(m[2], /([A-Za-z][\w-]*)=(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/g)) {
          const [, prop, dq, sq] = a;
          const type = resolved.members.get(prop);
          if (type === undefined) {
            const htmlOk = resolved.html && (HTML_ATTRS.has(prop) || /^(?:aria|data)-/.test(prop) || /^on[A-Z]/.test(prop));
            if (!htmlOk && !resolved.open)
              add("medium", "design-lib-prop-unknown", `\`${m[1]} ${prop}=\` : ${m[1]} n a pas de prop \`${prop}\` dans la lib installee (props : ${[...resolved.members.keys()].join(", ")}${resolved.html ? " + attributs HTML" : ""})`, where);
            continue;
          }
          const value = dq !== undefined ? dq : sq;
          if (value === undefined) continue;
          const allowed = literalValues(lib, type);
          if (allowed && !allowed.has(value))
            add("medium", "design-lib-prop-unknown", `\`${m[1]} ${prop}="${value}"\` : valeur hors du type ${type.trim()} (${[...allowed].join(" | ")})`, where);
        }
      }
    }
  }

  const totalBytes = files.reduce((a, f) => a + statSync(f).size, 0);
  const metrics = {
    factsCited: facts.cited,
    factsMissing: facts.missing,
    factsLineMismatch: facts.lineMismatch,
    files: files.length,
    bytes: totalBytes,
    tasks: tasks.length,
    checked: tasks.filter((t) => t.checked).length,
    stories: [...stories.keys()].filter((k) => k !== "unassigned").length,
    bytesPerTask: tasks.length ? Math.round(totalBytes / tasks.length) : null,
    // Chemins prod CITES dans les taches, pas fichiers cibles : un fichier pris
    // pour modele compte aussi. La calibration prefere result.sk-prep.json.
    prodPathsCited: [...new Set(tasks.flatMap((t) => t.paths).filter(isProdPath))].length,
    hasDesign: designText !== null,
    hasParallel: existsSync(parallelPath),
    hasContracts: contract.files.length > 0,
    standards: standards.size,
    ref: tree ? ref : null,
    mountNotes: tasks.reduce((a, t) => a + t.mounts.length, 0),
    reconBytes: recon.bytes,
    reconPaths: recon.paths,
    reconStale: recon.stale,
    designTokensChecked: design.tokensChecked,
    designSnippetsChecked: design.snippetsChecked,
  };

  // --only mount,wire : ne garder que ces familles de regles (GO de /sk-impl).
  const only = (opts.only || []).filter(Boolean);
  const kept = only.length ? findings.filter((f) => only.some((p) => f.rule.startsWith(p))) : findings;
  return { dir, findings: kept, metrics };
};

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

export const printLint = (result) => {
  const { findings, metrics } = result;
  const rows = [...findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.rule.localeCompare(b.rule)
  );
  console.log(`\n${result.dir}`);
  console.log(
    Object.entries(metrics)
      .map(([k, v]) => `${k}=${v}`)
      .join("  ")
  );
  if (!rows.length) {
    console.log("\naucun finding\n");
    return;
  }
  const width = Math.max(...rows.map((r) => r.rule.length));
  console.log("");
  for (const r of rows)
    console.log(`${r.severity.toUpperCase().padEnd(6)} ${r.rule.padEnd(width)}  ${r.where}\n       ${r.message}`);
  const counts = rows.reduce((a, r) => ({ ...a, [r.severity]: (a[r.severity] || 0) + 1 }), {});
  console.log(
    `\n${rows.length} findings (${["high", "medium", "low"].filter((s) => counts[s]).map((s) => `${counts[s]} ${s}`).join(", ")})\n`
  );
};

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const args = process.argv.slice(2);
  const valueOf = (name) => {
    const eq = args.find((a) => a.startsWith(`--${name}=`));
    if (eq) return eq.slice(name.length + 3);
    const i = args.indexOf(`--${name}`);
    return i !== -1 ? args[i + 1] : undefined;
  };
  const withValue = new Set(["--ref", "--only"].map((n) => args.indexOf(n) + 1).filter((i) => i > 0));
  const targets = args.filter((a, i) => !a.startsWith("--") && !withValue.has(i));
  const asJson = args.includes("--json");
  if (!targets.length) {
    console.error("usage: node audit-lint.mjs <specs/NNN-nom> [...] [--json] [--ref <ref>] [--only <prefixe,...>]");
    process.exit(2);
  }
  const opts = { ref: valueOf("ref"), only: (valueOf("only") || "").split(",").map((s) => s.trim()) };
  const results = targets.map((t) => lintSpec(t, opts));
  if (asJson) console.log(JSON.stringify(results, null, 2));
  else results.forEach(printLint);
  process.exit(results.some((r) => r.findings.some((f) => f.severity === "high")) ? 1 : 0);
}
