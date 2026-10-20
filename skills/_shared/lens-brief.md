# Brief « review-lens » (renforcement des tests par mutation, apres la fusion d'une feature)

Un agent (type sk-worker) par ZONE de la feature, dans son propre worktree R-<feature><zone> cree depuis la branche
integree. Entree : le fichier de pistes (`lensIssues` du moteur, une par bloc `fichier:ligne — ce qui manque — action`).
Ce sont des HYPOTHESES.

## Budget (obligatoire dans le prompt : sans lui, un lens dure 20 a 30 minutes)
- 10 minutes pour une zone d'affichage, 15 pour la logique (vote, regles metier, resolution), puis rapport.
- Les pistes d'abord ; ensuite AU PLUS 3 mutations de son cru (5 pour la logique). Pas de campagne de 80 mutations :
  le gain decroit vite apres les premieres.
- Une zone = 3 a 5 US voisines. Les zones d'une feature tournent en parallele (Mousse F14 : 5 zones, 4 a 7 min chacune,
  contre 20 a 30 min pour un lens unique par depot).
- Tests CIBLES uniquement (`vitest run <fichiers>`, `--maxWorkers=3` en jsdom). Jamais la suite complete : le
  superviseur la lance apres la fusion.

## Methode par piste
1. Verifier que le trou existe (lire test et prod).
2. Ecrire l'assertion manquante (jamais d'assertion affaiblie, jamais de skip).
3. MUTATION A LA MAIN : casser la prod comme decrit, le test cible doit passer ROUGE, remettre la prod.
4. Garder seulement les tests prouves rouges ; supprimer les autres en notant pourquoi.
5. Vrai defaut de prod revele : correction minimale, dite explicitement dans le rapport.

## Sortie
UN commit « sk-impl LENS(<feature> <zone>) » apres tsc, eslint et vitest cibles verts ; rapport court : pistes confirmees,
mutations de son cru (tuees / survivantes), ecartees avec raison, defauts de prod, hash.
Le superviseur fusionne chaque zone dans la branche integree, puis lance tsc, eslint et la suite complete UNE fois.

## Pieges vus
- La feuille « Ajouter une bière » (249 pays) coute plusieurs secondes par test en jsdom : relever `testTimeout` pour ce fichier.
- Un test qui ne cite pas un chemin de la US (fichier hors diff) est « HORS-US » pour l'ac-map : le noter, pas le contourner.
- Un mutant equivalent (la fonction trime deja, la combinaison est hors contrat) ne demande aucun test.
