# Recon de feature

Squelette genere par recon-seed.mjs sur origin/dev (124c3e3). La prep garde ce qui sert la spec et ajoute ses faits.

## Composants partages reutilisables

- PageHeader — src/components/elements/pageHeader/pageHeader.tsx — props: title, subtitle — source: src/components/elements/pageHeader/pageHeader.tsx:3
- Button lib — variant: "primary"|"secondary"|"ghost"|"danger", size: "sm"|"md", icon?: string, disabled?: boolean, onClick — source: node_modules/@septeo/septeo-ui-components/dist/index.d.ts:3-14
- Button n a pas de prop loading : etat occupe = disabled — source: node_modules/@septeo/septeo-ui-components/dist/index.d.ts:7-14
- septeoToast (lib) — success(message: string), error(message: string) — source: node_modules/@septeo/septeo-ui-components/dist/index.d.ts:126-129
- Aucun selecteur de fichier dans la lib : un `<input type="file" accept=".json">` natif masque, ouvert par le Button — source: node_modules/@septeo/septeo-ui-components/dist/index.d.ts:109-124

## Helpers et hooks de la feature

- httpClient.post(url, body) serialise le body en JSON ; erreur -> HttpError(status) sans lire le corps — source: src/api/httpClient.ts:11-36
- DisplayError(error) = un toast, cle via getErrorTranslationKey (401/403/404, sinon errors.generic) — source: src/utils/displayError/displayError.ts:5-7
- Modele d ecriture de service (post + mapper + DisplayError + rethrow) : BoardService.create — source: src/api/boards/boardService.ts:49-57
- URL : BOARDS(), BOARD_BY_ID() avec `{boardId}` remplace par `.replace` — source: src/utils/apiURL/apiURL.ts:3-5
- Hook de mutation modele : toast succes dans le hook + invalidate boardKeys.list() — source: src/pages/boards/hooks/useCreateBoardMutation.ts:7-17
- Nom du tableau sur la page : board.data?.name (useBoardQuery) — source: src/pages/board/board.tsx:224
- Ouvrir un tableau depuis la liste : prop onOpenBoard(boardId) — source: src/pages/boards/boards.tsx:44-47
- strokePointDtoToModel pour les points d un item libre — source: src/types/mappers/boardItem/strokePointMapper.ts:4-7

## Pieges verifies

- LOCALES : src/i18n/locales/{en,es,fr}.json — chaque cle dans CHAQUE fichier ; parite : src/__tests__/i18n/localesParity.test.ts — source: git ls-tree origin/dev
- ALIAS tsconfig : @/*->./src/* — aucun autre alias n existe — source: tsconfig.json:19
- PARTAGE : `src/i18n/locales/fr.json`, `src/i18n/locales/en.json`, `src/i18n/locales/es.json`, `src/api/boards/boardService.ts`, `src/utils/queryFunctions/boardQueryFunctions.ts` — ajout seulement
- Le message du serveur n atteint jamais le front (HttpError ne garde que status) : traduire par status — source: src/api/httpError.ts:1-9
- HttpStatusCodeEnum n a pas de membre 413 : l ajouter (PAYLOAD_TOO_LARGE = 413) avant de l utiliser — source: src/enums/httpStatusCodeEnum.ts:1-11
- Un service qui appelle DisplayError ET un hook onError qui toaste = double toast : toast uniquement dans le service — source: src/api/boards/boardService.ts:53-55
- Le controle septeo-library-first signale `<input` dans un .tsx : l input file masque est l exception justifiee (pas de selecteur dans la lib)

## Recettes de test

- Service : vi.mock httpClient {get,post,patch,delete: vi.fn()} + vi.mock DisplayError ; mockPost.mockResolvedValue({ status, data }) — source: src/__tests__/api/boards/boardService.test.ts:9-15
- Page liste : vi.mock des hooks (useBoardsQuery, useCreateBoardMutation) + renderWithProviders — source: src/__tests__/pages/boards/boards.test.tsx:17-23
- Page tableau : mocks via vi.hoisted et vi.mock par hook — source: src/__tests__/pages/board/board.test.tsx:12-35
- Builders : buildBoard, buildBoardItem — source: src/__tests__/utils/builders.ts:5-15
- Telechargement en test : espionner URL.createObjectURL / revokeObjectURL et le click d une ancre (jsdom ne les implemente pas)

## Interdits grep-ables

- `<table`
- `className=.*#[0-9A-Fa-f]{3,6}\b`
- `\[[0-9.]+px\]`
- `--bg-page|--fg-|--blueS-|--grey-`
- `from ["'](prjTypes|@api|@utils|@prjTypes|~)/`

## Back (Tableau)

- API test : WebApplicationFactory<Program> + header X-User-Id ; board 1 : user 1 Owner, 2 Editor, 3 Viewer ; board 2 : 2 Owner, 1 Editor — source: Tableau.Tests/Controllers/BoardsApiTests.cs:14-31
- Seed : 6 items, aucun connecteur, aucun item libre : un test d import cree ses propres donnees — source: Tableau.DAL/Seed/DataSeeder.cs:31-43
- Service test : NSubstitute sur les interfaces + Shouldly, AAA — source: Tableau.Tests/Services/BoardServiceTests.cs:13-21
- Lecture avec droit lecteur : IBoardService.GetBoard (null si absent, 403 si non membre) — source: Tableau.Business/Services/BoardService.cs:21-31
- Garde des traces : ValidateStroke prive dans BoardItemService (2000 points, largeurs 2/4/8) — source: Tableau.Business/Services/BoardItemService.cs:13-14
- Transaction : Repository.BeginTransactionAsync() — source: Tableau.DAL/Repositories/Repository.cs:20
- Points stockes en JSON : BoardItemMapper.SerializePoints — source: Tableau.DAL/Mappers/BoardItemMapper.cs:44-45
- Creation board + membre proprietaire : BoardRepository.Add — source: Tableau.DAL/Repositories/BoardRepository.cs:55-62
- Erreurs : BadRequestException -> 400 { message } par le middleware ; les controleurs ne catchent pas — source: Tableau.Api/Middleware/ExceptionHandlingMiddleware.cs:22-30
- Enums lies en chaine (JsonStringEnumConverter) : type inconnu -> 400 automatique avant l action — source: Tableau.Api/Program.cs:17
