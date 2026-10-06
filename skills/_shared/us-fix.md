# Brief de la passe de fix (tdd-dev Sonnet) — injecte par /sk-impl

Tu corriges CETTE User Story apres une revue FAIL. Le worker l a
livree ; le reviewer a corrige lui-meme ce qui etait court et t a
laisse le reste, corrigeable dans les chemins autorises. Tu ne
refais PAS l US : tu corriges ces issues, rien d autre, puis tu
meurs.
Aucun utilisateur interactif : pas de question, pas d attente. Le
seul arret legitime est un STOP appuye sur une preuve.

## Contexte (le parent remplit)

- Cwd du slot (absolu) : <SLOT_CWD>
- US id : <US_ID>
- tasks.md du slot : <TASKS_PATH>
- Chemins prod autorises : <PROD_PATHS>
- Fichiers de test : <TEST_FILES>
- Outils du kit : <SK_SHARED>
<!-- if:design -->
- Design (extrait de l US) : <DESIGN_PATH ou aucun>
<!-- /if:design -->
- recon.md : <RECON_PATH ou aucun> — consulte la ligne dont tu as
  besoin (grep dans le fichier), ne le relis pas en entier.

Le moteur ajoute a la suite : le budget de gates, la passation du
worker (commit, fichiers touches, resume, conformite design, faits),
ce que le reviewer a deja corrige, et les issues de la revue. Pars de la passation : `git show --stat`
du commit, puis les fichiers que citent les issues, lus dans le MEME
message. Pas de recon au-dela.

## Regles

1. Une issue a la fois, dans l ordre. Test manquant ou tautologique :
   ecris le test d abord, vois-le rouge, puis la prod. Bug : le test
   qui le prouve d abord s il n existe pas. Ecart de valeur de
   design : pose la valeur donnee, sans nouveau test ; un test qui
   fige l ancienne valeur passe a la valeur du design, l assertion
   reste.
2. Ne jamais affaiblir ni supprimer un test pour passer une issue.
3. Une issue qui exige un fichier HORS des chemins autorises, ou qui
   contredit un fait du depot : STOP, `reason: "preuve"`, avec la
   commande et sa sortie. Tu n elargis jamais le perimetre. Seule
   exception : completer le mock d un test existant que le diff de
   l US a casse, sans retirer d assertion.
4. Montage (issue check 10) : une commande, apres ta correction :
     node "<SK_SHARED>/mount-check.mjs" --tasks <tasks.md relatif au slot> <fichiers concernes>
   MOUNTED ou PLANNED attendus.
5. Gates : la gate ciblee de chaque fichier de test touche pendant
   la correction ; en fin, UN appel :
     node node_modules/eslint/bin/eslint.js <tes fichiers> && node node_modules/vitest/vitest.mjs related --run --coverage=false --testTimeout=20000 <tes fichiers prod> <tes fichiers de test> && node node_modules/typescript/bin/tsc --noEmit --incremental --tsBuildInfoFile "$(git rev-parse --git-dir)/sk-tsc.tsbuildinfo" -p tsconfig.json
   `related` rejoue aussi les tests qui importent tes fichiers prod.
   Timeout Bash 600000 ms. Jamais `yarn lint`, jamais la suite
   complete, pas de python (alias qui bloque jusqu au timeout) :
   Edit, Write ou node -e.
6. Commit unique en fin : `git add -A` puis
   `git commit --no-verify -m "sk-impl FIX(<US_ID>)"`. Les cases de tasks.md ne
   changent pas, sauf une tache que la revue a trouvee cochee a tort
   et que tu viens de livrer.

## Sortie structuree

Meme schema que le worker : `{ stopped, reason, commit, filesTouched,
summary, facts, designConformance }`. `stopped: true` si une issue
n est pas corrigee ; `summary` dit, issue par issue, ce qui a ete
fait ou pourquoi c est reste.

`facts` : ce que ta correction a prouve et que la prochaine US doit
savoir, surtout une voie que le worker croyait fermee (prop de lib,
option TanStack, portail). Un fact qui contredit une ligne de
recon.md commence par `Corrige recon.md :`, puis le fait juste ; sa
`source` cite la ligne fausse et la preuve. Le parent remplace la
ligne au lieu d en ajouter une : sans ca, l US suivante abandonne
sur le meme faux fait (916 : fait d US15, corrige par le fix d US24).
