# Recon de feature

Squelette genere par recon-seed.mjs sur origin/dev (6a8041e). La prep garde ce qui sert la spec et ajoute ses faits.

## Composants partages reutilisables

- CanvasItem — src/components/widgets/canvasItem/canvasItem.tsx — props: item, zoom, selected, onSelect, onMove, onEdit — item under a cursor (select AC) — source: src/components/widgets/canvasItem/canvasItem.tsx:17
- FreehandItem — src/components/elements/freehandItem/freehandItem.tsx — props: color, points, strokeWidth — Pencil stroke preview drawn through a cursor — source: src/components/elements/freehandItem/freehandItem.tsx:3
- ZoomControls — src/components/widgets/zoomControls/zoomControls.tsx — props: zoom, onZoomIn, onZoomOut, onReset, onFit — canvas widget the layer must not cover — source: src/components/widgets/zoomControls/zoomControls.tsx:10
- Icon (lib) — name: string, size?: number — no colour prop: the coloured arrow is an inline svg, not Icon — source: packages/septeo-ui-components/dist/index.d.ts:63
- Avatar (lib) — used by presence avatars; not needed for the cursor label — source: src/pages/board/components/widgets/presenceAvatars/presenceAvatars.tsx:1

## Helpers et hooks de la feature

- useBoardHub owns the only hub connection (effect-scoped); add CursorMoved on/off and moveCursor there — source: src/pages/board/hooks/useBoardHub.ts:19
- Presence list = useBoardHub presentUsers (PresenceChanged); filter cursors on it for immediate removal — source: src/pages/board/hooks/useBoardHub.ts:36
- Current user id = Number(CURRENT_USER_ID) from @/config/apiConfig — source: src/pages/board/board.tsx:81
- Screen->board point: getBoundingClientRect + screenToWorld(x, y, viewport) — source: src/pages/board/hooks/useFreehandDrawing.ts:21
- screenToWorld — source: src/pages/board/utils/screenToWorld.ts:3
- Cursor palette = STROKE_COLORS[].value (yellow/green/red) — source: src/constants/canvasConstants.ts:29
- Presence triad to mirror (dto/model/mapper, domain presence) — source: src/types/mappers/presence/presenceUserMapper.ts:1

## Pieges verifies

- LOCALES : src/i18n/locales/{en,es,fr}.json — chaque cle dans CHAQUE fichier ; parite : src/__tests__/i18n/localesParity.test.ts — source: git ls-tree origin/dev
- board-viewport spreads pan OR drawing handlers (both own onPointerMove): compose the cursor send, never replace them — source: src/pages/board/components/modules/boardCanvas/boardCanvas.tsx:70
- board-world is translate+scale: a layer inside it is in board coordinates; label must be counter-scaled by 1/zoom — source: src/pages/board/components/modules/boardCanvas/boardCanvas.tsx:77
- Hex colours forbidden in .tsx (standards check): colours come from STROKE_COLORS via props/style — source: src/constants/canvasConstants.ts:29
- CORS AllowAnyOrigin + client withCredentials:false already compatible: no option to change — source: src/api/realtime/boardHubConnection.ts:6
- ALIAS tsconfig : @/*->./src/* — aucun autre alias n existe — source: tsconfig.json:19

## Recettes de test

- Hub hook test: hoisted fakeConnection, `on` handlers captured by event name, vi.mock of boardHubConnection — source: src/__tests__/pages/board/hooks/useBoardHub.test.tsx:6
- Page test mocks useBoardHub via mocks.hub; default return must gain remoteCursors and moveCursor — source: src/__tests__/pages/board/board.test.tsx:53
- Pencil canvas test: renderCanvas({ tool: PENCIL }) + fireEvent.pointerDown/pointerMove on board-viewport — source: src/__tests__/pages/board/components/modules/boardCanvas/boardCanvas.test.tsx:252
- jsdom does no hit testing: assert the layer class pointer-events-none AND dispatch the Pencil pointerDown on the cursor element — source: src/pages/board/components/modules/boardCanvas/boardCanvas.tsx:99
- Fade: vi.useFakeTimers + advanceTimersByTime(5000) — no existing fake-timer helper in the repo

## Interdits grep-ables

- `<table`
- `className=.*#[0-9A-Fa-f]{3,6}\b`
- `\[[0-9.]+px\]`
- `--bg-page|--fg-|--blueS-|--grey-`
- `from ["'](prjTypes|@api|@utils|@prjTypes|~)/`

## Back (Tableau)

- Hub: BoardHub, group GroupOf(boardId) = board-{id}; JoinBoard checks membership via IBoardMemberService — source: Tableau.Api/Hubs/BoardHub.cs:26
- Presence tracker: lock-guarded map board -> user -> connection ids, PresenceUserDto per user; add a lookup there — source: Tableau.Api/Hubs/BoardPresenceTracker.cs:6
- DTO model: sealed record, required init props, XML summaries — source: Tableau.DAL/Dtos/PresenceUserDto.cs:4
- Integration test helper ConnectAsync(userId): WebApplicationFactory, LongPolling, Channel per event; Bob=2, Carol=3 viewer, boards 1/2 — source: Tableau.Tests/Hubs/BoardHubTests.cs:40
- Silence assert: Task.Delay(Silence) then events.Reader.TryRead(out _).ShouldBeFalse() — source: Tableau.Tests/Hubs/BoardHubTests.cs:120
- Tracker unit tests instantiate BoardPresenceTracker directly — source: Tableau.Tests/Hubs/BoardPresenceTrackerTests.cs:15
