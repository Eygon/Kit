# Recon de feature

Squelette genere par recon-seed.mjs sur origin/dev (4ff6db0). La prep garde ce qui sert la spec et ajoute ses faits.

## Composants partages reutilisables

- Avatar (lib `@septeo/septeo-ui-components`) — name: string, size?: number (initials computed by the lib) — source: packages/septeo-ui-components/dist/index.d.ts:98
- Tooltip (lib) — label: string, children: ReactNode — source: packages/septeo-ui-components/dist/index.d.ts:78
- Badge (lib) — tone: "neutral" | "success" | "danger" | "info", children?: ReactNode — offline indicator and "+N" marker — source: packages/septeo-ui-components/dist/index.d.ts:58
- No presence, avatar group or connection-status component exists in src/components/{elements,widgets} — source: git ls-tree origin/dev src/components

## Helpers et hooks de la feature

- Current user id: `CURRENT_USER_ID` ("1", string) — hub query `userId` — source: src/config/apiConfig.ts:7
- REST headers are built in one place (`request`), X-User-Id included — source: src/api/httpClient.ts:15
- URL base toggle `debugMode ? API_BASE_URL_LOCAL : API_BASE_URL` — source: src/utils/apiURL/apiURL.ts:3
- Board query keys to invalidate: `boardItemKeys.all(boardId)`, `connectorKeys.all(boardId)` — source: src/utils/queryKeys/boardItemQueryKeys.ts:2
- Mutation hooks invalidate with `useQueryClient` + `void queryClient.invalidateQueries` — source: src/pages/board/hooks/useUpdateBoardItemMutation.ts:1

## Pieges verifies

- LOCALES : src/i18n/locales/{en,es,fr}.json — chaque cle dans CHAQUE fichier ; parite : src/__tests__/i18n/localesParity.test.ts — source: git ls-tree origin/dev
- ALIAS tsconfig : @/*->./src/* — aucun autre alias n existe — source: tsconfig.json:19

## Recettes de test

- Board page test mocks every page hook with `vi.mock` + `vi.hoisted`; add `useBoardHub` the same way — source: src/__tests__/pages/board/board.test.tsx:12
- Hooks needing a QueryClient render with `renderWithProviders` — source: src/__tests__/utils/renderWithProviders.tsx:1
- http client test stubs global fetch and asserts headers — source: src/__tests__/api/httpClient.test.ts:1
- SignalR in vitest: `vi.mock("@/api/realtime/boardHubConnection")` returning a fake connection (on/off/start/stop/invoke, onreconnecting/onreconnected/onclose, connectionId) — no real socket (intent)

## Pieges verifies (suite)

- PARTAGE : `src/i18n/locales/fr.json`, `src/i18n/locales/en.json`, `src/i18n/locales/es.json` — ajout seulement
- Header today renders a single current-user `<Avatar>`; the presence bar replaces it, keep `pages.boards.ownerName` key (used by boards page) — source: src/pages/board/board.tsx:226
- Avatar size is a number prop (`size={28}`), not a Tailwind px class (interdit `[NNpx]`) — source: packages/septeo-ui-components/dist/index.d.ts:100

## Interdits grep-ables

- `<table`
- `className=.*#[0-9A-Fa-f]{3,6}\b`
- `\[[0-9.]+px\]`
- `--bg-page|--fg-|--blueS-|--grey-`
- `from ["'](prjTypes|@api|@utils|@prjTypes|~)/`

## Back (Tableau back)

- Auto-registration scans only Business and DAL assemblies: Api types (hub tracker, notifier) go in Program.cs by hand — source: Tableau.Api/Program.cs:31
- Resolver singleton registration, extend rather than add a mechanism — source: Tableau.Api/Program.cs:30
- Header resolver to extend with query `userId` — source: Tableau.Api/Security/HeaderCurrentUserResolver.cs:7
- Membership + display names in one call: `IBoardMemberService.GetMembers(userId, boardId)` throws Forbidden/NotFound — source: Tableau.Business/Services/BoardMemberService.cs:22
- Seed: Alice 1, Bob 2, Carol 3; Carol is a viewer of planning and not a member of retro — source: Tableau.DAL/Seed/DataSeeder.cs:21
- Integration test recipe: `WebApplicationFactory<Program>` + X-User-Id header — source: Tableau.Tests/Controllers/BoardItemsApiTests.cs:17
- SignalR test client: `HubConnectionBuilder().WithUrl(url + "?userId=2", o => o.HttpMessageHandlerFactory = _ => server.CreateHandler())` — source: Tableau.Tests/Tableau.Tests.csproj:16
- Target framework net8.0: SignalR client package 8.0.* — source: Directory.Build.props:3
