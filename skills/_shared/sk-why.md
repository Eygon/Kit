# Pourquoi les règles de sk-impl, sk-prep et du reviewer — mesures et vécus

Ce fichier n'est injecté à aucun agent. Il garde la raison des règles de `sk-impl/SKILL.md`,
`sk-prep/SKILL.md` et `us-reviewer.md`, pour le mainteneur du kit (cf. `PRINCIPES.md` §5 du dépôt).
Les règles du worker ont leur propre fichier : `us-sonnet-why.md`.

## Revue — le reviewer corrige lui-même (1.14.0)

Spec 916 US9, 2026-09-24 : revue FAIL pour deux tests de contrôleur manquants (204 et 409 jamais
exercés), code de prod déjà correct. Le reviewer avait écrit le correctif mot pour mot dans son
issue. Le fix Sonnet a pris 6,2 min (relecture à froid, build), la review2 4,3 min ; les deux
tests sont passés au vert du premier coup.
Mesure sur les 130 revues de la machine au 2026-09-24 : une revue d'US qui passe coûte 1,5 à 5 min ;
une review2 3 à 10 min, jusqu'à 24 min.

## Passe polish et `kind: cosmetic` — retirées en 1.14.0

Créées parce qu'un écart de valeur de design payait un fix + review2 (~24 min pour deux classes,
916 US22). Elles ajoutaient une étiquette, une passe de fin de run, un brief et une branche de
clôture. Le reviewer qui pose lui-même la valeur relevée règle le même coût sans ce circuit.

## Tag `Size: xs` et `us-xs-check.sh` — retirés en 1.14.0

Créés en 1.8.0 pour ne pas payer une revue Opus sur une US de 1-2 tâches. Mesure au 2026-09-24 :
aucune revue xs n'a jamais tourné sur les 130 revues de la machine, et une revue Opus d'une petite
US coûte 1,5 à 3 min. En contrepartie, le tag demandait un commit RED par tâche, une règle de pose
et de retrait en prep, une règle de linter, un script et une branche de moteur.

## Revue sans verdict = ERROR, jamais FAIL

916 US15 : une erreur réseau (ENOTFOUND) lue comme FAIL a lancé un fix sur une liste vide, puis
une review2. 916 US14 : un verdict libre « PASS — US14 (...) » lu FAIL par égalité stricte.

## Passation worker → fix

916 US21 : sans commit ni fichiers touchés, le fix a refait toute la recon (11,8 min sur 19).

## Extrait de design au lieu de design.md

US12 : design.md complet (35 Ko) relu 4 fois par le worker, 36 k tokens. L'extrait pèse 4 Ko.

## Brief sans recherche (FACTS, LECTURE, PROD_PATHS)

- US17 (913) : endpoint d'une mutation non cité, le worker a fouillé le dépôt 9 min.
- 916 : la recon faisait 44 % du temps d'un worker ; LECTURE lui fait ouvrir en un tour les
  fichiers que le parent a déjà lus.
- Spec 902 US2 : un fait non vérifié et une interdiction qui en dérivait ont bloqué le worker
  13 min, zéro ligne écrite.
- 913 : 176 clés en fr et en, 0 en es ; le brief disait « traductions dans fr,en ».
- US17 (913) : un seul fichier de test pour 4 tâches, 3 tâches livrées sans test.

## Chauffe du cache Vite

1er run 18,7 s (jsdom 8,9 s, import 5,8 s), 2e run 8,1 s ; un worker lance 8 à 14 gates.

## recon.md vivant, sous 10 Ko

913 : recon des workers passée de 7 à 24 min au fil des US, chacun redécouvrant ce que le
précédent savait. 916 : recon.md à 25 Ko, dont 54 lignes de plus de 200 caractères, relu en
entier par chaque worker et reviewer. 916 : « VirtualizedTable, surcharge inatteignable », écrit
en US15, cru en US24, démenti par son fix.
916 US16 : recon.md décrivait un composant supprimé par un commit déjà mergé dans dev.

## Interdits grep-ables

US17 (913) : le worker avait lu recon.md et a livré un `<table>` natif et un `--bg-page`, tous
deux décrits en prose dans recon.md.
913 : 3 composants d'état de grille existaient ; aucun doc ne les nommait ; 7 workers les ont
cherchés 5-7 min chacun.

## Valeurs de design en tokens, jamais en `[Npx]`

913 : design.md portait 378 valeurs en px et 0 en rem ; le code livré avait 191 valeurs
arbitraires (`text-[13px]` ×16, `text-[12.5px]` ×14…) contre 135 classes d'échelle.
916 : `--font-display` (la lib définit `--font-family-display`) et `Button kind size="s"` (la lib
a `variant` et `sm | md | lg`), remontés par le worker un cycle trop tard.

## Montage (`Monté dans:`)

Neuf récidives (016 ×3, 015 ×2, 018, 913, 916 US19 et US21) : code créé, testé, coché, et monté
par personne. US19 revertée, US21 partie en fix.

## Structure du dépôt vérifiée sur la branche d'intégration

Spec 902 : `MySepteo.Api.Interfaces` n'existait que sur la branche de feature du working tree ;
chemin prescrit inexistant, worker stoppé, 17 min perdues. Un plan.md qui ordonnait « branch from
the integration branch » a fait rebrancher un slot d'audit et vidé la mesure du run.

## Données du contrat vérifiées en base

Spec 902 US2 : `targetedRights` recopié d'un DTO legacy, trois booléens qu'aucune colonne de la
base cible ne porte ; worker stoppé après 13 min, l'US front bloquée avec lui.

## Garde-fou de taille (sk-prep 1bis)

2026-09-08, 3 sessions sur 3 : 20-25 min et 5-6 USD de kit complet pour 3 fichiers et un
comportement, 40-60 % du temps hors travail réel.

## Taille d'une US (sanity 5)

US17 (913) : 4 « Créer » = 4 widgets + 1 hook, 65 min de worker dont 34 de recon, revue FAIL sur
3 tâches sans test. Spec 909 : alias posés sur `loadMore`/`hasMore`, oubliés sur `isError` ; le
test page d'US2 cassait la compilation d'US1.

## Recon par questions (sk-prep A.1)

2026-09-09 (régime L) : deux agents par dépôt ont rendu 17 ancres exactes mais ont manqué
`AccountRepository.cs`, où se construit la requête du compte détaillé — la question n'avait
jamais été posée.

## Mode audit

Suffixe de FEATURE_DIR omis 2 sessions sur 3 ; plan.md en français 2 fois sur 3 sur un besoin
identique ; une marque de phase hors des trois valeurs fait disparaître la phase (fixe % = 100).

## Banc de rejeu 918 (1.15.0)

Méthode, rejouable : une US déjà livrée est rejouée depuis le parent de son premier commit, dans un
worktree jetable (`git worktree add --detach`, jonction `node_modules`, copie propre de
`specs/<feature>` avec les cases de l'US et des suivantes décochées), avec le brief réel conservé
par le parent (chemins réécrits), plusieurs réglages de worker en parallèle, puis le même reviewer
(Opus medium, brief 1.13, sans droit de corriger). Juge : verdict, puis vérification à la main des
écarts. Scripts : `C:\tmp\sk-bench\` (setup-arm.sh, make-brief2.mjs, bench-workflow.js,
bench-review.js, harvest.mjs), hors kit.

- Brief 1.13 (US3 et US6, Sonnet high / Sonnet medium / Opus medium) : 6 revues FAIL sur 6, chaque
  US sur le même défaut quel que soit le worker. US3 : AC5 (« le tri survit à un changement de
  filtre ») sans test, comme le vrai run ; US6 : `gridStates.test.tsx` cassé par le montage du
  panneau, test que la gate du worker ne lance pas. Opus medium coûte 1,25 et 1,68 USD contre
  0,80 et 0,93 pour Sonnet high, pour le même verdict ; un des deux workers Opus n'a pas commité
  DONE.
- Brief 1.15 (AC recopiés, gate `vitest related`, pas de python) : US3 3/3 PASS (high, medium,
  low), US6 2/3 (low FAIL), US4 et US5 2/2 chacun (high, medium). Coût moyen d'un worker : high
  1,49 USD, medium 1,04, low 0,95. Medium a toujours eu le verdict de high, pour 30 % de moins.
- Revue rejouée sur les 6 livraisons de US3/US6 avec Opus high, Sonnet high et Opus low : 18 PASS.
  Or deux livraisons US6 (medium, low) livrent un bouton d'épinglage inerte (le panneau réutilisé
  l'affiche par défaut, l'état n'est pas câblé) : Opus medium l'a vu une fois sur deux, les trois
  autres réglages jamais. L'effort plus haut n'achète pas la détection ; Opus medium reste. Le vrai
  commit US6 de la 918 a le même défaut : sa cause est la tâche T032, qui reprenait du jumeau la
  visibilité et l'ordre, pas l'épinglage (exemple ajouté au critère de prep).
- Le reviewer qui corrige (1.14) n'a pas été rejoué : le brief rejoué est celui de la 1.13.

## Relais /sk-impl dans une session neuve

917 (session c7ee6b9a) : /sk-impl lancé dans la session de prep démarrait à 503 k tokens de
contexte et finissait à 810 k ; 97 tours, 60 M tokens relus en cache, ~8 USD de parent de plus
qu'une session neuve (~100 k au départ). 918 : le parent pesait 58 % de la session pour la même
raison.

## Après un ESCALATE

917 : trois « arbitrated-fix » écrits à la main après escalade. Deux briefs incomplets (pas de
reviewPrompt, une gate vitest sans fichier qui a lancé la suite complète, 22 min), et chaque
passage en revue complète a fait découvrir d'autres écarts : 4 revues sur US3. La revue
d'ESCALATE va désormais au bout et liste les écarts de code restants, le fix suit us-fix.md.

## Groupes sans reviewPrompt

917 : 8 groupes sur 10 envoyés au moteur sans reviewPrompt ni fixPrompt. Le moteur ne le voyait
qu'après le worker : deux arrêts après avoir payé le worker, un diagnostic faux du parent, et US8
livrée sans aucune revue. D'où le contrôle avant le premier agent, puis `brief-fill.mjs`.

## Regex de clôture corrompue

La regex qui relit les commits `sk-impl REVIEW(` à la clôture avait perdu ses antislashs à
l'écriture (`\b` devenu l'octet 0x08). Elle sortait toute ligne ajoutée et ne reconnaissait ni
`.skip(` ni `xit(` : le seul contrôle mécanique du verdict FIXED ne contrôlait rien. Même octet
dans la regex hex des interdits de sk-prep. Le harnais lit désormais la regex dans SKILL.md.

## `contract-field-without-source` en MEDIUM

Banc /sk-audit (2026-09-09) : 21 findings HIGH sur 23 faux positifs, la règle exigeant une source
pour chaque champ d'un DTO existant recopié. 917 : 17 HIGH gardés à chacun des 4 runs du linter,
validés quand même, pendant que la vraie lacune (un attribut de spec sans champ) passait.

## Banc design 917 (1.15.0)

917 US5 et US6 rejouées depuis leur base, trois bras chacune : le prompt manuscrit du vrai run
(« lis us-sonnet.md », chemins, pas de tâches ni d'AC recopiés) en Sonnet medium, brief-fill en
medium, brief-fill en high ; même reviewer 1.15 Opus medium.
- brief-fill a refusé le prompt d'origine : la page où les composants se montent manquait aux
  chemins autorisés.
- US6 : le prompt manuscrit livre encore un mock à la place du service de contacts (le défaut du
  vrai run), le reviewer le remplace (FIXED) ; les deux bras brief-fill utilisent le vrai service
  dès le départ (PASS).
- US5 : les trois bras codent l'annuaire des destinataires en dur, aucune source n'existant dans
  la prep ; deux reviewers escaladent, le troisième passe. D'où l'exemple « source de chaque donnée
  qu'une AC affiche » dans le critère de prep.
- Coût worker : medium 0,91 et 1,13 USD, high 0,98 et 1,47, verdicts identiques.
