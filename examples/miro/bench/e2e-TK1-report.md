# Rapport E2E — TK-1 Raccourci « 0 » pour revenir au zoom 100 %

**Slot front :** slots/TK1 (sk-xs-TK1) · **Back :** principal · **URL :** http://localhost:5173 · **Perimetre :** tache XS TK-1

**PASS 3 · FAIL 0 · BLOQUE 0** — Playwright (Chromium du poste, Claude in Chrome absent du banc), 3 runs, aucun 5xx, aucune erreur console inattendue.

## Prerequis
- Compte : Alice (X-User-Id 1), tableau « Sprint planning » avec des elements.

## TK-1
- [x] **#1.1 La touche 0 remet le zoom a 100 %** · detail tache — **PASS**
  Observe : 150 % -> 100 % (3/3 runs).
  Etant donne un tableau zoome (deux clics sur Zoom avant), quand j appuie sur 0 hors champ de saisie, alors le bouton de zoom affiche « 100 % ».
  - Oracle : texte du bouton « Reinitialiser le zoom » = « 100 % » (et ≠ 100 % avant).
- [x] **#1.2 La touche 0 tapee dans un champ ne change pas le zoom** — **PASS**
  Observe : champ = « 0 », zoom 125 % inchange (3/3).
  Etant donne un tableau zoome et le champ de commentaire actif, quand je tape « 0 », alors le zoom reste inchange et le champ contient « 0 ».
  - Oracle : texte du bouton de zoom inchange ; valeur du textarea.
- [x] **#1.3 L aide des raccourcis liste le raccourci** — **PASS**
  Observe : section NAVIGATION « Reinitialiser le zoom · 0 » (3/3).
  Quand j appuie sur ?, alors la fenetre « Raccourcis clavier » liste « Reinitialiser le zoom » avec la touche 0.
  - Oracle : texte du dialogue.

## Console attendue
- negociation SignalR du mode dev (bruit connu du banc).
