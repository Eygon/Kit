# Mousse — l'appli des amateurs de bière

Banc d'essai du kit `sk-*` : une vraie appli construite de bout en bout avec le kit (prep → implémentation → revue → tests réels).
React 19 + TypeScript + HeroUI (front) · NestJS + SQLite (back) · mobile first (390 px, vérifié aussi à 360 px).

## Ce que fait l'appli

| Écran | Contenu |
|---|---|
| **Accueil** | Fil d'actualité : dégustations, découvertes du jour, montées de niveau et avis des profils suivis |
| **Bières** | Encyclopédie « Pokédex » de 120 bières : filtres, recherche, tri par note, amertume et couleur, avis de la communauté |
| **Carte** | Bars, caves et brasseries avec leurs bières : disponibilité (votes « toujours là / plus là »), recherche d'un lieu par nom ou ville, « déjà bue / à découvrir », proposition de lieu, signalement d'une bière |
| **Journal** | Mes dégustations (lieu, note, photo) |
| **Profil** | Avatar (12 au choix), niveau et titre selon les bières découvertes, badges, statistiques, histogramme 12 mois, envies « À goûter », langue FR/EN |
| **Profils** | Liste des amateurs, suivre / ne plus suivre, abonnés et abonnements |

L'appli est installable (manifeste + icônes depuis la mascotte) et lisible hors ligne : coquille et lectures déjà vues en cache (service worker en production seulement), bandeau « Vous êtes hors ligne ». Pour la voir : `npm run build && npx vite preview --port 5174`.

Direction artistique : `DA.md` (vert houblon, ambre pour les interactions clés, bordures encre, ombres dures).

## Lancer

```bash
# back (port 5090, base SQLite data/mousse.db, 120 bières + 36 lieux + démo seedés au premier démarrage)
cd back && npm install && npm run build && npm start
#   PORT=5090 DATABASE_PATH=:memory: SEED_DEMO_ACTIVITY=true   (variables optionnelles)

# front (port 5173, API sur http://localhost:5090 ou VITE_API_URL)
cd front && npm install && npm run dev
```

Pas d'authentification : l'en-tête `X-User-Id` (1 Alice, 2 Bob, 3 Carol) identifie l'utilisateur ; le sélecteur est dans **Profil → Utilisateur de démonstration**.
Fond de carte : tuiles OpenStreetMap (nécessite Internet ; sans elles la carte reste utilisable).

## Tester

```bash
cd back  && npm test && npm run typecheck && npm run lint
cd front && npm test && npm run typecheck && npm run lint
```

Tests réels navigateur (Playwright, API réelle) : `e2e/` — un script par fonctionnalité (`e2e-f1.mjs` … `e2e-f7.mjs`, `e2e-g.mjs`), à lancer depuis `captures/` après avoir démarré l'API (`DATABASE_PATH=:memory:`) et le front. Ils utilisent les oracles du kit (`skills/_shared/e2e-oracles.mjs`).

## Comment c'est construit (le kit)

`PRODUIT.md` (besoin et backlog) → `sk-prep` (spec, plan, tâches, contrat OpenAPI) → `mousse-impl.py` (créneaux back/front) → moteur `speckit-us-after-parallel.js` (worker Sonnet, revue Opus, loupe de tests) → review-lens (tests renforcés par mutation) → fusion → tests réels → `JOURNAL.md`.
Les `front/` et `back/` de ce dossier sont des copies de travail du code livré (sans `node_modules`, `.git`, `specs`).

## Décisions à confirmer

Toutes les décisions prises par le superviseur en l'absence de Thomas sont regroupées dans `DECISIONS.md` (23 décisions, avec le pourquoi) ; le détail par feature est dans `JOURNAL.md` et dans les `plan.md` des specs (« à confirmer par Thomas »).
