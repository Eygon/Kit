# Recon de feature

Squelette genere par recon-seed.mjs sur origin/dev (e1fd828). La prep garde ce qui sert la spec et ajoute ses faits.

## Composants partages reutilisables

- ZoomControls — src/components/widgets/zoomControls/zoomControls.tsx — props: zoom, onZoomIn, onZoomOut, onReset — source: src/components/widgets/zoomControls/zoomControls.tsx:5
- Icon (lib) — @septeo/septeo-ui-components — props: name, size — always aria-hidden; used for the zoom bar icons — source: src/pages/board/components/widgets/commentsPanel/commentsPanel.tsx:1
- Aucun composant mini-carte, dock ou mesure de taille existant dans src/components/{elements,widgets}.

## Helpers et hooks de la feature

- useViewport — seul etat de vue {x,y,zoom} ; zoomIn/zoomOut/reset/panBy ; a etendre, jamais dupliquer — source: src/pages/board/hooks/useViewport.ts:8
- clampZoom — borne MIN_ZOOM..MAX_ZOOM ; a reutiliser dans fitTo — source: src/pages/board/utils/clampZoom.ts:3
- screenToWorld — monde = (ecran - offset) / zoom ; inverse pour centrer : offset = ecran/2 - monde*zoom — source: src/pages/board/utils/screenToWorld.ts:3
- connectorItems — items avec la position glissee appliquee ; source des formes de la mini-carte — source: src/pages/board/components/modules/boardCanvas/boardCanvas.tsx:34
- BoardItem — x, y, width, height sur tous les types (freehand compris) — source: src/types/models/boardItem/boardItem.ts:4

## Pieges verifies

- LOCALES : src/i18n/locales/{en,es,fr}.json — chaque cle dans CHAQUE fichier ; parite : src/__tests__/i18n/localesParity.test.ts — source: git ls-tree origin/dev
- jsdom n a pas ResizeObserver (setup.ts ne le definit pas) : useElementSize le garde (typeof) et les tests le stubent via vi.stubGlobal — source: src/__tests__/setup.ts:1
- Format du zoom : `125%` asserte aujourd hui ; design = `125 %` : mettre le test a jour dans la meme tache — source: src/__tests__/pages/board/components/modules/boardCanvas/boardCanvas.test.tsx:73
- Clic dans le dock : remonte a handleBackgroundClick (creation/deselection) : stopPropagation sur le dock — source: src/pages/board/components/modules/boardCanvas/boardCanvas.tsx:45
- --spacing-7 de la lib = 28px, ce n est PAS le --space-7 du design (gap 4px = --spacing-1) — source: css de la lib installee (septeo.css)
- ALIAS tsconfig : @/*->./src/* — aucun autre alias n existe — source: tsconfig.json:19

## Recettes de test

- Rendu : renderWithProviders (QueryClient + i18n reel, langue fr dans les tests) ; requetes par role et nom fr — source: src/__tests__/utils/renderWithProviders.tsx:19
- Items de test : buildBoardItem(overrides) — source: src/__tests__/utils/builders.ts:15
- Canevas : renderCanvas(overrides) et data-testid board-world (transform translate/scale) — source: src/__tests__/pages/board/components/modules/boardCanvas/boardCanvas.test.tsx:16
- La lib Septeo n est pas mockee dans setup.ts (une seule ligne jest-dom) — source: src/__tests__/setup.ts:1

## Interdits grep-ables

- `<table`
- `className=.*#[0-9A-Fa-f]{3,6}\b`
- `\[[0-9.]+px\]`
- `--bg-page|--fg-|--blueS-|--grey-`
- `from ["'](prjTypes|@api|@utils|@prjTypes|~)/`
