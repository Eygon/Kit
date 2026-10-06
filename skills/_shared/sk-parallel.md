# Annotation parallel.yml — contrat (source unique)

Prep ECRIT ce fichier. Impl le LIT. Impl ne
devine JAMAIS le parallelisme : absent =
sequentiel, comme le kit sans-async.

## Fichier

FEATURE_DIR/parallel.yml (a cote de spec.md).
Absent = sequentiel. Ne pas l inventer.

## Format

```
after: US1            # ou `after: null` — voir ci-dessous
parallel:
  - [US1, US2]       # voie back, sequentielle
  - [US3, US4, US5]  # voie front, sequentielle
contract: <chemin relatif au repo qui possede le yaml>
```

- `after` : US barriere. PAS systematique — c est
  le contrat qui decide, pas le rang de l US.
  - Contrat deja ecrit par la prep (fichier
    present dans FEATURE_DIR/contracts/) ->
    `after: null`. Le groupe parallel a deja
    tous les noms de champs, parametres et codes
    de reponse : il n apprend RIEN d une barriere.
    Le hash est gele des la prep. Tout part
    ensemble.
  - Contrat cree par une US -> cette US est
    `after`. Rien a coder contre avant elle.
  - Contrat incertain (on ignore si le modele de
    donnees peut le servir) -> barriere aussi :
    faire coder le front d abord risquerait de
    tout jeter.
  Quand `after` est pose : sequentiel, 1 Sonnet
  + review + 1 fix, et le groupe parallel attend.
  Question de controle si la regle ne tranche
  pas : « qu est-ce que le groupe parallel
  apprend de la barriere qu il ne sait pas
  deja ? » Reponse « rien » -> `after: null`.
  Cout d une barriere inutile, mesure sur la
  spec 902 : 55 min serialisees sur 140, le
  fan-out ne rapportant plus que ~20 min.
  `speckit-us-after-parallel.js` gere deja
  `barrier: null` : aucun code a changer.
- `parallel` : US (ou CHAINES d US) a lancer
  ENSEMBLE, UNIQUEMENT sur des git roots DISTINCTS
  (typiquement un back, un front). Une chaine
  `- [US1, US2]` = les US d un MEME depot, dans
  l ordre, l une apres l autre ; les chaines de
  depots differents tournent en parallele. 2 US
  back et 3 US front = `- [US1, US2]` et
  `- [US3, US4, US5]` : deux voies, au lieu d une
  paire parallele suivie de trois US en serie.
  Une US qui echoue arrete sa voie, pas l autre.
- `contract` : chemin du contrat machine-readable
  (yaml / json / proto), relatif au repo qui
  possede le yaml. Existe deja, ou US1 le cree.

## Prep — quand l ecrire

Ecrire UNIQUEMENT si TOUTES ces conditions :
1. 2 git roots (BACK_ROOT = .sk/repos.json,
   cle backend = chaine, pas null).
2. Le contrat machine-readable est identifie.
   Ecrit par la prep -> `after: null`. Cree par
   une US -> cette US devient `after`. Ne PAS
   exiger qu une US porte le contrat : c est ce
   qui imposait une barriere systematique.
3. Au moins une US back ET une US front, sur
   des roots DISTINCTS.
4. Chemin contrat connu (fichier existe, ou
   une US le cree).

Meme git root -> NE PAS lister ces US dans
`parallel` : elles restent sequentielles
apres `after`.
Backend null ou pas 2 roots -> NE PAS ecrire
parallel.yml.

## Impl — comment l executer

1. Lire FEATURE_DIR/parallel.yml (copie slot).
   Ne pas parser tasks.md pour inferer.
2. Lancer `after` d abord (sequentiel, 1 Sonnet
   + review + 1 fix).
3. sha256 du fichier contrat ->
   FEATURE_DIR/contract.sha256.
4. Spawner les US `parallel` ensemble : deux
   Agent Sonnet, ou Workflow
   speckit-us-after-parallel.js (Promise.all
   sur le groupe parallel). Jamais parallele
   sur le meme worktree (git add -A collision).
   US back parallele : cwd = slot du pool backend
   (<POOL_BASE>/<BACK_SLUG>/wt-N), PAS le HEAD de
   BACK_ROOT.
5. Apres CHAQUE worker parallel : rehash.
   Diff vs contract.sha256 = STOP, pas de merge.
6. Workers : interdiction d ecrire / reformater
   le fichier contrat. Champ hors contrat = STOP.

Si l utilisateur n a selectionne qu une US :
ignorer parallel.yml pour CE run (Agent unique).

## Source unique

parallel.yml est la SEULE source de
parallelisme. Absent = sequentiel.
Impl ne mute pas le yaml. Prep ne l ecrit
pas a la louche.
Memes gardes (budget, review2, stop) ; barriere ko = pas de parallel.
