#!/usr/bin/env python3
"""mkchains.py <slotBack> <slotFront> <featureDirName> <contratFichier> <US,US> <US,US> [--tier auto|opus] : args du Workflow speckit-us-after-parallel.js
avec DEUX chaines (back || front), barrier null, expectedHash lu dans contract.sha256. Ecrit hk/wf-args-<feature>-chains.json et l imprime. Banc seulement."""
import json,sys
B="/tmp/claude-0/-home-user-Kit/6d0ce183-8a0e-5e9b-8ccd-4301258ef079/scratchpad/nbench"
SB,SF,F,CONTRACT,BU,FU=sys.argv[1:7]; tier=sys.argv[sys.argv.index("--tier")+1] if "--tier" in sys.argv else "auto"
FRONT="Banc : node_modules du slot = lien vers le principal ; tests : node node_modules/vitest/vitest.mjs run --coverage=false <fichiers> ; ne lance aucun serveur Vite."
BACK="Banc : depot back .NET 8 ; tests : dotnet test Tableau.sln --filter <classe> (pas de serveur, ne lance pas l API)."
W="Ta sortie finale = le JSON de sortie du brief, rendu comme rapport final."
def g(us,S,banc):
    D=f"{S}/specs/{F}"
    p=lambda k,t: f"Ton brief est dans {D}/briefs/{us}-{k}.md ; lis-le en entier en premier ; cwd du slot {S}.\n{banc} {t}\n"
    return {"id":us,"prompt":p("worker",W),"reviewPrompt":p("review","Ta sortie finale = le JSON de sortie du brief."),"fixPrompt":p("fix",W)}
h=open(f"{SF}/specs/{F}/contract.sha256").read().strip()
out={"barrier":None,"parallel":[{"root":SB,"chain":[g(u,SB,BACK) for u in BU.split(",")]},{"root":SF,"chain":[g(u,SF,FRONT) for u in FU.split(",")]}],
     "hashPrompt":f"sha256 du fichier {SF}/specs/{F}/contracts/{CONTRACT}, rends {{sha256}}","expectedHash":h,"reviewTier":tier}
path=f"{B}/hk/wf-args-{F}-chains.json"; open(path,"w").write(json.dumps(out,ensure_ascii=False)); print(json.dumps(out,ensure_ascii=False))
