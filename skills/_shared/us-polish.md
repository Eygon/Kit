# Brief de la passe de polish (sk-worker Sonnet) — injecte par /sk-impl

Tu appliques en UNE passe les ecarts « cosmetic » que les revues des
US de ce run ont releves : une valeur de design (dimension,
espacement, radius, fond, typo, taille d icone, hex ou `[Npx]` a
remplacer par un token) absente, arrondie ou remplacee, sur un
element qui marche. Chaque ecart donne deja le fichier, l attendu et
la classe a poser. Tu ne refais aucune US, tu ne relis ni la spec ni
design.md, pas de recon au-dela des fichiers cites.
Aucun utilisateur interactif : pas de question, pas d attente.

Pourquoi une passe groupee : sur la 916, un fix + review2 par US
coutait ~24 min pour deux classes a changer (US22).

## Contexte (le parent remplit)

- Cwd du slot (absolu) : <SLOT_CWD>
- Chemins prod autorises (union des US de ce run) : <PROD_PATHS>
- Outils du kit : <SK_SHARED>
- recon.md : <RECON_PATH ou aucun> — grep la ligne utile, ne le
  relis pas en entier.

Le moteur ajoute a la suite la liste des ecarts, chacun prefixe par
son US.

## Regles

1. Un ecart = une classe ou une prop a changer, dans le fichier
   cite. Lis les fichiers cites dans le MEME message, puis edite.
   Pas de nouveau test, pas de RED : la valeur vient du reviewer,
   qui l a relevee contre design.md.
2. Un test existant fige l ancienne valeur : passe son attendu a la
   valeur du design. Jamais supprimer ni affaiblir une assertion.
3. Un ecart qui exige un fichier hors des chemins autorises, ou qui
   se revele plus qu une valeur (element a restructurer, comportement
   a changer) : ne le fais pas, cite-le dans `summary`. Les autres
   ecarts passent quand meme.
4. Gates, UNE fois en fin, un seul appel Bash (timeout 600000 ms) :
     node node_modules/eslint/bin/eslint.js <tes fichiers> && node node_modules/vitest/vitest.mjs related --run --passWithNoTests --coverage=false <tes fichiers prod> && node node_modules/typescript/bin/tsc --noEmit --incremental --tsBuildInfoFile "$(git rev-parse --git-dir)/sk-tsc.tsbuildinfo" -p tsconfig.json
   `related` rejoue les tests qui importent tes fichiers, pas la
   suite ; il parcourt d abord le graphe d imports (~3 min sur
   MySepteoWeb, mesure 2026-09-23) : lance-le une seule fois.
   Jamais `yarn lint`, jamais la suite complete. Rouge :
   corrige, ou annule l ecart fautif (`git checkout -- <fichier>`)
   et dis-le dans `summary`.
5. Commit unique : `git add <tes fichiers>` (jamais `-A`), puis
   `git commit -m "sk-impl POLISH"`. tasks.md ne change pas.

## Sortie structuree

`{ stopped, reason, commit, filesTouched, summary, facts }`.
`summary` dit, ecart par ecart : applique, ou laisse et pourquoi.
`stopped: true` seulement si aucun ecart n a pu passer ou si la gate
reste rouge. `facts` : une recette reutilisable (« icone 14px =
size="auto" + classe ») que recon.md n avait pas.
