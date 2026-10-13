# Mousse — Direction artistique (fournie par Thomas)

Basée sur la mascotte (houblon à chapeau de mousse, sac à dos, carnet, loupe) : style **vintage cartoon / rubber-hose** (années 30-50), épuré et expressif. Visuel : `assets/mascotte.jpg`.

## 1. Palette

| Rôle | Nom | Hex | Usage |
|---|---|---|---|
| Dominante | Vert Houblon | `#2D6A4F` | corps du personnage, CTA principaux, badges « Découverte » / « Capturé » |
| Accent | Jaune Ambré | `#E9A825` | mousse, surbrillances, notes (étoiles), badges d'expérience / stats, états actifs |
| Structure | Brun Cuir / Ocre | `#4A2E1B` | sac à dos, loupe, navigation secondaire, cartes secondaires |
| Clair | Blanc Crème / Écume | `#F4F1EA` | fond des cartes, texte sur fond sombre, fond du Pokédex |
| Fond | Papier Craft | `#F0EAE1` | fond principal de l'application (carnet de terrain, pas de blanc chirurgical) |
| Encre | Noir Encre | `#1D1C1A` | texte principal, bordures appuyées (2-3 px), icônes |

## 2. Règles UI / UX

- **60 / 30 / 10** : 60 % fond `#F0EAE1` + neutres `#F4F1EA` ; 30 % vert `#2D6A4F` et brun `#4A2E1B` (cartes, menus, catégories) ; 10 % jaune `#E9A825` **réservé aux interactions clés** (valider, ajouter au Pokédex, favoris).
- **Néo-brutaliste doux / vintage** : bordures nettes 2-3 px `solid #1D1C1A`, angles `border-radius` 12-16 px, **ombres dures** `box-shadow: 4px 4px 0 #1D1C1A` (jamais d'ombre floue), **aplats** uniquement (aucun dégradé fin).
- **Typographies** : titres / compteurs / badges en Display rétro (**Chango**, **Shrikhand** ou **Bungee**) ; corps et interface en **Plus Jakarta Sans**, **DM Sans** ou **Space Grotesk**, poids 600, lisibles sur les fiches techniques.

## 3. La mascotte, par contexte (stickers d'état)

| Contexte | Mascotte |
|---|---|
| Pokédex vide / recherche sans résultat | regarde dans sa loupe, point d'interrogation |
| Bière « capturée » / débloquée | lève son carnet avec une étincelle, ou trinque |
| Erreur / bière inconnue | se gratte la tête, un grain de houblon tombe |
| Statistiques / niveau | sac à dos plus chargé, badges |

> Une seule illustration existe pour l'instant : les autres états sont à dessiner. En attendant, l'application utilise l'image fournie avec des habillages CSS (bulle « ? », étincelles, rotation) — à remplacer par les vraies variantes.
