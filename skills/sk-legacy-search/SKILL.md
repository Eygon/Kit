---
name: sk-legacy-search
description: Recherche EXHAUSTIVE et FACTUELLE d'un élément (écran, logique métier, champ, règle, endpoint, table) dans le dépôt legacy monolithique du projet — son chemin est lu dans .sk/repos.json (clés legacyBackend / legacyFrontend, écrites par /sk-init), jamais codé en dur ; heuristiques calibrées pour une stack .NET (ASP.NET WebAPI + NHibernate/EF) avec client lourd WPF —, sans avoir à l'ouvrir manuellement dans un IDE. Détecte d'abord les portions pertinentes du dépôt (recherche ciblée par mots-clés multi-variantes, classée par couche : Controllers/Services/DAL/Dto/Profiles/Scripts SQL/Views-ViewModels WPF), lance une FLOTTE d'agents Haiku qui scrapent chacun un petit lot de fichiers pour en extraire les faits bruts (signatures, champs, requêtes, règles métier littérales, citées fichier+ligne), fait synthétiser ces faits par des agents Sonnet (fusion, dédup, résolution des contradictions), puis rédige — l'orchestrateur lui-même, jamais délégué — un fichier .md dans docs/legacy-search/ du dépôt courant : la réponse complète et sans fioriture à la question posée (logique de bout en bout, fichiers concernés, champs disponibles, règles métier, zones non trouvées explicitement signalées plutôt qu'inventées). Se déclenche sur des besoins du type "comment marche l'écran X dans le legacy", "où est calculé/stocké Y côté back-office historique", "quels champs sont disponibles pour Z dans l'ancien système".
argument-hint: "<question ou élément à chercher dans le legacy> [chemin du dépôt legacy si différent de celui enregistré]"
disable-model-invocation: true
allowed-tools: Workflow Agent Bash PowerShell Read Write Glob Grep AskUserQuestion ToolSearch
---

# Recherche factuelle dans un depot legacy (`/sk-legacy-search`)

Question / élément à chercher : **$ARGUMENTS**

> **Déclenchement Workflow (turn-scoped, PAS session-scoped).** Cette commande est une
> slash-command dont les instructions demandent explicitement d'appeler `Workflow` — c'est un
> opt-in valide en soi, aucun mot-clé n'est nécessaire, et il ne vaut que pour ce tour.
>
> **Profil de livrable : document.** Preuve de succès =
> conformité au template + **ancrage factuel à 100 %** (toute affirmation cite un fichier, si
> possible une ligne, et ce fichier existe réellement). Un document qui invente un chemin ou une
> règle est **pire qu'une absence de document** : il sera lu comme une source fiable. En cas de
> doute sur un fait, écris-le dans « Zones non trouvées / incertaines », n'arrondis jamais.

## Esprit de cette commande

Le dépôt cible est un monolithe **legacy** de plusieurs dizaines de milliers de fichiers (ASP.NET
WebAPI 2 + NHibernate côté serveur, client **WPF** côté écrans historiques — cf. son propre
`CLAUDE.md`). L'ouvrir à la main est trop lent ; le lire intégralement avec un seul agent dépasse
tout budget de contexte. Le seul chemin viable : **rétrécir avant de lire** (détection ciblée par
mots-clés, jamais un grep générique sur tout le dépôt sans filtre), **paralléliser la lecture**
(une flotte Haiku, un petit lot de fichiers chacun, extraction mécanique et non interprétative),
puis **concentrer le jugement** (Sonnet pour fusionner et rédiger, toi pour trancher et écrire le
fichier final). Aucune étape ne doit inventer un fait absent des fichiers réellement lus.

## Variables

- **`LEGACY_ROOT`**, résolu dans cet ordre, premier gagnant — contrat complet dans
  [`~/.claude/skills/_shared/sk-repos.md`](../_shared/sk-repos.md) :
  1. un second chemin explicite dans `$ARGUMENTS` ;
  2. `.sk/repos.json` du dépôt courant, clé `legacyBackend` ou `legacyFrontend` (voir juste
     en dessous laquelle) ;
  3. la variable d'environnement `SK_LEGACY_ROOT` ;
  4. rien → **STOP**. Aucun défaut deviné : « chemin du legacy inconnu — lance `/sk-init` pour
     le renseigner, ou passe-le en second argument ».

  **Quelle clé ?** Le fichier en porte deux, parce qu'un legacy a souvent un dépôt serveur et un
  dépôt client distincts. Si une seule des deux est renseignée (l'autre à `null`), prends-la sans
  demander. Si les deux le sont, **une** `AskUserQuestion` : *backend* (règles métier, endpoints,
  accès données), *frontend* (écrans, ViewModels, comportements visibles) ou *les deux* — auquel
  cas tu constitues des lots sur les deux racines et le document dit, pour chaque fichier, de
  laquelle il vient. Une question sur l'écran d'un utilisateur veut souvent les deux : le
  déclencheur est côté client, la règle côté serveur.

  Ce skill n'est **pas** verrouillé à un dépôt : la méthode — rétrécir, paralléliser la lecture,
  concentrer le jugement — vaut pour n'importe quel monolithe legacy. Seules les heuristiques de
  classement par couche (§A.3) et les extensions de fichiers sont propres à une stack .NET/WPF.
- **`DOCS_OUT`** : `docs/legacy-search/` **à la racine git du dépôt courant** (celui d'où la
  commande est lancée, c'est-à-dire le projet actuel qui reprend l'existant — jamais
  automatiquement `LEGACY_ROOT`, sauf si c'est lui le dépôt courant).

## A. Pré-workflow (toi, inline, avec recherche ciblée AVANT tout agent)

### 0. Cadrage de la question

Si `$ARGUMENTS` est vide ou trop vague pour dériver au moins 2-3 mots-clés distincts (ex. juste
« cherche des trucs »), **une seule** `AskUserQuestion` : demander l'élément précis (nom d'écran,
de champ, de règle métier, d'endpoint...). Sinon, **ne pas interrompre** : une question un peu
large (« toute la logique de l'écran Factures fournisseur ») se traite directement — c'est
justement le cas d'usage.

### 1. Résoudre puis vérifier `LEGACY_ROOT`

```bash
SK_REPOS="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")/.sk/repos.json"
jq -r '.legacyBackend // empty, .legacyFrontend // empty' "$SK_REPOS" 2>/dev/null
test -d "<LEGACY_ROOT en forme POSIX>" && echo OK
```

Fichier `.sk/repos.json` absent, ou les deux clés à `null` alors qu'aucun chemin n'est passé en
argument → **STOP** : « pas de dépôt legacy enregistré pour ce projet — `/sk-init` le renseigne,
ou passe le chemin en second argument ». Ne cherche pas sur le disque.

Chemin connu mais dossier absent → **STOP** aussi, en le nommant : le dépôt a été déplacé, ou le
drive n'est pas monté. `/sk-init` corrige le fichier. Ne devine pas un voisin plausible.

### 2. Dérivation des variantes de mots-clés

À partir de la question, écris **toi-même** (pas d'agent pour ça, c'est trivial et gratuit) une
liste de 5 à 15 variantes couvrant :
- forme exacte de la question + termes métier qu'elle contient,
- **PascalCase / camelCase / kebab-case / snake_case** de chaque terme (nommage legacy en
  PascalCase pour les classes, cf. `CLAUDE.md` du dépôt),
- **synonymes FR/EN** (le code est en anglais — propriétés en anglais — mais les commentaires et
  scripts SQL mélangent parfois du français métier),
- **suffixes de couche probables** : `*Controller`, `*Service`, `*Repository`, `*Dto`,
  `*Profile` (AutoMapper), `View`/`ViewModel`/`Window`/`UserControl` (client WPF), `.hbm.xml`
  (mapping NHibernate), noms de tables SQL plausibles (souvent préfixées, cf. `Scripts/`).

### 3. Détection des portions pertinentes (recon RAPIDE et CIBLÉE — jamais un scan intégral)

Pour chaque variante, un `Grep` **filtré par extension pertinente**, jamais sur tout `LEGACY_ROOT`
sans filtre (le dépôt contient `bin/`, `obj/`, `packages/`, `.vs/`, `Binaries/`, `TestResults/` —
à exclure systématiquement via le paramètre `glob` de `Grep`, jamais parcourus) :

```
Grep(pattern: "<variante>", path: LEGACY_ROOT,
     glob: "*.{cs,aspx,ascx,xaml,cshtml,sql,config,hbm.xml}",
     output_mode: "files_with_matches", -i: true)
```

Complète par `Glob` sur les **noms de fichiers** eux-mêmes (`**/*<Variante>*.cs`,
`**/*<Variante>*.xaml`, ...) — un hit sur le nom de fichier pèse plus qu'un hit dans le contenu.

**Classe chaque fichier trouvé par couche**, d'après son chemin (heuristique sur les segments) :

| Segment de chemin typique | Couche |
|---|---|
| `Servers\Septeo.SI.Serveur\...\Controllers\` | Controller (API) |
| `...\Services\` | Service (métier) |
| `...\DAL\Domain\` (dont `Requetes\`, `*.hbm.xml`) | Accès données NHibernate |
| `...\Dto\` ou `...\Dto.V2\` | DTO (contrat API, versionné) |
| `...\Profiles\` | Mapping AutoMapper DTO ↔ Domain |
| `...\Scripts\` | SQL (schéma / migrations) |
| `Client*\...\Views\`, `...\ViewModels\`, `*.xaml`, `*.xaml.cs` | Écran client WPF |

**Priorisation si trop de hits** (> ~35 fichiers candidats) : garder en priorité les hits sur le
nom de fichier, puis les fichiers avec le plus grand nombre de variantes matchées, puis un par
couche au minimum pour ne pas perdre le fil bout-en-bout. **Journalise ce qui est écarté** (liste
des fichiers exclus et pourquoi) — ce sera reporté dans le document final, jamais tronqué en
silence.

**Si 0 hit** après avoir essayé toutes les variantes (y compris `-i` et recherche partielle) :
élargir une dernière fois avec les 2-3 termes les plus génériques de la question, puis, si
toujours rien, **ne pas fabriquer de contenu** — le document final devra dire explicitement
« élément non localisé dans `LEGACY_ROOT` avec les variantes testées : [liste] ».

### 4. Construction des lots (`batches`) pour la flotte Haiku

Regroupe les fichiers retenus en lots de **1 à 3 fichiers fortement liés** (ex. un Controller +
son Service associé, ou une paire `.xaml`/`.xaml.cs`) — jamais un lot qui mélangerait des couches
sans rapport. Vise **8 à 15 lots** au total (garde-fou de taille de workflow de cette session) ;
si la détection en produit davantage, applique la priorisation de l'étape 3 plutôt que de gonfler
la flotte. Chaque lot porte : `{ id, files: [chemins absolus], layer }`.

**Mesure la taille AVANT de constituer les lots** — c'est ce qui évite les agents qui pendent :

```bash
wc -l <fichiers retenus>
```

Un fichier de plus de ~2000 lignes part **seul dans son lot**. Au-delà de ~5000 lignes, ne le passe
pas nu : ajoute au lot un champ `focus` (les 2-3 symboles ou numéros de ligne repérés à l'étape 3)
pour que l'agent sache où lire au lieu de balayer. Un lot ne dépasse jamais ~4000 lignes cumulées.

### 5. Lancer le Workflow

Passe `args = { legacyRoot, question, batches, droppedCandidates, notFoundNote }` à l'outil
**Workflow** avec le script ci-dessous. Pas de validation humaine intermédiaire nécessaire ici
(profil C, lecture seule, aucun effet sur le dépôt legacy) — la vérification factuelle se fait en
post-workflow, sur le document produit.

## B. Script du workflow

```javascript
export const meta = {
  name: 'legacy-search',
  description: 'Scrape parallèle (Haiku) de lots de fichiers legacy ciblés, synthèse par couche puis finale (Sonnet), retour du corps markdown répondant à la question.',
  phases: [
    { title: 'Scrape', detail: 'extraction factuelle par lot, Haiku' },
    { title: 'Synthese', detail: 'fusion par couche puis finale, Sonnet' },
  ],
}

const cfg = (typeof args === "string" ? JSON.parse(args) : args) || {}
const QUESTION   = cfg.question
const BATCHES    = cfg.batches || []
const DROPPED    = cfg.droppedCandidates || []
const NOT_FOUND  = cfg.notFoundNote || null

if (!QUESTION) throw new Error('args.question manquant — abandon avant tout scrape.')
if (!Array.isArray(BATCHES) || BATCHES.length === 0) {
  return { status: 'not_found', markdown: null, notFoundNote: NOT_FOUND || 'Aucun lot de fichiers candidat.' , scrapeCount: 0, droppedCandidates: DROPPED }
}

const SCRAPE_SCHEMA = { type:'object', required:['file','layer','summary'], properties:{
  file:{ type:'string' }, layer:{ type:'string' }, summary:{ type:'string' },
  citations:{ type:'array', items:{ type:'string' } },      // "chemin:ligne — extrait court"
  fields:{ type:'array', items:{ type:'string' } },          // "NomChamp (type) — SOURCE PHYSIQUE : table.colonne
                                                             // telle que le MAPPING la nomme, jamais le nom C#.
                                                             // Un DTO n'est PAS une source : remonte l'entite et
                                                             // son mapping (FluentNHibernate `Map(x => x.P).Column("...")`,
                                                             // ClassMap co-localise avec l'entite, ou .hbm.xml).
                                                             // Champ calcule -> "CALCULE dans <fichier:ligne>".
                                                             // Mapping introuvable -> "MAPPING NON CAPTURE" en clair.
  businessRules:{ type:'array', items:{ type:'string' } },    // règle métier LITTÉRALE trouvée dans le code/commentaire
  relatedSymbols:{ type:'array', items:{ type:'string' } } } } // classes/méthodes/tables appelées ailleurs, pour tracer le fil

const SYNTH_SCHEMA = { type:'object', required:['markdown'], properties:{
  markdown:{ type:'string' },
  sourcesCited:{ type:'array', items:{ type:'string' } },
  notFound:{ type:'array', items:{ type:'string' } } } }

phase('Scrape')

const SCRAPE_RULES =
  `OUTILS : Read UNIQUEMENT, et seulement sur les chemins listés ci-dessus. Grep, Glob, Bash et ` +
  `toute exploration hors de cette liste sont INTERDITS — sur ce monolithe un grep non filtré pend ` +
  `plusieurs dizaines de minutes et bloque toute la flotte. Un fichier de plus de 2000 lignes : lis ` +
  `les 2000 premières et signale la troncature dans "summary" au lieu d'enchaîner les offsets.`

const scrapePrompt = (batch) =>
  `Extraction FACTUELLE, lecture seule, AUCUNE interprétation ni supposition. Question de fond ` +
  `pour cadrer ce qui compte dans ces fichiers : "${QUESTION}".\n` +
  `Lis intégralement : ${JSON.stringify(batch.files)} (couche déclarée : ${batch.layer}).\n` +
  (batch.focus ? `Zone à cibler en priorité dans ces fichiers : ${batch.focus}.\n` : ``) +
  SCRAPE_RULES + `\n` +
  `Extrais UNIQUEMENT ce qui est écrit dans le fichier : signatures de méthodes pertinentes, ` +
  `champs/propriétés avec leur type, requêtes SQL/HBM, règles métier explicites (condition, ` +
  `validation, calcul) citées MOT POUR MOT ou quasi, et les symboles appelés/appelants ailleurs ` +
  `(pour permettre de suivre le fil vers une autre couche). Chaque élément de "citations" DOIT ` +
  `porter le chemin de fichier et si possible le numéro de ligne. N'invente RIEN qui ne soit pas ` +
  `dans le fichier ; si le fichier ne concerne pas la question, dis-le dans "summary" et laisse ` +
  `les tableaux vides.\n` +
  `MAPPING — pour CHAQUE champ que tu mets dans "fields" : donne sa SOURCE PHYSIQUE, pas son nom C#. ` +
  `Si le fichier que tu lis est une ENTITÉ ou son mapping (FluentNHibernate : classe \`XxxMap : ClassMap<Xxx>\` ` +
  `co-localisée avec l'entité, avec \`Table("...")\` et \`Map(x => x.Prop).Column("...")\` ; ou un .hbm.xml), ` +
  `relève la table et la colonne EXACTES : c'est la seule source qui fasse foi. Si le fichier est un DTO, ` +
  `un ViewModel ou un Profile AutoMapper, tu ne peux PAS conclure : écris le champ avec la mention ` +
  `\`MAPPING NON CAPTURÉ\` et mets dans "relatedSymbols" le nom de l'entité ou du Profile à ouvrir pour le ` +
  `trouver. Un champ visiblement calculé (Profile, service, propriété dérivée) : \`CALCULÉ dans <fichier:ligne>\`. ` +
  `Ne déduis JAMAIS un nom de colonne d'un nom de propriété : sur ce schéma les colonnes sont génériques ` +
  `(ParStrP1..P13, ParLng2..5, ParTin1, ParMon1..3) et aucune ne porte de nom métier.`

// pipeline() rend un résultat PAR LOT, aligné sur BATCHES. null = lot perdu : agent skippé par
// l'utilisateur depuis /workflows, erreur API terminale, ou abandon du runner après ses relances
// anti-stall. On ne filtre donc qu'APRÈS avoir identifié les perdus, pour pouvoir les redispatcher.
const firstPass = await pipeline(
  BATCHES,
  (batch) => agent(scrapePrompt(batch),
    { label: `scrape:${batch.id}`, phase: 'Scrape', model: 'haiku', schema: SCRAPE_SCHEMA })
    .then((r) => r ? { ...r, batchId: batch.id } : null)
)

const lost = BATCHES.filter((b, i) => !firstPass[i])
let recovered = []
if (lost.length) {
  log(`${lost.length}/${BATCHES.length} lot(s) perdu(s) au 1er passage (${lost.map((b) => b.id).join(', ')}) — redispatch sur sonnet`)
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
if (missingBatches.length) {
  log(`${missingBatches.length} lot(s) jamais scrapé(s) même après redispatch — signalés dans le document`)
}

if (scraped.length === 0) {
  return { status: 'not_found', markdown: null,
    notFoundNote: `Aucun lot n'a produit d'extraction utilisable (question: "${QUESTION}").`,
    scrapeCount: 0, droppedCandidates: DROPPED, missingBatches }
}

phase('Synthese')
// Synthèse PAR COUCHE seulement si le corpus est assez gros pour le justifier — sinon direct.
const byLayer = {}
for (const s of scraped) { (byLayer[s.layer] ||= []).push(s) }
const layerKeys = Object.keys(byLayer)

let layerSyntheses = []
if (scraped.length > 12 && layerKeys.length > 1) {
  layerSyntheses = (await parallel(layerKeys.map((layer) => () => agent(
    `Synthétise en français, SANS AUCUNE INVENTION, les faits extraits de la couche "${layer}" ` +
    `pour répondre à : "${QUESTION}".\n` +
    `Faits bruts (JSON, un objet par fichier lu) : ${JSON.stringify(byLayer[layer])}\n` +
    `Produis un paragraphe markdown dense (logique de cette couche, fichiers, champs, règles), ` +
    `chaque affirmation portant sa citation entre parenthèses. Liste "sourcesCited" (chemins) et ` +
    `"notFound" (ce que la question demande mais qu'aucun fait extrait ne couvre pour CETTE couche).`,
    { label: `synth-layer:${layer}`, phase: 'Synthese', model: 'sonnet', schema: SYNTH_SCHEMA }
  )))).filter(Boolean)
}

const finalInput = layerSyntheses.length
  ? layerSyntheses.map((s) => s.markdown).join('\n\n')
  : JSON.stringify(scraped)

const finalPrompt =
  `Rédige le corps markdown FINAL et COMPLET répondant à cette question sur un dépôt legacy : ` +
  `"${QUESTION}".\n` +
  `Source : ${layerSyntheses.length ? 'synthèses par couche déjà produites' : 'faits bruts extraits (JSON), un objet par fichier lu'} :\n` +
  `${finalInput}\n` +
  `Structure IMPOSÉE, sans fioriture, aucune section vide sans le dire explicitement :\n` +
  `## Réponse directe\n(2-4 phrases, la réponse à la question, rien d'autre)\n` +
  `## Logique complète\n(le déroulé de bout en bout, couche par couche : déclencheur → contrôleur → service → accès données → retour, avec CHAQUE règle métier citée fichier+ligne)\n` +
  `## Fichiers concernés\n(tableau : chemin | couche | rôle en une phrase)\n` +
  `## Champs disponibles\n(tableau : nom | type | SOURCE PHYSIQUE | où le mapping l'établit)\n` +
  `La colonne SOURCE PHYSIQUE porte \`table.colonne\` telle que le MAPPING la nomme, ou \`CALCULÉ\`, ou \`MAPPING NON CAPTURÉ\`. ` +
  `Un nom de DTO n'est JAMAIS une source : un DTO est le contrat de sortie d'un programme, il peut calculer ou agréger. ` +
  `Sur un schéma à colonnes génériques (T_Param : ParStrP1..P13, ParLng2..5, ParTin1, ParMon1..3), le nom C# ne ressemble ` +
  `jamais au nom de colonne — Email vit dans ParStrP8, Function dans ParStrP6. Un champ dont tu ne peux pas nommer la ` +
  `colonne physique va en \`MAPPING NON CAPTURÉ\` ET en "Zones non trouvées" : c'est un champ dont la source est INCONNUE, ` +
  `pas un champ documenté. Vécu (spec 902) : trois booléens de droits relevés dans un DTO, sans mapping ; le contrat d'API ` +
  `les a repris, le worker s'est bloqué, et une recherche par nom de colonne a conclu à tort qu'ils n'existaient pas.\n` +
  `## Règles métier identifiées\n(liste, chacune avec sa citation)\n` +
  `## Zones non trouvées / incertaines\n(explicite — vide seulement si vraiment tout a été couvert)\n` +
  `RÈGLE ABSOLUE : toute affirmation doit être traçable à une citation présente dans les faits ` +
  `fournis. Ce qui n'y figure pas va dans "Zones non trouvées", jamais complété par supposition.`

// Un throw ici (agent abandonné après les relances du runner) perdrait TOUS les scrapes : on le
// rattrape, on retente une fois, et à défaut on rend les faits bruts pour rédaction par l'orchestrateur.
let final = null
for (let attempt = 1; attempt <= 2 && !(final && final.markdown); attempt++) {
  try {
    final = await agent(finalPrompt,
      { label: attempt === 1 ? 'synth-final' : 'synth-final-retry', phase: 'Synthese',
        model: 'sonnet', schema: SYNTH_SCHEMA })
  } catch (e) {
    log(`synth-final tentative ${attempt} abandonnée : ${(e && e.message) || 'erreur inconnue'}`)
    final = null
  }
}

if (!final || !final.markdown) {
  return { status: 'partial', markdown: null, facts: scraped, scrapeCount: scraped.length,
    droppedCandidates: DROPPED, missingBatches }
}

return { status: 'ok', markdown: final.markdown, sourcesCited: final.sourcesCited || [],
  notFound: final.notFound || [], scrapeCount: scraped.length, droppedCandidates: DROPPED,
  missingBatches }
```

## C. Post-workflow (toi — rédaction et vérification, jamais déléguées)

1. **Selon `status`** :
   - `not_found` → ne rien écrire dans `docs/` ; explique la cause avec les variantes testées et
     propose d'élargir les mots-clés ou de préciser la question — pas de document sur du vide.
   - `partial` (les scrapes ont réussi, la synthèse finale a été abandonnée) → **ne jette pas le
     travail** : les faits bruts sont dans `facts`, rédige toi-même le corps au format imposé à
     partir de ces faits, avec la même exigence de citation, et signale-le à l'utilisateur.
   - `hard_error` → explique et propose de relancer.
   - `missingBatches` non vide, quel que soit le statut → leurs fichiers sont listés tels quels
     dans « Zones non trouvées / incertaines », mention « non lu — agent abandonné ». Jamais tu.

2. **Vérification factuelle par échantillonnage (obligatoire, profil C)** : choisis 3 affirmations
   du `markdown` retourné portant une citation fichier(+ligne), et **relis toi-même** ces
   emplacements avec `Read`/`Grep` pour confirmer qu'ils existent et disent bien ça. Une citation
   fausse ou introuvable → corrige ou retire l'affirmation avant d'écrire le fichier ; ne publie
   jamais un document dont l'échantillon de vérification a échoué.

3. **Résoudre le chemin de sortie** : racine git du dépôt courant
   (`git rev-parse --show-toplevel`) + `docs/legacy-search/<slug>.md`, `<slug>` = kebab-case de la
   question (courte, ≤ 60 caractères). Créer `docs/legacy-search/` s'il n'existe pas.

4. **Fichier déjà existant au même chemin** → `AskUserQuestion` (Écraser / Renommer avec un
   suffixe / Annuler) : un document déjà là a pu être édité manuellement depuis, ce n'est pas un
   artefact jetable.

5. **Écrire** le fichier avec un en-tête avant le corps produit par le workflow :
   ```markdown
   # <titre dérivé de la question>

   > Recherche legacy générée le <date du jour> — dépôt exploré : `<LEGACY_ROOT>` — question : « <question exacte> »
   > Fichiers lus : <scrapeCount> — candidats écartés à la détection : <len(droppedCandidates)> (voir liste en bas si non vide) — lots non lus : <len(missingBatches)>

   <markdown retourné par le workflow>

   <si droppedCandidates non vide : section finale "## Candidats écartés à la détection" avec la liste et le motif>
   ```

6. **Restituer à l'utilisateur** : chemin du fichier écrit, résumé en 2-3 phrases de la réponse
   directe, et mention explicite si la section « Zones non trouvées / incertaines » n'est pas
   vide.

## D. Si un agent reste bloqué pendant le run

Le runner coupe déjà un agent **sans progrès pendant 60 s** et le relance jusqu'à **5 fois** (visible
dans `/workflows` : `[stall] agent "…" stalled (no progress) after Ns — retrying (n/5)`). Ce filet ne
couvre PAS un agent bloqué **à l'intérieur d'un appel d'outil** : tant qu'un outil est en vol, le
compteur d'inactivité ne tourne pas. C'est exactement le cas d'un `Grep`/`Bash` lancé sur tout
`LEGACY_ROOT` — d'où l'interdiction de tout outil autre que `Read` dans le prompt de scrape.

Si un lot pend malgré tout, **ne tue pas le workflow** :

1. `/workflows` → le run → l'agent en cours → **Retry agent** (relance de zéro, compte dans les 5
   tentatives) ou **Skip agent** (l'agent rend `null`, et le script redispatche alors ce lot sur
   sonnet). Le reste de la flotte continue pendant ce temps.
2. Blocage plus profond → **Pause**, ou **Kill** puis reprise :
   `Workflow({ scriptPath: '<chemin rendu par l'appel Workflow>', resumeFromRunId: '<runId>' })` —
   les lots déjà scrapés reviennent du cache, seuls les manquants retournent.
3. Même lot bloqué deux fois → il est trop gros ou son chemin est sur un partage lent : sors-le des
   `batches`, journalise-le dans `droppedCandidates`, relance.

## Garde-fous

- **Rétrécir avant de lire, toujours.** Aucun `Grep`/`Glob` sans filtre d'extension ni exclusion
  de `bin/obj/packages/.vs/Binaries/TestResults` sur un dépôt de cette taille.
- **Aucune invention.** Scrape Haiku et synthèse Sonnet reçoivent tous deux l'ordre explicite de
  citer fichier(+ligne) et de déclarer « non trouvé » plutôt que de deviner ; toi, en post-workflow,
  vérifies un échantillon avant d'écrire quoi que ce soit dans `docs/`.
- **Pas de troncature silencieuse** : tout candidat écarté à la détection (étape A.3) est
  journalisé et reporté dans le document final, jamais juste abandonné.
- **Aucun lot perdu en silence** : un lot dont l'agent est skippé ou abandonné est redispatché une
  fois sur sonnet ; s'il échoue encore, il part dans `missingBatches` et atterrit dans « Zones non
  trouvées » du document. Un agent bloqué ne fait jamais échouer le run entier.
- **Flotte dimensionnée** : 8-15 lots Haiku (garde-fou de taille de session), synthèse par couche
  seulement si le corpus le justifie (> 12 fichiers ET plusieurs couches), sinon synthèse finale
  directe — pas de fan-out disproportionné pour une question ciblée.
- **Écriture jamais automatique par-dessus un document existant** — confirmation utilisateur.
- **Ce skill ne modifie jamais `LEGACY_ROOT`** : lecture seule de bout en bout, aucun `Write`/`Edit`
  n'y est jamais dirigé.
- **Adjudication et écriture finale chez toi**, jamais déléguées à un subagent : c'est toi qui
  vérifies l'échantillon factuel et qui écris le fichier dans `docs/`.
