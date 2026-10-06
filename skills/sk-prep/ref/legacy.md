# /sk-prep — Doc legacy de reference (lu seulement si un chemin docs/legacy-search/*.md est fourni)

## 0bis. Doc legacy de reference (conditionnel, AVANT la recon)

Declencheur : $ARGUMENTS porte un chemin de fichier .md
produit par /sk-legacy-search (typiquement
docs/legacy-search/<slug>.md). Aucun chemin fourni =
saute cette section, comportement inchange. Pas d auto
detection, pas de glob sur docs/ : c est le developpeur
qui designe le fichier, sinon tu cherches comme avant.

Ce doc N EST PAS un contrat (contrairement a design.md).
C est de la DOCUMENTATION D EXISTANT : il decrit ce que
fait le legacy, il ne prescrit rien. Reprendre une regle
est une decision explicite du developpeur, jamais une
consequence de sa presence dans le doc. Le besoin
($ARGUMENTS) reste le seul pilote du perimetre ; le doc
dit seulement ce qu il y a a reprendre, en partie ou en
totalite.

### 0bis.1 Lecture : l index d abord, le corps si besoin

Le doc porte "## Index" en tete : une ligne par
fonctionnalite F<n> et par regle R<n>, sans citation.
Lis-le SEUL :
  sed -n '1,60p' <chemin>
Il suffit dans la plupart des cas a ecrire le QUOI.
N ouvre une section du corps que si le besoin porte
dessus :
  grep -n '^## ' <chemin>  puis  sed -n '<a>,<b>p'
  grep '^- R7 ' <chemin>   pour une regle seule
  sed -n '/^### F3 /,/^### F4 /p'  pour une fonctionnalite
Ne charge JAMAIS le doc entier par reflexe : le detail
(citations fichier+ligne) sert a /sk-impl, pas au QUOI.

Doc SANS "## Index" (ecrit avant ce format, ou a la
main — c est le cas des deux docs de docs/legacy-search/
anterieurs au 2026-08-28) : ne le rejette pas. Prends sa
table des matieres (grep -n '^## ') et ne lis que les
sections utiles au besoin. Les AC et les ancres de taches
utilisent alors le TITRE EXACT de section
(`Legacy: <chemin>#<titre de section>`, grep-able par
grep -n '^## <titre>'), pas un F<n> inexistant. Ne
renumerote pas le doc toi-meme. Si la reprise est large
(plusieurs sections), propose a l utilisateur de
regenerer le doc via /sk-legacy-search pour obtenir un
index — sans bloquer le run.

### 0bis.2 LEGACY_ROOT hors limites

Le monolithe a deja ete scanne par /sk-legacy-search.
LEGACY_ROOT = le depot indique dans l en-tete du doc
("depot explore : ..."), pas une valeur codee en dur.
Les depots legacy du projet sont enregistres dans
.sk/repos.json (cles legacyBackend / legacyFrontend,
contrat : ~/.claude/skills/_shared/sk-repos.md) — c est
la meme source que /sk-legacy-search a utilisee.
Aucun Grep, Glob ou Read sur ces depots. Ce que le doc ne dit pas ne se
cherche pas : demande-le a l utilisateur, ou propose de
relancer /sk-legacy-search avec une question plus
precise. Re-grepper le monolithe annule le benefice de
la recherche prealable — c est la raison d etre du doc.

## Doc sans index (sans R<n>)

Ce que les regles ci-dessous disent de `- R<n> — ...` vaut pour la PUCE du
doc : recopie-la entiere (texte + sa citation fichier:ligne), suivie de
`(source : <chemin>#<titre exact de section>)`. Ancre de tache :
`Legacy: <chemin>#<titre exact>`. La regle recopiee garde SA langue, entre
guillemets, meme dans un trio en anglais (audit) : la traduire, c est la
paraphraser.

## Regles ajoutees aux etapes du trio (legacy)

### specify
  Si un doc legacy existe (0bis) : un AC qui reprend une
  regle historique RECOPIE LITTERALEMENT la ligne
  "- R<n> — ..." du doc (une ligne, telle que rendue par
  grep '^- R<n> '), suivie de "(source : <chemin>#R<n>)".
  Pas de paraphrase : la derive commence a la premiere
  reformulation. Raison : /sk-impl ne lit PAS docs/ —
  le Sonnet recoit tasks.md, le reviewer spec.md +
  tasks.md. Une regle retenue n est plus du legacy, c est
  une exigence du produit : le doc reste la source de ce
  qui EXISTE, la spec devient la source de ce qui est
  RETENU. Un comportement legacy NON retenu ne figure
  pas dans la spec — pas de "pour information".
  Seuil : une US qui retient plus de ~5 regles, ou des
  regles multi-lignes (tableau de champs, formats), ne
  tient pas en AC/lignes de tache. Dans ce cas, STOP et
  dis-le : il faut un FEATURE_DIR/rules.md filtre sur le
  modele de design.md ET son cablage RULES_PATH dans
  /sk-impl, qui n existe pas encore. Ne l improvise pas.

### clarify
  Avec un doc legacy : ne redemande PAS ce que le doc
  etablit factuellement (champs, types, regles citees).
  Les questions portent sur ce que le doc ne peut pas
  savoir : quoi reprendre a l identique, quoi
  moderniser, quoi abandonner. Sa section "Zones non
  trouvees / incertaines" alimente ces questions.

### plan
  Faits verifies, et chaque F<n> retenu est classe
  front pur ou depend backend. Un endpoint absent du
  depot backend (BACK_ROOT = .sk/repos.json, cle
  backend) = US contrat API en premier (regle des
  deux git roots ci-dessus) ; le front pur se livre
  d abord. Aucun chemin du monolithe dans plan.md
  comme fichier a modifier. Cle backend a null = projet
  front seul : pas d US contrat API, dis-le.

### tasks
  Si un doc legacy existe : une tache qui implemente un
  comportement repris porte la regle EN CLAIR dans sa
  ligne (le texte "R<n> — ..." recopie de l AC, ou la
  reference a l AC de spec.md qui la porte : "AC-3"),
  plus l ancre de tracabilite `Legacy: <chemin>#F3,R7`.
  Le Sonnet ne lit que tasks.md : une ancre seule ne lui
  dit rien. L ancre sert a l humain et au sanity 5, pas
  au worker. Les taches sans reprise n en portent pas.
  Une tache peut porter `Legacy:` ET `Code:` (etendre un
  E<n> en y reprenant une R<n>) : les deux sont alors
  obligatoires.

### sanity 5
- doc legacy : un chemin prefixe par LEGACY_ROOT (celui de
  l en-tete du doc ; critere de PREFIXE, pas un suffixe
  *Controller.cs que le backend actuel a aussi) presente comme
  cible — ce sont des chemins de LECTURE ; un F<n> ou R<n>
  absent de l index du doc ; une ancre `Legacy: #R<n>` sans AC
  de spec.md portant le texte litteral de la regle ; une tache
  ancree dont la ligne ne porte ni la regle ni l AC ;

## Recon (A.1) avec ce doc
Avec un doc legacy (0bis) : la recon du depot COURANT
est inchangee — le doc ne dit rien du web, il ne peut
pas la remplacer. Seul ce qui concerne le legacy ne se
cherche plus, c est deja etabli. Le doc rejoint les
Faits verifies de plan.md par citation de son chemin,
jamais par recopie de son contenu.
Avec un doc /sk-code-search (0ter) frais : cette recon
est REMPLACEE par le controle git de 0ter.1. Ne relis
que les fichiers rendus par le git diff. N ouvre un
agent que si le besoin sort du perimetre du doc.
Les deux docs peuvent coexister : le legacy dit ce que
faisait l ancien systeme, le code-search ce qui existe
deja ici. Ne les confonds pas dans les Faits verifies.
