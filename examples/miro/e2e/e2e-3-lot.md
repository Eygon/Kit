# Cahier E2E (passage 5, mode lot) — Tableau, 9 features

**Features :** m1 sticky-comments · m2 board-sharing · m3 board-undo-redo · m4 board-connectors · m5 comments-all-items · m6 freehand-drawing · m7 minimap-zoom-dock · m8 realtime-presence · m9 board-json-transfer
**Slot front :** runs/m9/slot (vite, http://localhost:5173) · **Slot back :** miro/back (http://localhost:5080, SQLite memoire + seed, F9 incluse)
**Redige le :** 2026-10-07 · **Perimetre :** AC qui traversent back + front des 9 specs, plus les croisements entre features · **Hors perimetre :** conformite pixel design.md (m7 US1 AC5, US2 AC7), i18n en/es (on verifie seulement fr), tests back-only (m8 US1-2 et m9 US2 AC5 : couverts par les tests d integration)

## Prerequis

- Comptes seed : Alice=1 proprietaire du tableau 1 "Sprint planning" (4 items), Bob=2 editeur, Carol=3 lectrice ; tableau 2 "Retrospective".
- Utilisateur courant : Alice. Carol/Bob dans le navigateur : la requete du module de config front est reecrite a la volee par Playwright (identifiant 3) ; aucun fichier modifie. Bob agit par l API (X-User-Id 2).
- Ecran : accueil = liste des tableaux (boutons "Importer", "Nouveau tableau") -> clic sur le nom -> page tableau (barre d outils a gauche, "Partager" et "Exporter" dans l en-tete, avatars de presence a droite, dock mini-carte + zoom en bas a droite).
- Base fraiche : back relance (restart-back.sh) avant chaque script, 3 runs complets.
- Oracles transverses (tous scenarios) : aucune reponse 5xx (navigateur et appels API du script) ; aucune erreur console hors liste attendue (negociation SignalR coupee par le double montage StrictMode en dev ; "Failed to load resource" 4xx ou net::ERR_FAILED uniquement dans les scenarios qui provoquent ce 4xx ou ce blocage).

## F1 a F6 (passage 2, rejoues par f16.mjs ; detail dans e2e2/e2e.md)

- [ ] **#1.1** Poster un commentaire et le relire apres rechargement · m1 US6 AC1, US7 AC1
- [ ] **#1.2** Resoudre puis supprimer son commentaire · m1 US7 AC4, AC5
- [ ] **#1.3** Post-it sans commentaire : etat vide (GET 204, "Aucun commentaire") · m1 US2 AC2
- [ ] **#2.1** La modale Partager liste les membres · m2 US6 AC1
- [ ] **#2.2** Changer un role et retirer un membre · m2 US7 AC1, AC2
- [ ] **#2.3** Ajouter un membre (selecteur limite aux non-membres) · m2 US9 AC1, AC2
- [ ] **#2.4** Lectrice : barre reduite a Selection, aucun PATCH, refus API 403 · m2 US5 ; m3 US3 AC1 ; m4 US5 AC4 ; m6 US3 AC5
- [ ] **#3.1** Annuler/Retablir visibles et desactives a l ouverture · m3 US1 AC1
- [ ] **#3.2** Annuler une creation puis la retablir (Ctrl+Shift+Z) · m3 US1 AC2, US2 AC2
- [ ] **#3.3** Annuler un deplacement (Ctrl+Z), position persistee · m3 US1 AC3, US2 AC1
- [ ] **#4.1** Creer un connecteur et le retrouver apres rechargement · m4 US5 AC1, US3 AC1
- [ ] **#4.2** Le connecteur suit l item deplace · m4 US3 AC4, US4 AC1
- [ ] **#4.3** Changer le style puis supprimer un connecteur · m4 US6 AC1, US7 AC1
- [ ] **#4.4** Supprimer un item supprime ses connecteurs · m4 US1 AC7
- [ ] **#5.1** Badge apres un commentaire sur une forme, survit au rechargement · m5 US1, US4, US5 AC1
- [ ] **#5.2** Badge disparait apres resolution ; droits de /comments/counts · m5 US5 AC2, US2
- [ ] **#6.1** Trace au Crayon enregistre et identique apres rechargement · m6 US3, US4
- [ ] **#6.2** Annuler retire le trace, Retablir le remet · m6 US3 AC4, SC-002

## F7 — Mini-carte et barre de zoom (f7.mjs)

- [ ] **#7.1** Zoom avant : `125 %` et monde a l echelle 1.25 · m7 US1 AC1 — Oracle : libelle du bouton "Réinitialiser le zoom", `transform` de `[data-testid=board-world]`.
- [ ] **#7.2** "Tout afficher" avec un item eloigne (API) : boite englobante visible et centree (+-2 px) · US1 AC2 — Oracle : `getBoundingClientRect` des items vs viewport.
- [ ] **#7.3** "Tout afficher" borne a `25 %` (item a 20000,15000) et `300 %` (tableau avec un seul petit texte), boite centree · US1 AC3, Edge « Fit would exceed »
- [ ] **#7.4** Clic sur le pourcentage apres zoom + deplacement : `100 %`, translate(0,0) · US1 AC4
- [ ] **#7.6** Noms accessibles fr des 4 boutons ; mini-carte = bouton focalisable ; dock en bas a droite, mini-carte au-dessus de la barre · US1 AC6, US2 AC6
- [ ] **#7.7** Une forme par item (`minimap-item-*`) et le rectangle `minimap-viewport` · US2 AC1
- [ ] **#7.8** Deplacer la vue deplace le rectangle ; zoomer le reduit de 1/1.25 · US2 AC2
- [ ] **#7.9** Glisser un item : sa forme suit pendant le glisser · US2 AC3
- [ ] **#7.10** Clic dans la mini-carte : rectangle centre sur le point clique, zoom inchange · US2 AC4
- [ ] **#7.11** Tableau vide : cadre vide, "Tout afficher" et clic mini-carte sans effet · US2 AC5, Edge « Board without items »
- [ ] **#7.L1** Clic dans le dock (outil Selection puis Post-it) : aucun POST, selection conservee · Edge « A click inside the dock »

## F8 — Presence et synchro temps reel (f8.mjs, repris de e2e3)

- [ ] **#8.1** Alice seule : avatar "Alice", pas de "Hors ligne" · m8 US3 AC1, US4 AC4
- [ ] **#8.2** Carol (lectrice) arrive : 2 avatars chez Alice sans recharger, Carol en ligne · US1 AC2, US3 AC2, Edge « Viewer »
- [ ] **#8.3** Creation / deplacement / suppression par Alice via l API : visibles chez Carol sans recharger · US2 AC1, US5 AC1
- [ ] **#8.4** Ecriture depuis l ecran : en-tete `X-Connection-Id` envoye, pas de rechargement en double · US5 AC2, AC3
- [ ] **#8.5** Carol ferme son onglet : Alice revient a 1 avatar · US1 AC3

## F9 — Export / import JSON (f9.mjs, repris de e2e4)

- [ ] **#9.1** "Exporter" telecharge `Sprint planning.tableau.json`, sans commentaires ni membres, extremites = cles du fichier · m9 US1 AC1, AC2, AC4, US3 AC1
- [ ] **#9.2** "Importer" : selecteur `.json`, toast succes, nouveau tableau "(import)" ouvert, connecteurs rattaches aux nouveaux ids, Alice seule proprietaire · US2 AC1, AC2, US4 AC1, AC2
- [ ] **#9.3** Fichier version 2 : un toast "Ce fichier n'est pas un tableau valide.", rien cree · US2 AC3, US5 AC1
- [ ] **#9.4** Fichier > 1 Mo : un toast "Le fichier dépasse 1 Mo.", rien envoye ni cree · US2 AC4, US5 AC2
- [ ] **#9.5** Fichier non JSON : toast fichier invalide, rien envoye · US5 AC3
- [ ] **#9.6** Lectrice : "Exporter" utilisable ; export par un non-membre = 403 · US3 AC2, US1 AC3

## Entre features (x.mjs)

- [ ] **#X.1 Role courant inconnu : GET members bloque** · F2 x F3 x F8 x F9 x F7 ; m2 US3 AC3, m3 US3 AC4
  Etant donne Alice (proprietaire) dont la requete GET /boards/1/members est bloquee (`page.route` -> `abort`), quand elle ouvre le tableau 1, alors une seule erreur est affichee ; outils d edition (F2) et Annuler/Retablir (F3) lisent le meme role : tous absents ensemble (defaut sur) ; Suppr, Ctrl+Z et glisser n envoient aucune ecriture ; "Exporter" telecharge quand meme (F9) ; presence "Alice" en ligne (F8) ; zoom et mini-carte fonctionnent (F7).
- [ ] **#X.2 Historique F3 apres une synchro F8** · m3 US1 AC8, Edge « deleted meanwhile » ; m8 US5 AC1
  Etant donne Alice qui vient de creer un post-it, quand Bob le supprime par l API, alors il disparait chez Alice sans recharger ; quand Alice clique Annuler, alors DELETE = 404, un seul toast d erreur, Annuler et Retablir desactives, aucun item recree.
- [ ] **#X.3 Connecteur et trace crees par un autre utilisateur arrivent en direct** · F4 x F6 x F8 x F7 x F3 ; m8 US2 AC1, AC2, US5 AC1
  Quand Bob cree par l API un trace Freehand puis un connecteur 1 -> trace, alors Alice et Carol voient la polyligne (memes points, couleur, epaisseur) et la ligne sans recharger, la mini-carte gagne la forme, l historique d Alice ne bouge pas ; quand Bob supprime le trace, trace, connecteur et forme de mini-carte disparaissent en direct.
- [ ] **#X.4 Import d un tableau avec trace et connecteurs, puis annuler/retablir et mini-carte** · F9 x F6 x F4 x F3 x F7 ; m9 US2 AC2, m6 US1 AC3
  Etant donne le tableau 1 avec un trace et 2 connecteurs (dont un relie au trace), quand Alice l exporte puis l importe, alors le nouveau tableau dessine le trace a l identique et 2 lignes entre nouveaux ids, la mini-carte a une forme par item, l historique est vide ; supprimer le trace retire aussi sa ligne, Annuler le recree (POST Freehand, memes points), Retablir le resupprime ; "Tout afficher" montre tous les items.
- [ ] **#X.5 Une lectrice qui importe devient proprietaire du nouveau tableau** · F9 x F2 x F3 x F8 ; m9 Edge « importer becomes owner »
  Etant donne Carol lectrice du tableau 1, quand elle l exporte puis importe le fichier, alors le nouveau tableau lui appartient : barre complete, Annuler present (desactive), presence "Carol", modale Partager = Carol seule "Propriétaire" ; elle cree un post-it (201) et Annuler s active.
- [ ] **#X.6 Badge F5 apres import** · F9 x F5 ; m9 US1 AC4, m5 US5 AC1
  Etant donne un commentaire non resolu sur la forme 3 (badge), quand Alice exporte et importe, alors le nouveau tableau n a aucun badge (GET counts = 204) ; un commentaire sur la forme importee y fait apparaitre un badge, seul ; le tableau source garde son badge "1".
- [ ] **#X.7 Crayon actif et dock ; trace a 125 %** · F6 x F7 ; m7 Edge « click inside the dock never creates an item », m6 US2 AC1
  Etant donne le Crayon actif, quand Alice clique "Zoom avant" puis dans la mini-carte, alors le zoom passe a 125 % et aucun item n est cree (aucun POST) ; un trace dessine a 125 % est enregistre avec son premier point aux coordonnees monde attendues (+-1).
