# Mousse (front)

Application de bières, mobile first : encyclopédie des bières, carte des lieux, journal de dégustation et profil, navigation par barre d'onglets en bas d'écran.

## Stack

React 19, TypeScript strict, Vite, HeroUI v3 (`@heroui/react` + `@heroui/styles`, sur React Aria), Tailwind v4 (plugin `@tailwindcss/vite`, tokens HeroUI en variables CSS), react-router v7 (mode déclaratif), TanStack Query v5, react-i18next (fr par défaut, en), icônes `@gravity-ui/icons`, Vitest + Testing Library + jsdom.

## Commandes

- Tests d'un fichier : `node node_modules/vitest/vitest.mjs run --coverage=false <file>`
- Tous les tests : `npm test`
- Typecheck : `npm run typecheck`
- Lint : `npm run lint`
- Serveur de dev : `npm run dev` (http://localhost:5173)
- Build : `npm run build`

## Conventions

- Les standards de l'équipe sont dans `agent-os/standards` (`index.yml` liste tout). Lis ceux qui concernent les fichiers touchés avant d'écrire du code.
- Mobile first : on conçoit à 390x844, puis on élargit (tablette, bureau). Voir `agent-os/standards/ui/mobile-first.md`.
- Direction artistique « Mousse » (palette, bordures encre, ombres dures, Shrikhand + Plus Jakarta Sans, clair seulement) : `agent-os/standards/ui/design-system.md`, toujours injecté ; la mascotte passe par `Mascot` / `EmptyStatePanel` (`agent-os/standards/ui/mascot.md`). Les jetons vivent dans `src/styles/mousseTheme.css`, le restylage global de HeroUI dans `src/styles/mousseComponents.css`.
- Composant HeroUI avant tout contrôle fait main (`agent-os/standards/heroui-library-first.md`) ; vérifie l'API dans `node_modules/@heroui/react/dist/components/<composant>/*.d.ts`, ne la devine pas.
- Alias `@/*` vers `src/*`.
- Les tests miroirs vivent dans `src/__tests__/` (même chemin que la source).
- Pas de commentaires dans le code de production.
- Toute chaîne affichée passe par `t()` et existe dans fr.json et en.json.
- Le back (`.sk/repos.json`) expose `/api/v1` sur `VITE_API_URL` (défaut http://localhost:5090) ; l'identité passe par le header `X-User-Id` (utilisateurs de démo 1 à 3, choisis dans le profil).
- `specs/` est gitignoré : ne jamais le commiter.
- Branche principale : `dev`.
