#!/usr/bin/env python3
"""mkparallel.py <slotBack> <slotFront> <featureDirName> : ecrit hk/wf-args-<feature>-parallel.json = args du Workflow
speckit-us-after-parallel.js (barrier null, US1 back || US2 front, expectedHash, agentBodies). Banc seulement."""
import json,subprocess,sys
B="/tmp/claude-0/-home-user-Kit/6d0ce183-8a0e-5e9b-8ccd-4301258ef079/scratchpad/nbench"
SB,SF,F=sys.argv[1:4]
def item(us,S,banc,tail_w):
    D=f"{S}/specs/{F}"
    p=lambda kind,tail: f"Ton brief est dans {D}/briefs/{us}-{kind}.md ; lis-le en entier en premier ; cwd du slot {S}.\n{banc} {tail}\n"
    return {"id":us,"prompt":p("worker",tail_w),"reviewPrompt":p("review","Ta sortie finale = le JSON de sortie du brief."),"fixPrompt":p("fix",tail_w),"root":S}
FRONT="Banc : node_modules du slot = lien vers le principal ; tests : node node_modules/vitest/vitest.mjs run --coverage=false <fichiers> ; ne lance aucun serveur Vite."
BACK="Banc : depot back .NET 8 ; tests : dotnet test Tableau.sln --filter <classe> (pas de serveur, ne lance pas l API)."
W="Ta sortie finale = le JSON de sortie du brief, rendu comme rapport final."
bodies=json.loads(subprocess.run(["node","/home/user/Kit/skills/_shared/agent-bodies.mjs"],capture_output=True,text=True,check=True).stdout)
h=open(f"{SF}/specs/{F}/contract.sha256").read().strip()
out={"barrier":None,"parallel":[item("US1",SB,BACK,W),item("US2",SF,FRONT,W)],
     "hashPrompt":f"sha256 du fichier {SF}/specs/{F}/contracts/duplicate-board.yaml, rends {{sha256}}","expectedHash":h,
     "agentBodies":bodies,"reviewTier":"auto"}
open(f"{B}/hk/wf-args-{F}-parallel.json","w").write(json.dumps(out,ensure_ascii=False))
print(f"{B}/hk/wf-args-{F}-parallel.json")
