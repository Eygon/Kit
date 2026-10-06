# /sk-impl — Mode audit (lu seulement si AUDIT_MODE=1)

Si AUDIT_MODE=1 (echo une fois). Absent = ignore.
1. Aucune AskUserQuestion. Lis AUDIT_INTENT_FILE.
   Consigne AUDIT_OUT_DIR/answers.jsonl
   {"question":"...","answer":"...","grounded":true|false}

2. Trio : la ou /sk-prep l a ecrit. Si specs/ du slot est
   une jonction vers le principal, le trio est deja visible
   ici et la copie est un no-op (« same file ») : ce n est
   PAS une erreur, ne la repare pas. .sk/repos.json se lit
   sur le PRINCIPAL (parent du git-common-dir), jamais sur le
   slot : un slot ne le voit pas, et « absent du slot » n est
   pas « absent ».
3. Marques : UN echo par marque, UNE marque par commande.
   Format exact :
     echo AUDIT_MARK sk-impl bootstrap start
   bootstrap = slot pool + trio. cycles = Sonnet(s) jusqu au
   dernier commit DONE. closing = gates + revue + verdict.
   `cycles start` s emet JUSTE AVANT le premier Agent/Workflow :
   emis apres, la decomposition du run est perdue. Six echos par run complet : bootstrap s/e, cycles s/e,
   closing s/e. Un STOP avant cycles emet bootstrap start/end
   SEULEMENT (2 marques, pas de cycles ni closing vides) et
   result.sk-impl.json avec outcome "stopped", stop.section citee,
   compteurs a 0 sauf userStories/tasks lus dans tasks.md.
4. Ecris AUDIT_OUT_DIR/result.sk-impl.json avant la synthese,
   au schema EXACT de `<SK_SHARED>/sk-audit.md` §result. Jamais result.json
   nu (collision avec /sk-prep dans la meme session).
5. Pas d interaction differee. GO implicite. Pas de merge
   squash en audit (le runner compare le slot).
6. Slot IMPOSE = le cwd. Le runner l a deja prepare
   (wt-audit-N, branche sk-audit-<AUDIT_SESSION>, base =
   HEAD du principal). Verifie une fois :
     git branch --show-current  ->  sk-audit-<AUDIT_SESSION>
   Autre chose -> STOP « slot d audit absent ». Puis SAUTE
   0bis en entier : aucun slot FRONT wt-1..4, aucun checkout -B
   du slot front, aucune branche sk-impl-* front, aucune ligne
   STATUS_FILE front, aucun EnterWorktree.
   Slot BACKEND en audit : IMPOSE lui aussi. Si une US retenue
   porte des chemins backend, le slot est AUDIT_BACK_SLOT
   (prepare par le runner dans <POOL_BASE>/<BACK_SLUG>/
   wt-audit-N, branche sk-audit-<AUDIT_SESSION>, base =
   AUDIT_BACK_BASE = origin/<defaut> du backend). Verifie :
     git -C $env:AUDIT_BACK_SLOT branch --show-current
       -> sk-audit-<AUDIT_SESSION>
   Puis SAUTE la resolution du slot backend de la section
   Cross-repo (aucun wt-1..4 backend, aucun checkout -B,
   aucune ligne STATUS_FILE backend). AUDIT_BACK_SLOT absent
   alors qu une US backend est retenue -> STOP « slot backend
   d audit absent » : ne prends JAMAIS un slot du pool de
   travail backend en audit : il resterait pris sans
   liberation ni capture.
   Ne rebranche JAMAIS le slot front, quoi que plan.md dise
   de la base d implementation : le runner mesure le diff
   contre la base qu il a posee, un rebranchement rend la
   mesure vide.
Section Triage d un plan.md ancien : IGNORER.
