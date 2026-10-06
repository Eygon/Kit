---
name: sk-code-search
description: ETAT DES LIEUX factuel d'un ecran ou d'une fonctionnalite DEJA EXISTANTE dans le projet courant — le depot front d'ou la commande est lancee, et le depot backend dont le chemin est lu dans .sk/repos.json (cle backend, ecrite par /sk-init) — avant d'ouvrir une prep. Cible d'abord les portions pertinentes des deux depots (structure connue src/pages, src/api, src/hooks, puis grep multi-variantes ; cote back, les endpoints reellement appeles par le front trouve), lance une petite flotte d'agents Haiku qui extraient les faits bruts (composants, hooks, routes, endpoints, DTO/mappers, tests, cites fichier+ligne), fait synthetiser par Sonnet, puis redige — l'orchestrateur lui-meme, jamais delegue — un fichier .md dans docs/code-search/ ancre a un commit git : ce qui existe (E<n>), ou ca vit, le contrat API front/back, la couverture de tests, les points d'attention constates (A<n>). Le document est destine a etre passe a /sk-prep, qui verifie sa fraicheur par git diff et evite ainsi de refaire la recon. Se declenche sur "etat des lieux de l'ecran X", "qu'est-ce qui existe deja pour Y", "avant de retravailler Z, fais le point".
argument-hint: "<ecran ou fonctionnalite du projet courant sur lequel faire l'etat des lieux>"
disable-model-invocation: true
allowed-tools: Workflow Agent Bash PowerShell Read Write Glob Grep AskUserQuestion ToolSearch
---

# Etat des lieux du code existant (`/sk-code-search`)

Ecran / fonctionnalite : **$ARGUMENTS**

> **Declenchement Workflow (turn-scoped, PAS session-scoped).** Cette commande est une
> slash-command dont les instructions demandent explicitement d'appeler `Workflow` — c'est un
> opt-in valide en soi, aucun mot-cle n'est necessaire, et il ne vaut que pour ce tour. Il ne
> s'applique QU'AU-DELA du seuil de l'etape A.5 : sous ce seuil, lecture directe, aucun agent.
>
> **Profil de livrable : C (document).** Preuve de succes = conformite au template + **ancrage
> factuel a 100 %** (toute affirmation cite un fichier existant, si possible une ligne) + **ancrage
> git** (le document dit de QUEL commit il parle). Un etat des lieux qui invente un composant ou
> decrit un code deja supprime est **pire qu'une absence de document** : il sera lu comme une
> source fiable, et par `/sk-prep` comme une dispense de recon.

## Esprit de cette commande

Jumelle de `/sk-legacy-search`, tournee vers le projet courant. Le but n'est pas de decouvrir un
depot inconnu — celui-ci est connu et conventionne (`agent-os/standards/`, `src/pages/<feature>/`)
— mais de **rassembler en une passe ce que `/sk-prep` devrait sinon rechercher a chaque run** :
ce qui existe deja, ou, sous quel contrat API, avec quels tests. On travaille donc sur un corpus
bien plus petit que le monolithe legacy (ordre de grandeur : quelques milliers de fichiers de
chaque cote) et **beaucoup mieux cible par la structure** : une flotte d'agents n'est justifiee
que si le perimetre deborde largement un dossier de page.

Difference majeure avec le legacy : **ce code bouge**. Un etat des lieux sans commit de reference
se perime en silence. D'ou l'ancrage git de l'etape A.2, qui permet a `/sk-prep` de verifier
mecaniquement la fraicheur au lieu de faire confiance.

## Variables

- **`FRONT_ROOT`** : racine git du depot courant (`git rev-parse --show-toplevel`), celui d'ou la
  commande est lancee.
- **`BACK_ROOT`**, resolu dans cet ordre — contrat complet dans
  [`~/.claude/skills/_shared/sk-repos.md`](../_shared/sk-repos.md) :
  1. `.sk/repos.json` du depot courant, cle `backend` ;
  2. la variable d'environnement `SK_BACK_ROOT` ;
  3. rien → etat des lieux **front seul**, dit explicitement dans le document, avec la phrase
     « backend non renseigne — `/sk-init` enregistre son chemin ». Jamais un defaut devine.
  Cle `backend` a `null` → le projet n'a pas de backend : front seul, sans avertissement, c'est
  une reponse et non un oubli.
  **Depot git distinct**, avec sa propre branche et son propre commit. Chemin renseigne mais
  dossier absent du disque → dis-le et fais l'etat des lieux front seul ; ne cherche pas ailleurs.
- **`DOCS_OUT`** : `docs/code-search/` a la racine de `FRONT_ROOT`.

## A. Pre-workflow (toi, inline)

### 1. Cadrage

`$ARGUMENTS` vide ou trop vague pour deriver 2-3 mots-cles (« fais le point sur le projet ») →
**une seule** `AskUserQuestion` : quel ecran, quelle fonctionnalite, quel domaine. Une question
large mais situee (« l'ecran Tickets de bout en bout ») se traite directement : c'est le cas
d'usage.

### 2. Ancrage git des deux depots (AVANT toute lecture)

```bash
SK_REPOS="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")/.sk/repos.json"
jq -r '.backend // empty' "$SK_REPOS" 2>/dev/null   # -> BACK_ROOT
git -C "<FRONT_ROOT>" rev-parse --short HEAD && git -C "<FRONT_ROOT>" branch --show-current
git -C "<FRONT_ROOT>" status --porcelain | head -20
git -C "<BACK_ROOT>"  rev-parse --short HEAD && git -C "<BACK_ROOT>"  branch --show-current
git -C "<BACK_ROOT>"  status --porcelain | head -20
```

Retiens pour chaque depot : **commit court, branche, working tree propre ou sale**. Ces trois
informations vont dans l'en-tete du document — c'est ce qui rend l'etat des lieux verifiable
plus tard, et c'est la seule chose que le legacy ne pouvait pas offrir.

**Signale explicitement**, sans bloquer, deux situations qui faussent la lecture :
- branche autre que `dev` → le document decrit du code **non merge** ;
- working tree sale → il decrit du code **non commite**, invisible pour qui relira le commit.

Ne bascule pas d'autorite sur `origin/dev` : le developpeur veut generalement l'etat de la branche
sur laquelle il travaille. Mais si les deux depots sont sur des branches sans rapport, pose la
question — un front sur `dev` decrit avec un back de feature produit un contrat API fictif.

### 3. Detection ciblee — la structure d'abord, le grep ensuite

**Front.** Le projet est conventionne, exploite-le avant tout grep :

```bash
ls "<FRONT_ROOT>/src/pages"                  # un dossier = un ecran
ls -R "<FRONT_ROOT>/src/pages/<feature>"     # si le nom matche la question
```

Un dossier de `src/pages/` qui correspond a la question rend l'essentiel du perimetre. Complete
ensuite par les dossiers transverses, cibles par mots-cles et **jamais parcourus entierement** :
`src/api/` (appels reseau, cles TanStack Query), `src/hooks/`, `src/components/`, `src/store/`
(slices Redux), `src/routes/`, `src/types/` (models, DTO, mappers), `src/__tests__/` et les
`*.test.ts(x)` colocalises.

```
Grep(pattern: "<variante>", path: "<FRONT_ROOT>/src", glob: "*.{ts,tsx}",
     output_mode: "files_with_matches", -i: true)
```

**Back — cible par le front, pas par mots-cles.** C'est ce qui evite un scan .NET aveugle :
releve dans les fichiers `src/api/` trouves les **URLs et verbes HTTP** reellement appeles, puis
cherche les routes correspondantes cote back.

```
Grep(pattern: "<segment d'URL releve cote front>", path: "<BACK_ROOT>",
     glob: "*.cs", output_mode: "files_with_matches", -i: true)
```

Puis remonte le fil depuis chaque controller trouve : service, repository/EF, DTO, mapper. Exclus
toujours `bin/`, `obj/`, `packages/`, `node_modules/`, `dist/`, `coverage/`.

**Classement par couche**, d'apres le chemin :

| Chemin | Couche |
|---|---|
| `src/pages/<feature>/` | Ecran (composants, hooks locaux) |
| `src/components/`, `src/hooks/` | Partage front |
| `src/api/`, `src/types/` | Contrat front (appels, models/DTO/mappers) |
| `src/store/`, `src/providers/`, `src/routes/` | Etat, contexte, routage |
| `*.test.ts(x)`, `src/__tests__/`, `src/__mocks__/` | Tests front |
| `<BACK_ROOT>/**/Controllers/` | Controller API |
| `<BACK_ROOT>/**/Services/`, `**/Repositories/` | Metier / acces donnees back |
| `<BACK_ROOT>/**/*Dto*.cs`, `**/Models/` | Contrat back |
| `<BACK_ROOT>/**/*Tests*/` | Tests back |

**Priorisation** au-dela de ~30 fichiers : d'abord le dossier de page, puis le contrat API
(front `src/api` + controllers back — c'est ce qui sert le plus a `/sk-prep`), puis les tests,
puis le partage. **Journalise ce qui est ecarte** : la liste ira dans le document.

**0 hit** apres toutes les variantes → ne fabrique rien. L'ecran n'existe peut-etre pas encore :
le document dira « aucun code correspondant trouve dans FRONT_ROOT/BACK_ROOT au commit X, variantes
testees : [...] », ce qui est **une information utile** pour `/sk-prep` (feature entierement neuve).

### 4. Mesure avant lots

```bash
wc -l <fichiers retenus>
```

Un fichier > ~1500 lignes part seul dans son lot ; > ~4000, ajoute un `focus` (symboles reperes a
l'etape 3). Un lot ne depasse jamais ~3000 lignes cumulees.

### 5. Mode direct ou flotte — decide, ne lance pas par reflexe

- **≤ 8 fichiers retenus, ou ≤ ~1500 lignes cumulees** → **lecture directe par toi**, aucun agent,
  aucun `Workflow`. Tu lis, tu rediges, tu passes en C. C'est le cas courant d'un ecran bien range.
- **au-dela** → `Workflow` avec le script ci-dessous, **4 a 8 lots** de 1-3 fichiers lies (un
  composant et son hook, un controller et son service, une paire source/test). Au-dela de 8 lots,
  reprends la priorisation de l'etape 3 plutot que de gonfler la flotte : le corpus est petit,
  un fan-out large ne se justifie pas ici.

Passe `args = { frontRoot, backRoot, question, gitAnchor, batches, droppedCandidates }`.

## B. Script du workflow

```javascript
export const meta = {
  name: 'code-search',
  description: 'Scrape parallele (Haiku) de lots de fichiers cibles du projet courant (front + back), synthese Sonnet, retour du corps markdown de l etat des lieux.',
  phases: [
    { title: 'Scrape', detail: 'extraction factuelle par lot, Haiku' },
    { title: 'Synthese', detail: 'fusion et redaction, Sonnet' },
  ],
}

const cfg = (typeof args === "string" ? JSON.parse(args) : args) || {}
const QUESTION = cfg.question
const BATCHES  = cfg.batches || []
const DROPPED  = cfg.droppedCandidates || []
const ANCHOR   = cfg.gitAnchor || null

if (!QUESTION) throw new Error('args.question manquant — abandon avant tout scrape.')
if (!Array.isArray(BATCHES) || BATCHES.length === 0) {
  return { status: 'not_found', markdown: null, scrapeCount: 0, droppedCandidates: DROPPED }
}

const SCRAPE_SCHEMA = { type:'object', required:['file','layer','summary'], properties:{
  file:{ type:'string' }, layer:{ type:'string' }, summary:{ type:'string' },
  citations:{ type:'array', items:{ type:'string' } },       // "chemin:ligne — extrait court"
  capabilities:{ type:'array', items:{ type:'string' } },     // ce que ce fichier permet de faire
  apiCalls:{ type:'array', items:{ type:'string' } },         // "GET /api/x — hook/methode appelante"
  types:{ type:'array', items:{ type:'string' } },            // model/DTO/mapper + champs notables
  tests:{ type:'array', items:{ type:'string' } },            // cas couverts, ou absence constatee
  attentionPoints:{ type:'array', items:{ type:'string' } },   // TODO, code mort, duplication VISIBLE
  relatedSymbols:{ type:'array', items:{ type:'string' } } } }

const SYNTH_SCHEMA = { type:'object', required:['markdown'], properties:{
  markdown:{ type:'string' },
  sourcesCited:{ type:'array', items:{ type:'string' } },
  notExplored:{ type:'array', items:{ type:'string' } } } }

phase('Scrape')

const SCRAPE_RULES =
  `OUTILS : Read UNIQUEMENT, et seulement sur les chemins listes ci-dessus. Grep, Glob, Bash et ` +
  `toute exploration hors de cette liste sont INTERDITS — le ciblage a deja ete fait, une ` +
  `exploration libre ferait pendre la flotte. Fichier de plus de 1500 lignes : lis les 1500 ` +
  `premieres et signale la troncature dans "summary".`

const scrapePrompt = (batch) =>
  `Extraction FACTUELLE, lecture seule, AUCUNE interpretation ni supposition. Etat des lieux ` +
  `demande : "${QUESTION}".\n` +
  `Lis integralement : ${JSON.stringify(batch.files)} (couche declaree : ${batch.layer}).\n` +
  (batch.focus ? `Zone a cibler en priorite : ${batch.focus}.\n` : ``) +
  SCRAPE_RULES + `\n` +
  `Extrais UNIQUEMENT ce qui est ecrit : ce que le fichier permet de faire (capabilities, ` +
  `formulees cote UTILISATEUR quand c'est un ecran : "filtrer par statut", pas "useMemo sur rows"), ` +
  `les appels API avec verbe et URL, les types/DTO/mappers et leurs champs, les cas de test ` +
  `couverts. Dans "attentionPoints", UNIQUEMENT du constatable : TODO/FIXME litteral, absence de ` +
  `test sur un fichier de logique, duplication visible entre deux fichiers du meme lot, code ` +
  `inatteignable. JAMAIS un jugement d'architecture ni une amelioration suggeree — ce document ` +
  `decrit, il ne prescrit pas. Chaque element de "citations" porte chemin + ligne. Si le fichier ` +
  `ne concerne pas la question, dis-le dans "summary" et laisse les tableaux vides.`

const firstPass = await pipeline(
  BATCHES,
  (batch) => agent(scrapePrompt(batch),
    { label: `scrape:${batch.id}`, phase: 'Scrape', model: 'haiku', schema: SCRAPE_SCHEMA })
    .then((r) => r ? { ...r, batchId: batch.id } : null)
)

const lost = BATCHES.filter((b, i) => !firstPass[i])
let recovered = []
if (lost.length) {
  log(`${lost.length}/${BATCHES.length} lot(s) perdu(s) au 1er passage — redispatch sur sonnet`)
  recovered = (await parallel(lost.map((batch) => () =>
    agent(scrapePrompt(batch),
      { label: `rescrape:${batch.id}`, phase: 'Scrape', model: 'sonnet', schema: SCRAPE_SCHEMA })
      .then((r) => r ? { ...r, batchId: batch.id } : null)
  ))).filter(Boolean)
}

const scraped = [...firstPass.filter(Boolean), ...recovered]
const recoveredIds = new Set(recovered.map((r) => r.batchId))
const missingBatches = lost.filter((b) => !recoveredIds.has(b.id))
  .map((b) => ({ id: b.id, layer: b.layer, files: b.files }))

if (scraped.length === 0) {
  return { status: 'not_found', markdown: null, scrapeCount: 0,
    droppedCandidates: DROPPED, missingBatches }
}

phase('Synthese')

const finalPrompt =
  `Redige le corps markdown FINAL d'un ETAT DES LIEUX du code EXISTANT, en francais, repondant a : ` +
  `"${QUESTION}".\n` +
  `Ancrage git (a ne pas reecrire, il est deja dans l'en-tete) : ${JSON.stringify(ANCHOR)}\n` +
  `Faits bruts extraits (JSON, un objet par fichier lu) :\n${JSON.stringify(scraped)}\n` +
  `Structure IMPOSEE, aucune section vide sans le dire explicitement :\n` +
  `## Index\n(sommaire lisible SEUL : une ligne par capacite existante "- E<n> — <libelle cote ` +
  `utilisateur>", puis une ligne par point d'attention "- A<n> — <constat>". ≤ 120 caracteres, ` +
  `AUCUNE citation, AUCUN chemin, AUCUN numero de ligne. Numerotation continue depuis 1, ` +
  `identifiants stables repris a l'identique plus bas.)\n` +
  `## Etat des lieux en bref\n(3-5 phrases : ce qui existe deja, ce qui n'existe pas, ou en est ` +
  `la couverture de tests. Rien d'autre.)\n` +
  `## Ce qui existe\n(une sous-section "### E<n> — <libelle>" PAR capacite existante : ce qu'elle ` +
  `fait, les fichiers front qui la portent, l'endpoint back si elle en appelle un, cites ` +
  `fichier+ligne. C'est la section que /sk-prep lit pour ne PAS respecifier l'existant.)\n` +
  `## Fichiers concernes\n(tableau : chemin | couche | role en une phrase. Ce sont des chemins du ` +
  `PROJET COURANT : ce sont des cibles de modification legitimes.)\n` +
  `## Contrat API\n(tableau : verbe + route | appelant front (hook/fonction) | DTO/model | mapper. ` +
  `Une ligne par endpoint reellement appele. C'est ce qui permet de trancher front pur vs depend ` +
  `backend sans rouvrir le back.)\n` +
  `## Tests existants\n(tableau : fichier de test | ce qui est couvert | ce qui ne l'est visiblement ` +
  `pas. Une zone de logique sans aucun test se dit ici, factuellement.)\n` +
  `## Points d'attention\n(liste a puces, un constat PAR LIGNE, prefixe : "- A<n> — <constat> — ` +
  `<fichier>, ligne <n>". Uniquement du CONSTATABLE : TODO litteral, absence de test, duplication ` +
  `visible, code inatteignable. Aucune recommandation, aucun jugement d'architecture. Une ligne ` +
  `reste extractible par un seul grep sur "- A<n> ".)\n` +
  `## Zones non explorees\n(explicite : ce que la question couvre mais qu'aucun fait extrait ` +
  `n'eclaire — vide seulement si tout a ete couvert.)\n` +
  `REGLE ABSOLUE : toute affirmation est tracable a une citation presente dans les faits fournis. ` +
  `Ce qui n'y figure pas va dans "Zones non explorees", jamais complete par supposition.\n` +
  `REGLE DE COHERENCE : tout E<n> et tout A<n> de l'index existe plus bas, et reciproquement. ` +
  `L'index doit suffire a savoir ce qui est deja fait, sans ouvrir le reste du document.\n` +
  `REGLE DE PORTEE : ce document DECRIT l'existant. Il ne propose aucune refonte, aucune ` +
  `amelioration, aucune estimation. Le QUOI faire est le travail de /sk-prep, pas le tien.`

let final = null
for (let attempt = 1; attempt <= 2 && !(final && final.markdown); attempt++) {
  try {
    final = await agent(finalPrompt,
      { label: attempt === 1 ? 'synth-final' : 'synth-final-retry', phase: 'Synthese',
        model: 'sonnet', schema: SYNTH_SCHEMA })
  } catch (e) {
    log(`synth-final tentative ${attempt} abandonnee : ${(e && e.message) || 'erreur inconnue'}`)
    final = null
  }
}

if (!final || !final.markdown) {
  return { status: 'partial', markdown: null, facts: scraped, scrapeCount: scraped.length,
    droppedCandidates: DROPPED, missingBatches }
}

return { status: 'ok', markdown: final.markdown, sourcesCited: final.sourcesCited || [],
  notExplored: final.notExplored || [], scrapeCount: scraped.length,
  droppedCandidates: DROPPED, missingBatches }
```

## C. Post-workflow (toi — redaction et verification, jamais deleguees)

1. **Selon `status`** (en mode direct A.5, tu rediges toi-meme le corps au meme format) :
   - `not_found` → **ecris quand meme le document**, court : « aucun code correspondant trouve au
     commit X, variantes testees : [...] ». C'est une information exploitable par `/sk-prep`
     (feature neuve), contrairement au legacy ou l'absence signifiait surtout un echec de recherche.
   - `partial` → les faits bruts sont dans `facts` : rediges toi-meme le corps au format impose,
     **`## Index`, `### E<n>` et `- A<n>` compris**, avec la meme exigence de citation.
   - `missingBatches` non vide → leurs fichiers vont dans « Zones non explorees », mention
     « non lu — agent abandonne ».

2. **Verification factuelle par echantillonnage (obligatoire, profil C)** : choisis 3 affirmations
   portant une citation et **relis toi-meme** ces emplacements. Une citation fausse ou introuvable
   → corrige ou retire avant d'ecrire. Verifie en particulier **une ligne du `## Contrat API`** :
   c'est la section dont `/sk-prep` se sert pour decider front pur vs depend backend, une route
   inexacte y coute une US entiere.

3. **Controler l'index avant d'ecrire** — les identifiants de `## Index` et ceux du corps doivent
   former le meme ensemble, dans les deux sens :

   ```bash
   sed -n '/^## Index/,/^## Etat des lieux/p' <fichier> | grep -oE '^- [EA][0-9]+'
   sed -n '/^## Etat des lieux/,$p'           <fichier> | grep -oE '^### E[0-9]+|^- A[0-9]+'
   ```

4. **Chemin de sortie** : `<FRONT_ROOT>/docs/code-search/<slug>.md`, `<slug>` = kebab-case de la
   question (≤ 60 caracteres). Cree le dossier s'il n'existe pas.

5. **Fichier deja existant** → `AskUserQuestion` (Ecraser / Renommer / Annuler). Un etat des lieux
   precedent porte un autre commit : proposer **Ecraser** par defaut a du sens ici (le nouveau est
   plus frais), mais ne le fais jamais sans demander.

6. **Ecrire** avec cet en-tete — l'ancrage git en fait partie, il n'est pas decoratif :

   ```markdown
   # Etat des lieux — <titre derive de la question>

   > Genere le <date du jour> — question : « <question exacte> »
   > Front `<FRONT_ROOT>` : commit `<sha>` sur `<branche>` — working tree <propre|SALE>
   > Back  `<BACK_ROOT>`  : commit `<sha>` sur `<branche>` — working tree <propre|SALE>   (ou « non explore »)
   > Fichiers lus : <scrapeCount> — candidats ecartes : <n> — lots non lus : <n>
   > Index : <nb E> capacite(s) existante(s), <nb A> point(s) d'attention.
   > **Fraicheur** : ce document decrit ces commits. Avant de t'en servir, verifie ce qui a bouge :
   > `git diff --name-only <sha front>..HEAD -- <fichiers cites>` (idem back). Seuls les fichiers
   > listes par cette commande sont a relire — pas le document entier.

   <corps, `## Index` en premier>

   <si candidats ecartes : section finale "## Candidats ecartes a la detection" avec le motif>
   ```

   Si une branche n'est pas `dev`, ou si un working tree est sale, ajoute une ligne
   `> **Attention** : <depot> decrit du code non merge / non commite.`

7. **Restituer** : chemin du fichier, 2-3 phrases sur ce qui existe deja, nombre de `E<n>`/`A<n>`,
   mention si « Zones non explorees » n'est pas vide, et rappel que le chemin se passe tel quel a
   `/sk-prep`, qui verifiera la fraicheur par `git diff` avant de s'en servir.

## D. Si un agent reste bloque

Meme filet que `/sk-legacy-search` : le runner coupe un agent sans progres pendant 60 s et relance
jusqu'a 5 fois, mais **pas** un agent bloque a l'interieur d'un appel d'outil — d'ou l'interdiction
de tout outil autre que `Read` dans le prompt de scrape. `/workflows` → **Retry agent** ou
**Skip agent** (le lot repart alors sur sonnet). Blocage profond → **Kill**, puis
`Workflow({ scriptPath: '<chemin rendu>', resumeFromRunId: '<runId>' })` : les lots deja scrapes
reviennent du cache.

## Garde-fous

- **Ancrage git obligatoire.** Un etat des lieux sans commit, branche et etat du working tree pour
  chaque depot explore n'est pas livrable : il devient faux en silence et `/sk-prep` s'en servira
  comme d'une dispense de recon. C'est la difference de fond avec un document sur le legacy.
- **Branche hors `dev` ou tree sale : dit dans l'en-tete**, jamais passe sous silence.
- **La structure avant le grep.** `ls src/pages/` puis le dossier de la feature rendent l'essentiel
  du perimetre front ; le back se cible sur les URLs relevees dans `src/api/`, jamais par mots-cles
  a l'aveugle sur 2200 fichiers `.cs`.
- **Flotte seulement au-dela du seuil** (A.5) : ≤ 8 fichiers ou ≤ 1500 lignes = lecture directe,
  aucun agent. Sur ce corpus, un fan-out large est du gaspillage, pas de la rigueur.
- **Le document DECRIT, il ne prescrit pas.** Aucune recommandation de refonte, aucune estimation,
  aucun jugement d'architecture — ni dans les scrapes, ni dans la synthese. Les `A<n>` sont des
  constats verifiables (TODO litteral, test absent, duplication visible), pas des opinions. Le QUOI
  faire appartient a `/sk-prep`.
- **Aucune invention** : citation fichier(+ligne) exigee partout, « Zones non explorees » plutot
  qu'une supposition, et verification d'un echantillon par toi avant ecriture — dont une ligne du
  `## Contrat API`.
- **Lecture seule des deux depots** : aucun `Write`/`Edit` en dehors de `DOCS_OUT`.
- **Ecriture jamais automatique par-dessus un document existant** — confirmation utilisateur.
- **Adjudication et ecriture finale chez toi**, jamais deleguees a un subagent.
