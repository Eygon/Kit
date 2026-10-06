# /sk-prep — Contrat d interface, second depot, parallel.yml

Lu seulement si : (a) tu t appretes a ecrire un fichier dans contracts/, OU (b) .sk/repos.json porte un `backend` (chaine) ET le besoin touche l API, OU (c) un AC porte un champ qui vient d un doc legacy, d un mockup ou d un DTO d un autre systeme. Partout ci-dessous, « question de 0quater » = la question de clarify quand 0quater n a pas eu lieu.

## Endpoint dicte par l humain (pas de backend accessible)

backend = null et l endpoint vient du besoin ou d une reponse : la source
est l humain, citee dans les Faits verifies (« endpoint donne par l humain,
clarify Q2 »). Confronte-le aux url-builders du depot (apiURL) : prefixe,
casse, segments. Divergence = question de clarify (« ton endpoint ou celui du
modele du depot ? »), jamais un choix silencieux. La verification en base
(plus bas) ne s applique que si une base ou un backend est joignable.

## Second depot (BACK_ROOT)
SECOND DEPOT (BACK_ROOT) : sa STRUCTURE se lit sur la
BRANCHE D INTEGRATION, jamais sur le working tree. Un
depot de travail est presque toujours checkoute sur
autre chose — c est la situation normale, pas la
malchance. Avant d ecrire le moindre chemin backend,
deux lectures OBLIGATOIRES :
  git -C <repo> show origin/<branche>:<sln> \
    | grep -oE '"[A-Za-z.]+\.csproj"'
  git -C <repo> ls-tree --name-only origin/<branche> <dossier>/
Trace le resultat dans les Faits verifies de plan.md,
avec le sha de la branche. Verifier DEUX FICHIERS ne
vaut pas verifier une structure. Le sha de la branche d integration reste une
donnee de recon (Faits verifies), JAMAIS une consigne :
n ecris dans plan.md aucune base d implementation, aucune
branche a reprendre, aucun slot. Le pool et sa base (HEAD
du principal, 0bis de /sk-impl) appartiennent a /sk-impl.

## Donnees du contrat : verifier qu elles EXISTENT
DONNEES DU CONTRAT : verifier qu elles EXISTENT, pas
seulement que les fichiers existent.
Declencheur : tu t appretes a ecrire dans contracts/
(ou dans un AC) un champ qui vient d un doc legacy, d un
mockup ou d un DTO d un AUTRE systeme. Un DTO legacy
n est PAS une source de donnee : c est un contrat de
sortie d un autre programme, qui peut calculer, agreger,
ou lire une base que le nouveau backend ne sert pas.
Avant d ecrire le champ, trouve sa source dans la base
CIBLE via le MCP `mcp__mssql-sqlserver__*` (gateway
mutualise ; « Failed to connect » = relancer le gateway,
ne pas contourner) :
  list_tables / list_columns   reperer la table
  describe_table               structure et FK, fait foi
                               pour tout mapping EF
  run_sql (lecture seule)      confirmer que la donnee
                               est REELLEMENT peuplee
Une colonne qui existe mais dont la table est vide, ou
ne contient qu une ligne de test, n est pas une source
exploitable : le dire.
Ecris dans les Faits verifies, par champ : base, table,
colonne, volumetrie constatee. Table CREEE par la feature
(migration d une tache de ce run) : la source est
« cree par T<nnn> (migration) », sans volumetrie ; seuls les
champs lus dans une table existante exigent la preuve en base.
Source introuvable -> le champ NE RENTRE PAS au contrat.
Il devient une question de 0quater (retirer du perimetre,
chercher la source ailleurs, livrer sans). Ne l ecris pas
« parce que le mockup l affiche ».
Base non SQL Server, MCP indisponible, ou donnee servie
par une API tierce : meme exigence, autre moyen — nomme
la source et comment tu l as constatee. Une source non
verifiee se traite comme une source absente.

## Deux git roots : le contrat precede tout
  INTERDIT : chemins API/backend ET pages/components
  dans le meme [USn] (meme repo, deux dossiers = meme
  interdiction). Deux git roots : le CONTRAT
  machine-readable (yaml/json dans contracts/) precede
  tout. Ne pas confondre le contrat et l US qui
  l implemente : ecris le contrat TOI, en prep, des que
  tu peux — le front code alors contre lui sans attendre
  qui que ce soit. Une US ne porte le contrat que si tu
  n as pas pu l ecrire. Les US front sont des
  consommateurs : elles codent contre le contrat, jamais
  contre une implementation. Ne pas inventer le payload
  cote front.

## Annotation parallel.yml (apres le STRIP de tasks)
  APRES STRIP, annotation parallel (conditionnelle) :
  SI 2 git roots (BACK_ROOT = .sk/repos.json, cle
  backend = chaine, pas null)
  ET le contrat machine-readable est identifie
  ET au moins une US back ET une US front sur des
  roots DISTINCTS :
  ecrire FEATURE_DIR/parallel.yml (contrat :
  ~/.claude/skills/_shared/sk-parallel.md).
  La barriere depend de QUI ECRIT LE CONTRAT,
  jamais du rang de l US :
  - contrat ecrit par TOI en prep (fichier dans
    FEATURE_DIR/contracts/) -> `after: null`,
    toutes les US eligibles dans parallel. Le
    groupe a deja les champs, parametres et
    codes de reponse : une barriere ne lui
    apprendrait rien et serialiserait pour rien.
  - contrat cree par une US -> cette US est
    `after`.
  - contrat incertain (on ignore si le modele
    peut le servir) -> barriere aussi.
  Format :
    after: US1        # ou null
    parallel:
      - [US1, US2]        # chaine : US du meme depot, dans l ordre
      - [US3, US4, US5]   # autre depot : tourne en parallele
    contract: <chemin relatif au repo qui
      possede le yaml>
  Meme git root -> UNE chaine `[USa, USb]` dans
  parallel (sequentielle dans sa voie), jamais
  deux items separes. Mentionner dans plan.md que /sk-impl
  lira ce fichier, et y annoncer la part de la
  barriere (taches barriere / taches du run) :
  au-dela de la moitie, dire que le parallelisme
  sera marginal plutot que de vendre un fan-out.
  SINON (backend null, pas 2 roots, pas de
  couple back+front distinct) : NE PAS ecrire
  parallel.yml. Sequentiel comme sans-async.

## Sanity 5 (contrat, parallel)
- contracts/ : CHAQUE champ a sa source dans les Faits
  verifies de plan.md (base, table, colonne, volumetrie ; ou
  « cree par T<nnn> » pour une table de la feature). Un
  champ sans source constatee est bloquant, surtout s il vient
  d un doc legacy ou d un mockup ;
- parallel.yml : les ids (after + parallel) collent aux labels
  [USn] de tasks.md, un id absent ou invente est bloquant ; un
  `after` non nul alors que le fichier contrat existe deja
  dans contracts/ est une barriere inutile (`after: null`).
