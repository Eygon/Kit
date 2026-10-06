# /sk-prep — Mode audit (lu seulement si AUDIT_MODE=1)

Ce bloc s applique QUE si AUDIT_MODE=1. Verifie une fois
au debut (echo AUDIT_MODE). Absent = ignore cette section.

1. Aucune AskUserQuestion. Lis AUDIT_INTENT_FILE. Consigne
dans AUDIT_OUT_DIR/answers.jsonl
{"question":"...","answer":"...","grounded":true|false}

2. FEATURE_DIR = specs/<NNN>-<slug>-<AUDIT_SESSION>. Le suffixe
   est OBLIGATOIRE et se pose a la CREATION du dossier, pas
   apres. Sans lui, deux sessions du meme item partagent un
   dossier dans un specs/ commun, et /sk-impl lit « deja
   implemente ».
3. Marques : UN echo par marque, UNE marque par commande,
   jamais deux marques dans le meme appel. Format exact :
     echo AUDIT_MARK sk-prep bootstrap start
   <phase> prend TROIS valeurs et trois seulement :
   bootstrap | cycles | closing. Rien d autre n est lu :
   une marque « specify », « clarify », « plan », « sanity »
   ou « relais » est ignoree et la phase disparait du calcul
   Ce que chaque phase RECOUVRE (pas des noms de marques) :
   bootstrap = recon jusqu a l entree dans specify ;
   cycles = specify, clarify, plan, tasks, strip ;
   closing = sanity, validation du trio, relais.
   Donc exactement 6 echos par run : bootstrap start/end,
   cycles start/end, closing start/end. Une marque emise
   deux fois, ou deux dans un meme echo, fausse la
   decomposition du temps.
4. Trio en ANGLAIS : spec.md, plan.md, tasks.md, checklists.
   Sans exception.
5. Ecris AUDIT_OUT_DIR/result.sk-prep.json (Write) avant la
   synthese, au schema EXACT de sk-audit.md §result — memes
   cles, memes types, rien de plus. Jamais result.json nu : les
   deux skills s ecraseraient. Un objet libre n est comparable
   a rien : 4 sessions ont produit 4 formes incompatibles.
6. Aucune interaction differee. Termine et rends l objet final.

7. Garde-fou de taille (A.1bis) en audit : la question se resout par l intent (regle 1). Option 1 retenue = result.sk-prep.json outcome "stopped", stop.section "## A. 1bis Garde-fou de taille", puis bootstrap end et closing start/end quand meme.

8. Numerotation :
  En AUDIT_MODE : laisser create-new-feature.ps1 calculer
  le NNN (max existant + 1) et NE PAS l incrementer a nouveau
  si le dossier existe deja : l unicite vient du suffixe
  AUDIT_SESSION, pas du numero. Deux sessions paralleles du
  meme item obtiennent le meme NNN avec deux suffixes, c est
  le comportement voulu.

9. Perimetre (0quater), clarify, filet, checklists, validation : tout vient de AUDIT_INTENT_FILE, consigne dans answers.jsonl.
