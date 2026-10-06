# Pourquoi les regles de us-sonnet.md — mesures et vecus

Ce fichier n est PAS injecte au worker. Il garde la raison de chaque
regle de `us-sonnet.md`, pour le mainteneur du kit : une regle dont on
a perdu la raison finit supprimee, et l incident revient. Chaque entree
renvoie a la section de `us-sonnet.md` qu elle justifie.

## Recon de feature

Spec 913 : 7 workers ont chacun redecouvert GridSkeleton / GridError /
GridEmpty, la source de la devise et l espace insecable de
toLocaleString. Recon passee de 7 a 24 min au fil des US, 200-250 k
tokens de contexte par worker. La devise non trouvee a en plus coute un
cycle de review.

## Faits etablis

Spec 902 US2 : le brief affirmait que les liens de droits existaient
dans DAL/Models (faux, jamais verifie), interdisait de creer une entite,
et demandait de ne pas revalider. Le worker n avait plus qu a s arreter.
13 min perdues, zero ligne. Le fait venait d une phrase de plan.md vraie
pour US1, recopiee sans etre requalifiee pour US2.
Spec 916 US16 : recon.md (ecrit en prep) decrivait un composant supprime
depuis par un commit deja merge dans dev. Le worker l a constate, a
refuse d improviser et a remonte avec preuve : c est la regle 3.

## Aucun utilisateur interactif

Spec 916 US13, premier run : le worker a passe son tour a comparer les
slots du pool et a recouper status.md, puis s est mis « en attente de
confirmation utilisateur ». 96 s, 68 k tokens, 0 fichier touche : un
Workflow n a aucun canal pour lui repondre. Ses trois `facts` ne
portaient que sur l etat des slots.

## Design — extrait

US12 : design.md complet (35 Ko) relu 4 fois par le worker, 36 k tokens.
L extrait pese 4 Ko et se lit une fois.

## TDD — import paresseux (stack Vite/vitest)

Spec 916 US30 : `await import("<chemin litteral>")` est resolu
statiquement au collect ; un module encore inexistant fait crasher toute
la suite au lieu de donner un rouge par test. Le chemin dans une const +
`/* @vite-ignore */` donne un vrai rouge.
Spec 916 US15 : le premier `it` qui importe a froid peut depasser le
timeout vitest de 5000 ms sur un slot charge : faux rouge, corrige par
`--testTimeout=20000` en ligne de commande.

## Moins d allers-retours

Mesure 2026-09-23, 30 agents de la spec 916 : un worker genere ~5 000
tokens (code et tests compris), soit 1 a 2 min, sur 21 min. Le reste :
~76 appels d outil a 4-8 s chacun (hooks du poste compris) pour des
commandes de 50-180 ms, ~49 tours de modele a 3,5-4,5 s, et 6 min de
gates. La relecture du test avant et apres le GREEN coutait 2 appels
par tache pour une verification qu une copie dans le git-dir fait dans
la commande de la gate.

## i18n

Spec 913 : 176 cles en fr et en, 0 en es ; test de parite rouge pendant
7 US, chaque worker l a declare « pre-existant ».
Spec 916 : le test de parite etait deja rouge sur dev (2 cles manquantes
dans en.json). Son verdict ne disait donc rien ; le comptage des
feuilles, ecart inchange avant/apres, a tenu 11 US sans langue oubliee.

## Recon bornee

US17 (913) : `grep -rln` sur tout le depot 4 fois, 8 min, listes de 300
fichiers sans un seul fait.

## Gates globales

Spec 913 : les tests eux-memes durent 40 ms, le process 20-60 s (jsdom
9 s, imports 6 s, node) ; fix US9 a lance 3 typecheck (340 s), fix US14
4 lint (294 s) — autant que toutes les gates vitest de l US.
Spec 909 US1 : l unique erreur du typecheck etait dans un test qu US2
devait migrer (mock d un hook dont `isError` etait retire). Sans regle
de classement, le worker n avait que deux issues : deborder de son
perimetre, ou STOP pour rien.
Spec 916 US16 : le worker a annonce le typecheck vert ; il etait rouge
(TS2322 sur des props initiales de renderHook), invisible a la gate
vitest. La cloture l a attrape.
Commande incrementale, validee le 2026-09-23 dans wt-4 (TS 5.9.3, meme
projet que `yarn typecheck`) : meme code de sortie que le complet, une
erreur injectee dans un fichier non suivi est detectee (TS2322, exit 2)
puis disparait a son retrait, cache de 1,3 Mo dans le git-dir du
worktree, `git status` propre. Duree sur un poste charge : 90 s en
complet, ~62 s en incremental a chaud. Le gain est modeste et la mesure
fragile (le meme poste est monte a 540 s plus tard) : ne pas vendre la
commande comme rapide, seulement comme equivalente.

## Auto-controle avant DONE

US17 (913) : `<table>` natif et `--bg-page`, tous deux dans recon.md,
tous deux en review FAIL : une regle en prose se lit, une regex
s execute.

## Montage

Neuf recidives (016 x3, 015 x2, 018, 913, 916 US19 et US21) : un
composant, un hook ou un service cree, teste, coche, et monte par
personne. Sur la 916, US19 a ete revertee (panneau monte nulle part,
ids de colonnes inventes dans les tests) et US21 est partie en fix
(service d affectation sans appelant, tache cochee avec son AC declare
en ecart).

## Budget

Mesure 2026-09-09 (regime L, r1) : le worker a livre 6/8 en 7 min,
T010 et T012 restaient, il a STOP alors qu il lui restait 33 min ; le
run entier a fini en WIP, typecheck rouge, aucune revue de l US. Le
plafond de taches avait coupe un worker en avance sur son temps.

## Sortie structuree — designConformance et passation

Spec 902 : deux ecarts que le worker pouvait constater seul ont coute
deux cycles de revue complets.
Spec 916 : la passe de fix repartait sans le travail du worker et
refaisait toute la recon (11,8 min sur les 19 du fix d US21) ; `commit`
et `filesTouched` lui donnent le point de depart.

## Criteres d acceptation dans le brief (1.15.0)

Banc de rejeu 918 US3 : trois workers (Sonnet high, Sonnet medium, Opus
medium) sur le brief 1.13 laissent le MEME AC sans test, comme le vrai
run ; le reviewer juge sur spec.md, que le worker ne voyait pas. Avec
les scenarios recopies dans le brief, 3 workers sur 3 passent la revue.

## Gate de fin `vitest related` (1.15.0)

Banc de rejeu 918 US6 : trois workers sur trois cassent
gridStates.test.tsx (le montage du panneau de colonnes ajoute SidePanel,
absent du mock de ce test), que la gate « tes fichiers de test » ne
lance pas ; la revue la relance (check 4) et rend FAIL. `related` le
voit (verifie a la main : 3 rouges sur 33) ; avec lui, les 3 workers
completent le mock (3 lignes) et ce defaut disparait de la revue. Le vrai worker de la 918 l avait fait
de lui-meme (4 lignes de mock).

## Pas de python

`python3` sur ce poste est l alias du Windows Store : il attend une
entree et bloque jusqu au timeout de l outil (120 ou 300 s). Mesure sur
918 : 4 occurrences, 2 a 5 min chacune, 22 % du temps outil des workers
et fix de la session ; fix US3 de 12,4 min dont ~10 bloquees.
