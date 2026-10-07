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

`e2e/` : cahier et rapports des deux tests de bout en bout (Playwright, back et front lancés). Premier passage : 13 PASS sur 14. Second passage, après 2 corrections `/sk-xs` : 18 sur 18 sur 5 runs.

Les chemins absolus des rapports pointent vers le scratchpad de la session (éphémère).
