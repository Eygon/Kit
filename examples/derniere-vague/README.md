# Dernière Vague

FPS de survie par vagues jouable sur mobile (paysage, au doigt) ou au clavier/souris, construit de bout en bout avec le kit `/sk-prep` + `/sk-impl` comme banc de test. Mécaniques du genre « zombies » : manches, armes au mur, points, portes payantes, barricades, boîte magique et bonus. Noms et contenus originaux, aucun asset externe : modèles, textures et sons sont générés par le code.

- **Jouer** : ouvrir `derniere-vague.html` (build autonome d'une seule page) dans un navigateur.
- **Développer** : `npm install`, puis `npm run dev`, `npm test`, `npm run typecheck`, `npm run build`.
- **Standards** : `agent-os/standards/` (index à plat `game/x:`), appliqués par le kit.
- **Trios produits par `/sk-prep`** : `specs/00{1..4}-*/` (spec, plan, tâches, recon) pour les 4 features.

Chiffres : 29 US, 1032 tests, 95 % de couverture, environ 91 $ d'agents pour les 4 features (prep, workers, revues et corrections).
