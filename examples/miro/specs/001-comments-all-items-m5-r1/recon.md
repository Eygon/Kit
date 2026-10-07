# Recon de feature

Squelette genere par recon-seed.mjs sur origin/dev (02d8e65). La prep garde ce qui sert la spec et ajoute ses faits.

## Composants partages reutilisables

- ShapeItem — src/components/elements/shapeItem/shapeItem.tsx — props: color, content — source: src/components/elements/shapeItem/shapeItem.tsx:3
- StickyNote — src/components/elements/stickyNote/stickyNote.tsx — props: color, content — source: src/components/elements/stickyNote/stickyNote.tsx:3
- TextItem — src/components/elements/textItem/textItem.tsx — props: color, content — source: src/components/elements/textItem/textItem.tsx:3
- CanvasItem — src/components/widgets/canvasItem/canvasItem.tsx — props: item, zoom, selected, onSelect, onMove, onEdit — source: src/components/widgets/canvasItem/canvasItem.tsx:14
- Toolbar — src/components/widgets/toolbar/toolbar.tsx — props: activeTool, onToolChange, onDelete, canComment, commentsOpen, onComments — source: src/components/widgets/toolbar/toolbar.tsx:14

## Helpers et hooks de la feature

- withItemId / withCommentId : substitution locale des placeholders d URL, non exportee ; une URL board-level n a que {boardId} — source: src/api/comments/commentService.ts:10-14
- commentKeys : cles par item seulement (["comments", boardId, itemId]) ; une cle de comptage board-level est a ajouter — source: src/utils/queryKeys/commentQueryKeys.ts:1-4
- useCommentsQuery : modele de hook de lecture (queryTimes.short) — source: src/pages/board/hooks/useCommentsQuery.ts:6-11
- useBoardInteractions : porte commentsItemId / selectedItemId du board — source: src/pages/board/hooks/useBoardInteractions.ts:8
- BoardItemTypeEnum : STICKY_NOTE, SHAPE, TEXT ; les connecteurs ne sont pas des items — source: src/types/enums/boardItem/boardItemTypeEnum.ts:1-4

## Pieges verifies

- LOCALES : src/i18n/locales/{en,es,fr}.json — chaque cle dans CHAQUE fichier ; parite : src/__tests__/i18n/localesParity.test.ts — source: git ls-tree origin/dev
- ALIAS tsconfig : @/*->./src/* — aucun autre alias n existe — source: tsconfig.json:19

- Gate commentaires : seul board.tsx filtre sur STICKY_NOTE ; le back accepte tout type d item, aucune tache back pour formes/textes — source: src/pages/board/board.tsx:68
- Badge lib Septeo : pas de tone primary ni d aria-label -> pastille maison (ecart accepte) — source: node_modules/@septeo/septeo-ui-components/dist/index.d.ts:58-61
- CanvasItem est position absolute : une pastille absolute top-right se place dans ce wrapper, pas dans le Body — source: src/components/widgets/canvasItem/canvasItem.tsx:25-29
- Les mutations update/delete invalident en onSettled avec exact: true sur la liste : la cle des comptes doit etre invalidee a part — source: src/pages/board/hooks/useUpdateCommentMutation.ts:28-30

## Recettes de test

- Service : vi.mock de @/api/httpClient (get/post/patch/delete) et de DisplayError, import dynamique du service — source: src/__tests__/api/comments/commentService.test.ts:7-23
- Board : BoardCanvas et CommentsPanel mockes ; selection d une forme via le bouton "select-shape" du mock — source: src/__tests__/pages/board/board.test.tsx:136-143
- Mutations : test d invalidation de la liste au succes, et pas d invalidation en echec — source: src/__tests__/pages/board/hooks/useCreateCommentMutation.test.tsx:42-56

## Interdits grep-ables

- `<table`
- `className=.*#[0-9A-Fa-f]{3,6}\b`
- `\[[0-9.]+px\]`
- `--bg-page|--fg-|--blueS-|--grey-`
- `from ["'](prjTypes|@api|@utils|@prjTypes|~)/`

## Back (Tableau)

- Lecture d acces : EnsureAccess(userId, boardId, requireWrite: false) ; board inconnu 404, non membre 403 — source: Tableau.Business/Services/BoardService.cs:46-57
- Projection lecture : AsNoTracking + Select vers DTO — source: Tableau.DAL/Repositories/CommentRepository.cs:16-32
- Filtre board : BoardItems.BoardId — source: Tableau.DAL/Repositories/CommentRepository.cs:34-35
- Utilisateur courant : ReadCurrentUserId() + Unauthorized(UnidentifiedUserMessage) — source: Tableau.Api/Controllers/CommentsController.cs:18-22
- Test API : WebApplicationFactory<Program>, en-tete X-User-Id via ClientFor — source: Tableau.Tests/Controllers/CommentsApiTests.cs:23-32
- Test service : NSubstitute ICommentRepository + IBoardService, FixedClock — source: Tableau.Tests/Services/CommentServiceTests.cs:22-31
- Pas de test de repository (testing-conventions) : le repository se couvre par le test API
