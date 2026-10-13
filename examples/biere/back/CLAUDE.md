# Mousse (back)

API de l'application « Mousse » : encyclopédie, carte, journal de dégustation et profil autour de la bière. Socle actuel : utilisateurs de démo et santé ; les features arrivent module par module.

## Stack

Node 22, NestJS 11, TypeScript strict, TypeORM + SQLite (`better-sqlite3`, base fichier `data/mousse.db`, schéma `synchronize`, pas de migrations), class-validator + class-transformer (ValidationPipe global whitelist + forbidNonWhitelisted), multer en mémoire (5 Mo max), Vitest 5 + `unplugin-swc` + supertest, eslint 10 + typescript-eslint.

## Commandes

- Tests d'un fichier : `node node_modules/vitest/vitest.mjs run --coverage=false <file>`
- Tous les tests (couverture lcov dans `coverage/`) : `npm test`
- Typecheck : `npm run typecheck`
- Lint : `npm run lint`
- Build : `npm run build` (sortie `dist/`) ; lancer : `npm start`
- Dev (watch) : `npm run start:dev` (http://localhost:5090, préfixe `/api/v1`, header `X-User-Id` requis : 1, 2 ou 3 — Alice, Bob, Carol)

## Conventions

- Les standards de l'équipe sont dans `agent-os/standards` (`index.yml` liste tout). Lis ceux qui concernent les fichiers touchés avant d'écrire du code.
- Couches par module fonctionnel : `src/modules/<nom>/{<nom>.controller.ts, <nom>.service.ts, <nom>.repository.ts, <nom>.module.ts}` + `dtos/`, `entities/`, `mappers/`, `enums/`. Contrôleurs minces, règles métier dans le service, TypeORM uniquement dans le repository.
- Transverse dans `src/common/` (exceptions, filtre `{ message }`, garde `X-User-Id` global, `@Public()`, `@CurrentUserId()`), base et seed dans `src/database/`, configuration dans `src/config/`.
- Exceptions : celles de Nest (`BadRequestException`, `NotFoundException`, `ForbiddenException`, `ConflictException`…), jamais d'exception maison ni de `try/catch` dans un contrôleur.
- Ordre des contrôles : 401 → 400 (validation) → 404 → 403 → 409.
- Alias `@/*` vers `src/*`.
- Les tests miroirs vivent dans `src/__tests__/` (même chemin que la source, suffixe `.test.ts`) ; les tests d'API dans `src/__tests__/api/`.
- Pas de commentaires dans le code de production.
- Tout est final / readonly par défaut quand c'est possible (`private readonly`, champs `readonly`, `as const`, pas d'héritage hors base délibérée).
- Le front (`/home/user/biere/front`) appelle `http://localhost:5090/api/v1` ; l'identité passe par le header `X-User-Id` (1 à 3).
- Port : 5090.
- `specs/` est gitignoré : ne jamais le commiter.
- Branche principale : `dev`.
