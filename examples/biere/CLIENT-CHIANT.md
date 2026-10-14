# Test « client chiant » — ce qui a frotté, ce qui est corrigé

Un testeur pointilleux (mobile 390 et 360 px, réseau lent, retours arrière, fautes de frappe, fermetures accidentelles, paysage, zoom, clavier) a parcouru l'appli réelle. Scripts : `captures/chiant/c1.mjs` à `c7.mjs` (non gardés dans le kit, jetables).

## Ce qui marche bien (rien à faire)
Squelettes visibles sous réseau lent à 3 s ; pas de débordement à 320 px ni en paysage ; pages « bière / profil inconnus » claires ; scroll retrouvé après retour ; recherche sans casse ni accents ; double appui sans doublon ; confirmation « Nouvelle bière capturée ! » après enregistrement.

## Frustrations trouvées → correction (feature F13)
| # | Frustration | Correction prévue |
|---|---|---|
| 1 | On ne peut pas corriger une dégustation ; commentaire, format et prix saisis ne se relisent jamais dans le Journal | `PATCH /checkins/{id}`, cartes du Journal complètes, bouton « Modifier » qui rouvre le même formulaire prérempli |
| 2 | Fermer la feuille « Je l'ai bue » par erreur efface tout ce qu'on a tapé | Brouillon gardé par bière pendant la session, « Brouillon repris », « Effacer le brouillon » |
| 3 | Formulaire invalide : l'erreur est en haut, le bouton en bas, on croit que rien ne se passe | Défilement + focus sur le premier champ en erreur |
| 4 | Pendant l'envoi le bouton devient seulement grisé | « Enregistrement… » + `aria-busy` sur tous les envois |
| 5 | « cantilon » ne trouve pas Cantillon | Tolérance d'une à deux fautes quand il n'y a aucun résultat exact (bières et lieux) |
| 6 | Une adresse inconnue renvoie en silence vers l'Accueil | Page « Page introuvable » avec bouton de retour |

## Vu, pas corrigé (à décider)
- Le bouton Retour du navigateur quitte la page au lieu de fermer la feuille ouverte (comportement habituel des feuilles ; pas réglé car risqué).
- Zoom extrême (195 px de large, soit ×2 sur 390) : le titre « Encyclopédie » se coupe en pleine lettre et la barre d'onglets tronque « Accueil ». À 320 px tout va bien.
- Histogramme des notes : 5 lignes « 0 avis » quand une bière n'a aucun avis (un peu lourd).
