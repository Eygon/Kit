# Reprise du chantier /sk-notion (passage de session, 7 octobre)

## But (demande de Thomas)
Un tableau Notion de taches (statut, priorite, detail) ; une commande du kit fait de la session Claude
l orchestrateur : elle ecoute Notion et lance /sk-prep + /sk-impl (ou /sk-xs), pose les questions dans
Notion, joue les tests navigateur (Claude in Chrome ; Playwright sur le banc) avant de publier.
Tester plusieurs fois, ameliorer le kit et l idee.

## Ce qui existe (branche claude/bonjour-u92zns)
- `skills/sk-notion/SKILL.md` : le superviseur (contrat sk-supervisor.md, boite de reception = Notion).
- `skills/_shared/notion-plan.mjs` (+ tests, 61 verts) : tick / message / answer / decideE2E.
- `skills/_shared/notion-schema.sql` : schema de la base.

## Notion (deja cree, page privee de Thomas)
- Page « Claude — Tâches automatiques » : 3f2b1e108d4681a09477e0e6357da850
- Base « Tâches » : c1e126ef4ccd43a58ee1e1c1b18dbe2c — data source collection://c0a64036-fcc6-4942-9c4d-6c5a621b0ec2
- Vue de lecture (mode view, sans quota) : https://www.notion.so/c1e126ef4ccd43a58ee1e1c1b18dbe2c?v=3f2b1e108d468129b110000c6c59684a
- Taches de test :
  - TK-1 « Raccourci 0 » (3f2b1e108d4681d4a407c6dc0918b411) : FINI sur le banc (branche feature/xs-TK1 poussee,
    E2E PASS 3·0·0 x3 runs). Notion pas encore mis a jour : mettre Statut=Terminé, Résultat=branche, Fini, compte rendu.
  - TK-2 « Dupliquer Ctrl+D » (3f2b1e108d4681379fccd3b4b6355b79) : Question pour toi (tracés à main levée ?) en commentaire.
    Prep a relancer avec la reponse (TK2-question-prep.txt = la question de la prep).
  - TK-3 « Mode sombre » (3f2b1e108d4681c5af48d500f5314223) : Taille=Feature, en file (ambigu : doit provoquer des questions).
  - TK-4 « App mobile » (3f2b1e108d4681e387f3de853a3714ea) : Bloqué (projet sans depot) — fait.

## Banc
`front.bundle` / `back.bundle` = depots du clone Miro (front React, back .NET). Recreer :
`git clone front.bundle front-origin` (bare : `git clone --bare`), principal = clone sur `dev`, `npm ci`,
`.sk/repos.json` -> back. Vite : `node node_modules/vite/bin/vite.js --config vitest.config.ts --port 5173 --strictPort`
(il faut `@microsoft/signalr` installe). Back : `dotnet run --project Tableau.Api --urls http://localhost:5080`.
E2E : `e2e-TK1-run.mjs` (injecte tw.css), oracles `skills/_shared/e2e-oracles.mjs`.
Enfants du banc = Agent general-purpose avec `child-runner.md` (gabarit) ; reprise apres redemarrage : `mkresume.py`.

## Constats a traiter (ameliorations trouvees en testant)
1. Les commentaires ecrits par Claude apparaissent sous le compte de Thomas : prefixer chaque commentaire
   Claude par « 🤖 Claude — » et ne prendre comme reponse humaine que les commentaires sans ce prefixe.
2. Les enfants Agent utilisent SendMessage (SubagentHandback) malgre la consigne : la fin d agent vaut message,
   le lire dans la handback ; et les agents ne survivent pas a un redemarrage du conteneur (le lanceur `bg` du
   produit n a pas ce probleme). Reprise = mkresume.py.
3. Faits deja corriges : taille Auto tranchee avant la prise ; une seule prep par depot ; « RED » (TDD) et
   « typecheck » ne sont plus des alarmes de verdict.
4. Les appels Notion demandaient une permission a chaque fois : autoriser `mcp__Notion` d emblee.

## Etat au 7 octobre 17:50 (session kit-6c)
- TK-1, TK-2, TK-3 Terminés ; TK-4 Bloqué. Vrai Notion : seul TK-1 mis a jour (proprietes) ; TK-2/TK-3
  joues sur le faux Notion (`skills/_shared/notion-sim.mjs`, etat final `notion-board-final.json/.md`,
  graine `notion-seed.json`) : Thomas ne veut plus d invite et la regle mcp__Notion n a pas pu etre posee
  par Claude (garde-fou d auto-modification). A reporter dans le vrai Notion quand l autorisation existe.
- Constats 1 et 4 traites (prefixe, faux Notion), 2 documente (handback = meme message ; reclaim).
  Nouveaux : adopt/reclaim, prep reprise occupe le depot, brief exclu, decideE2E nomme l outil,
  oracle `unreadable` + « Contraste attendu ». Voir RAPPORT.md §/sk-notion.
- Banc : .NET via `apt-get install dotnet-sdk-8.0` (dot.net bloque par le proxy) ; `front-up.sh` (scratchpad)
  relance Vite depuis un slot ; `cleanup-board.mjs` remet le tableau 1 a ses 4 elements.
