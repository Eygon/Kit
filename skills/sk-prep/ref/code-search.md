# /sk-prep — Etat des lieux du code (lu seulement si un chemin docs/code-search/*.md est fourni)

## 0ter. Etat des lieux du code (conditionnel, AVANT la recon)

Declencheur : $ARGUMENTS porte un chemin de fichier .md
produit par /sk-code-search (typiquement
docs/code-search/<slug>.md). Absent = saute cette
section, recon A.1 normale.

Contrairement au doc legacy (0bis), celui-ci parle du
depot COURANT : il REMPLACE la recon A.1 dans la mesure
ou il est frais. Le controle ci-dessous n est donc pas
optionnel — s en dispenser, c est specifier sur du code
qui a peut-etre change.

### 0ter.1 Controle de fraicheur (git, avant toute confiance)

L en-tete du doc porte commit + branche de chaque depot
explore. Compare a l etat actuel, depot par depot :
  git -C <depot> diff --name-only <sha du doc>..HEAD \
    -- <fichiers cites par le doc>
- sortie vide = doc valide tel quel. La recon A.1 se
  limite a ce controle : tu ne re-greppes rien.
- fichiers en sortie = relis CEUX-LA seulement, et tiens
  compte de l ecart. Tu ne reecris pas le doc : ce n est
  pas ton livrable. Le reste du doc reste bon.
- sha inconnu de git (branche supprimee, historique
  reecrit) = doc perime : recon A.1 normale, et dis-le
  a l utilisateur.
Puis les DOSSIERS du doc — le diff sur fichiers cites
est aveugle aux AJOUTS. Reduis la colonne chemin de
"## Fichiers concernes" a ses dossiers parents et :
  git -C <depot> diff --name-only --diff-filter=A \
    <sha du doc>..HEAD -- <dossiers>
Un fichier ajoute dans ces dossiers depuis le doc = a
lire : il couvre peut-etre deja ce que la spec croit
manquant.
Trace le controle dans plan.md (Faits verifies) : sha du
doc, sha HEAD, fichiers relus (liste, meme vide). Un
controle non trace = controle non fait (sanity 5).
En-tete signalant working tree SALE ou branche != dev :
le doc decrit du code non merge ou non commite. Reporte
l avertissement dans plan.md, ne l ignore pas.

### 0ter.2 Lecture et usage

Meme regle de lecture que 0bis : "## Index" seul d abord
(sed -n '1,60p'), corps seulement si le besoin porte
dessus. Ce que le doc etablit ne se re-cherche pas.
Trois differences avec le doc legacy :
- les chemins du doc sont des CIBLES legitimes : ils
  vont dans plan.md et tasks.md, c est le but.
- "## Contrat API" tranche front pur vs depend backend
  sans rouvrir le depot backend (.sk/repos.json, cle
  backend).
- un E<n> deja implemente ne devient PAS une US. La spec
  porte ce qui MANQUE ; citer un E<n> sert a delimiter
  l existant, jamais a le respecifier.
Les "## Points d attention" (A<n>) sont des constats,
pas un backlog : n en fais une US que si le besoin la
demande.

## Regles ajoutees aux etapes du trio (code-search)

### specify
  Si un doc /sk-code-search existe (0ter) : la spec
  porte ce qui MANQUE. Un AC qui redecrit un E<n> deja
  implemente est un defaut de prep : soit il n a pas
  lieu d etre, soit il porte sur un ECART avec
  l existant et le dit ("E4 existe, sans le filtre X").

### plan
  Si un doc /sk-code-search existe : sa section
  "## Contrat API" alimente le classement front pur /
  depend backend sans rouvrir BACK_ROOT, et ses
  chemins sont les fichiers a modifier. Reporte ici
  l avertissement de fraicheur (branche != dev, tree
  sale) s il y en a un dans l en-tete du doc.

### tasks
  Si un doc /sk-code-search existe : une tache qui
  ETEND une capacite existante le dit en clair
  ("etend <chemin existant> (E4)") et porte l ancre
  `Code: <chemin du doc>#E<n>` — le Sonnet sait ainsi
  qu il modifie et ne repart pas de zero. Fichier neuf :
  pas d ancre.
  Une tache peut porter `Legacy:` ET `Code:` (etendre un
  E<n> en y reprenant une R<n>) : les deux sont alors
  obligatoires.

### sanity 5
- doc code-search : une US qui respecifie un E<n> deja
  implemente sans nommer d ecart ; un chemin repris du doc qui
  n existe plus ; le controle de fraicheur 0ter.1 absent des
  Faits verifies de plan.md (sha doc, sha HEAD, fichiers
  relus) ;

## Recon (A.1) avec ce doc
Avec un doc legacy (0bis) : la recon du depot COURANT
est inchangee — le doc ne dit rien du web, il ne peut
pas la remplacer. Seul ce qui concerne le legacy ne se
cherche plus, c est deja etabli. Le doc rejoint les
Faits verifies de plan.md par citation de son chemin,
jamais par recopie de son contenu.
Avec un doc /sk-code-search (0ter) frais : cette recon
est REMPLACEE par le controle git de 0ter.1. Le doc
remplace la RECHERCHE, pas la lecture : lis les fichiers
que tes taches vont modifier (signatures, tests voisins),
rien d autre ; les fichiers rendus par le git diff en plus. N ouvre un
agent que si le besoin sort du perimetre du doc.
Les deux docs peuvent coexister : le legacy dit ce que
faisait l ancien systeme, le code-search ce qui existe
deja ici. Ne les confonds pas dans les Faits verifies.
