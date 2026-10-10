#!/bin/bash
# mkfan.sh <variante> : prompts solo (h1 s o) + eventail (fa fb fc fd), mode rapport seul
B=/tmp/claude-0/-home-user-Kit/6d0ce183-8a0e-5e9b-8ccd-4301258ef079/scratchpad/nbench; H=$B/hk; v=$1
RO='
## MODE BANC « RAPPORT SEUL » (prime sur le brief)
Tu ne modifies AUCUN fichier et ne commites rien (arbre propre en sortie). Tu fais tous les checks du brief, mais au lieu de corriger, tu RAPPORTES chaque ecart.
Ton rapport final = uniquement ce JSON :
{"verdict":"PASS|FAIL","issues":[{"file":"chemin:ligne","ecart":"ce qui est faux, attendu vs trouve","preuve":"ce que tu as vu (commande, ligne de spec, test)"}]}
Une issue = un defaut reel (code ou test), pas une preference. Va au bout de la grille : ne t arrete pas au premier ecart.'
for m in h1 s o fa fb fc fd; do bash $H/mkreview.sh $v $m >/dev/null 2>&1; printf '%s\n' "$RO" >> $H/review-$v-$m.md; done
lens() { printf '\n## TA LOUPE (revue en eventail : 4 relecteurs, chacun une loupe, puis un verificateur)\n%s\nTu ne rapportes QUE ce qui releve de ta loupe, mais tu la creuses a fond : chaque ligne du diff concernee, chaque AC et chaque cas limite de la spec concerne. Hors loupe : ignore, un autre relecteur s en charge.\n' "$2" >> $H/review-$v-$1.md; }
lens fa "A — DONNEES : chaque valeur que le code produit ou transmet, comparee a ce que la spec et le plan exigent, et aux constantes/conventions du projet (standards de l US)."
lens fb "B — CONDITIONS : chaque cas ou la spec dit que l action ne doit PAS se produire, ou seulement pour certains utilisateurs ou etats. Chacune existe dans le code ET a un test qui rougirait sans elle."
lens fc "C — EFFETS ET CABLAGE : tout ce que l action doit declencher au-dela de sa valeur de retour (etat de la page, appels, autres fonctionnalites du produit qu elle doit respecter), et le branchement effectif du code dans l application."
lens fd "D — TESTS : chaque attente de test comparee a la spec (pas au code) ; assertions partielles ou affaiblies ; AC ou cas limite sans test qui rougirait. Rejoue red-replay."
