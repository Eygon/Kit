-- Schema du tableau /sk-notion (notion-create-database, parametre schema). Puis deux vues :
-- « Tableau de bord » : board, GROUP BY "Statut"
-- « File Claude (ne pas modifier) » : table, FILTER "Statut" IN ("À faire", "Claude prépare",
--   "Question pour toi", "Réponse donnée", "Plan à valider", "Plan validé", "Claude implémente",
--   "Claude teste"); SORT BY "Num" ASC
CREATE TABLE ("Tâche" TITLE, "Statut" SELECT('Brouillon':default, 'À faire':blue, 'Claude prépare':yellow, 'Question pour toi':red, 'Réponse donnée':pink, 'Plan à valider':orange, 'Plan validé':purple, 'Claude implémente':yellow, 'Claude teste':brown, 'Terminé':green, 'Bloqué':gray), "Priorité" SELECT('Urgente':red, 'Haute':orange, 'Normale':yellow, 'Basse':gray), "Projet" SELECT('MonProjet':blue), "Taille" SELECT('Auto':default, 'Petite (XS)':green, 'Feature':purple), "Validation du plan" SELECT('Je valide':orange, 'Auto':green), "Résultat" URL, "Tests navigateur" RICH_TEXT, "Journal" RICH_TEXT, "Feature" RICH_TEXT, "Session" RICH_TEXT, "Démarré" DATE, "Fini" DATE, "Num" UNIQUE_ID PREFIX 'TK', "Créé" CREATED_TIME)
