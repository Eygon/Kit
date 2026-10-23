# Bench modèles / effort — qui pour orchestrer, qui pour développer ?

Date : 2026-10-23. Cas réel : US1 de F13 (PATCH /checkins/{id}, back Mousse), brief sk-impl identique pour tous.

## Méthode
- **Dev** : 6 variantes × 2 essais, chacune dans son worktree isolé, même brief. Juge : 112 tests cachés (référence), tsc, eslint, standards-pack, 114 tests du dev final (strong.sh), puis **10 mutations** du code appliquées par un agent indépendant (le worker a-t-il écrit des tests qui détectent la casse ?).
- **Orchestrateur** : 9 cas faciles (1 ordre d'options) + 13 cas difficiles × 3 ordres d'options, avec corrigé. Variantes : opus low/medium/high, sonnet low/medium/high, haiku medium, fable medium.

## Résultats dev (moyenne de 2 essais)
| Variante | Tests cachés | tsc/eslint/standards | Tokens | Durée | Mutations tuées |
|---|---|---|---|---|---|
| Sonnet low | 112/112 ×2 | 0 / 0 / 0 | 142 k | 296 s | 9/9 |
| Sonnet medium | 112/112 ×2 | 0 / 0 / 0 | 146 k | 428 s | 10/10 |
| Sonnet high | 112/112 ×2 | 0 / 0 / 0 | 172 k | 601 s | 9/9 |
| Opus medium | 112/112 ×2 | 0 / 0 / 0 | 173 k | 638 s | 10/10 |
| Fable medium | 112/112 ×2 | 0 / 0 / 0 | 220 k | 714 s | 9/9 |
| Haiku medium | 112/112 ×2 | 0 / 0 / 0 | 245 k | 634 s | 8/9 (M10 survit) |

(M2 est un mutant équivalent : non tuable, exclu du score. Mutations mesurées sur l'essai 1 seulement.)
Un second jeu (tâche T2, 1 essai) donne le même classement coût : sonnet-low 114 k < sonnet-medium 120 k ≈ sonnet-high 121 k < opus 124 k < fable 154 k < haiku 170 k.

## Résultats orchestrateur
- **Difficile : 22 passes sur 22 = corrigé**, pour tous les modèles et tous les ordres.
- **Facile (9 cas, 1 passe)** : opus-low 9/9 ; opus-medium, opus-high, sonnet-high, haiku, fable 8/9 ; sonnet-medium 7/9. Les écarts viennent du cas 1 (options 1 et 3 quasi équivalentes) et d'un cas isolé chez Fable : bruit, pas un effet de modèle ou d'effort.

## Conclusion
1. **Correction : aucune différence mesurable.** Le brief du kit est assez prescriptif pour que tous les modèles livrent un code conforme. Le test ne discrimine pas la qualité de code.
2. **Coût/temps : Sonnet low est le meilleur** (~2× plus rapide que Opus/Fable, ~40 % de tokens en moins que Haiku, qui re-boucle). Monter l'effort ne rapporte rien ici et coûte +20 à +100 % de temps.
3. **Haiku** : le plus cher en tokens et la seule mutation survivante → à éviter pour le dev.
4. **Orchestrateur** : pas de différence mesurée, pas d'avantage à Opus high. Pas de preuve pour descendre sous Opus sur les arbitrages risqués (prep, reviewer) : le test était trop facile.

## Recommandation
- Worker (sk-worker) : **Sonnet, effort low** (medium si la US est large).
- Reviewer / arbitrage / prep : garder Opus medium (pas prouvé nécessaire, mais le coût d'une erreur y est plus élevé et l'écart de prix reste faible).
- Éviter Haiku en dev.

## Limites
n = 2 essais par variante ; agents en parallèle (durées bruitées par la charge) ; une seule US ; corrigé orchestrateur écrit par nous ; tests saturés. Pour vraiment départager les orchestrateurs : bench long (sk-prep complet sous AUDIT_MODE, noté par audit-lint et cap-check) — à faire si besoin.
