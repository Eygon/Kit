# Dernière Vague

FPS de survie par vagues, jouable sur mobile (navigateur), en une seule page HTML autonome : three.js, TypeScript strict, Vite (build single-file), Vitest. Aucun asset externe : modèles, textures et sons sont générés par le code.

## Commandes

- Tests d'un fichier : `node node_modules/vitest/vitest.mjs run --coverage=false <file>`
- Tous les tests : `npm test`
- Typecheck : `npm run typecheck`
- Lint : `npx eslint src`
- Build : `npm run build` (sortie `dist/index.html`)

## Conventions

- Les standards de l'équipe sont dans `agent-os/standards` (`index.yml` liste tout).
- Alias `@/*` vers `src/*`.
- Tests miroirs dans `src/__tests__/` (même chemin que la source).
- Pas de commentaires dans le code de production.
- `specs/` est gitignoré : ne jamais le commiter.
- Branche principale : `dev`.
