# Banc « Tableau » (clone de Miro) — nuit du 6 au 7 octobre

Trios produits par `/sk-prep` (mode audit), puis implémentés par `/sk-impl` (workers Sonnet, reviews Opus ou Sonnet selon le palier) dans deux dépôts : back .NET 8 (EF Core, SQLite mémoire) et front React (react-query, vitest).

| Dossier | Feature | Régime | US |
|---|---|---|---|
| 001-sticky-comments-m1-r1 | commentaires des post-it, avec maquette claude.ai/design | L (back + front + design) | 7 |
| 001-board-sharing-m2-r1 | partage, rôles lecteur / éditeur | L | 9 |
| 001-board-undo-redo-m3-r1 | annuler / rétablir (préparée avant la fusion de F2 : test de dérive) | M (front) | 3 |
| 001-board-connectors-m4-r1 | connecteurs entre items, voies parallèles US4 ∥ US5 | L | 8 |
| 001-comments-all-items-m5-r1 | demande piège : commentaires partout + badge | L | 5 |
| 001-freehand-drawing-m6-r1 | dessin à main levée (enum étendu des deux côtés) | L | 4 |
| 001-minimap-zoom-dock-m7-r1 | mini-carte et zoom depuis une 2e maquette claude.ai/design (3 pièges) | M (front + design) | 2 |
| 001-realtime-presence-m8-r1 | présence et synchro temps réel (SignalR, 2 nouvelles dépendances) | L | 5 |
| 001-board-json-transfer-m9-r1 | export / import JSON (remappage des id de connecteurs) | L | 5 |
| 001-live-cursors-m10-r1 | curseurs des autres en direct (hub F8 réutilisé, calque sans pointer-events) | L | 2 |

`e2e/` : cahier et rapports des deux tests de bout en bout (Playwright, back et front lancés). Premier passage : 13 PASS sur 14. Second passage, après 2 corrections `/sk-xs` : 18 sur 18 sur 5 runs. Troisième passage en mode lot (F1 à F9) : 46 PASS sur 47, × 3 runs (`e2e-3-lot*.md`).

Les chemins absolus des rapports pointent vers le scratchpad de la session (éphémère).
