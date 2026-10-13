#!/usr/bin/env python3
"""mkgroups.py <slot> <featureDirName> <US,US,...> [--tier opus|auto] : ecrit hk/wf-args-<feature>.json = args du Workflow speckit-us-loop.js
(groups[] + agentBodies + reviewTier). Banc seulement."""
import json,subprocess,sys
B="/tmp/claude-0/-home-user-Kit/6d0ce183-8a0e-5e9b-8ccd-4301258ef079/scratchpad/nbench"
S,F,uss=sys.argv[1:4]; tier=sys.argv[sys.argv.index("--tier")+1] if "--tier" in sys.argv else "auto"
D=f"{S}/specs/{F}"
BACK_BANC="Banc : depot back .NET 8 ; tests : dotnet test Tableau.sln --filter <classe> (pas de serveur, ne lance pas l API)."
BANC="Banc : node_modules du slot = lien vers le principal ; tests : node node_modules/vitest/vitest.mjs run --coverage=false <fichiers> ; ne lance aucun serveur Vite."
if "--back" in sys.argv: BANC=BACK_BANC
def p(us,kind,tail): return f"Ton brief est dans {D}/briefs/{us}-{kind}.md ; lis-le en entier en premier ; cwd du slot {S}.\n{BANC} {tail}\n"
groups=[{"id":us,
  "prompt":p(us,"worker","Ta sortie finale = le JSON de sortie du brief, rendu comme rapport final."),
  "reviewPrompt":p(us,"review","Ta sortie finale = le JSON de sortie du brief."),
  "fixPrompt":p(us,"fix","Ta sortie finale = le JSON de sortie du brief, rendu comme rapport final."),
  "root":S} for us in uss.split(",")]
bodies=json.loads(subprocess.run(["node","/home/user/Kit/skills/_shared/agent-bodies.mjs"],capture_output=True,text=True,check=True).stdout)
out={"groups":groups,"reviewTier":tier}
if "--no-bodies" not in sys.argv: out["agentBodies"]=bodies
open(f"{B}/hk/wf-args-{F}.json","w").write(json.dumps(out,ensure_ascii=False))
print(f"{B}/hk/wf-args-{F}.json",len(json.dumps(out)),"octets")
