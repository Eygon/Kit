#!/usr/bin/env python3
"""mousse-impl.py <label> <prepFrontSlot> <feature> <backUS,..> <frontUS,..> [--tier auto|opus]
Banc Mousse (/home/user/biere) : cree les slots d implementation back et front depuis dev, copie le trio de prep,
ecrit les briefs (brief-fill) de chaque US et hk/wf-args-<feature>-chains.json (engine speckit-us-after-parallel.js,
deux chaines back || front). Banc seulement."""
import json,re,os,shutil,hashlib,subprocess,sys
B="/home/user/biere"; SHARED="/home/user/Kit/skills/_shared"
label,prep,F,BU,FU=sys.argv[1:6]
tier=sys.argv[sys.argv.index("--tier")+1] if "--tier" in sys.argv else "auto"
P=f"{prep}/specs/{F}"
SB=f"{B}/slots/I-{label}b"; SF=f"{B}/slots/I-{label}f"
for repo,S in (("back",SB),("front",SF)):
    if not os.path.isdir(S):
        subprocess.run(["git","-C",f"{B}/{repo}","worktree","add","-q","-b",f"sk-impl-{label}{repo[0]}",S,"dev"],check=True)
        os.symlink(f"{B}/{repo}/node_modules",S+"/node_modules")
if not os.path.exists(SF+"/.sk/repos.json") or SB not in open(SF+"/.sk/repos.json").read():
    os.makedirs(SF+"/.sk",exist_ok=True)
    open(SF+"/.sk/repos.json","w").write(json.dumps({"backend":SB,"legacyBackend":None,"legacyFrontend":None})+"\n")
    # fichier suivi par dev : le masquer, sinon le git add -A du worker le commite (defaut vu en F1 US6)
    subprocess.run(["git","-C",SF,"update-index","--skip-worktree",".sk/repos.json"],check=False)
for S in (SB,SF):
    D=f"{S}/specs/{F}"; os.makedirs(D+"/briefs",exist_ok=True)
    for n in ("spec.md","plan.md","recon.md","tasks.md","parallel.yml"):
        if os.path.exists(f"{P}/{n}"): shutil.copy(f"{P}/{n}",D)
    for d in ("checklists","contracts"):
        if os.path.isdir(f"{P}/{d}"): shutil.copytree(f"{P}/{d}",f"{D}/{d}",dirs_exist_ok=True)
cs=os.listdir(f"{SF}/specs/{F}/contracts") if os.path.isdir(f"{SF}/specs/{F}/contracts") else []
CONTRACT=cs[0] if cs else None
def fill(S,US):
    D=f"{S}/specs/{F}"
    brief={"featureDir":D,"slot":S,"us":US,"skShared":SHARED,"standardsRoot":S,"lecture":[],"facts":[]}
    if CONTRACT:
        h=hashlib.sha256(open(f"{D}/contracts/{CONTRACT}","rb").read()).hexdigest()
        open(D+"/contract.sha256","w").write(h+"\n"); brief["contractPath"]=f"{D}/contracts/{CONTRACT}"; brief["contractHash"]=h
    tasks=open(D+"/tasks.md").read(); parts=re.split(r"^## \[(US\d+)\]",tasks,flags=re.M)
    sec={parts[i]:parts[i+1] for i in range(1,len(parts),2)}
    paths=[m for m in dict.fromkeys(re.findall(r"`((?:src|test|e2e)[^`\s#:]*\.(?:tsx?|json))",sec.get(US,""))) if os.path.exists(f"{S}/{m}") and ".test." not in m]
    brief["lecture"]=[p+":1-80" for p in paths[:8]]
    json.dump(brief,open(f"{D}/briefs/{US}.json","w"),ensure_ascii=False,indent=1)
    r=subprocess.run(["node",f"{SHARED}/brief-fill.mjs",f"{D}/briefs/{US}.json","--out",f"{D}/briefs"],capture_output=True,text=True)
    print(US,r.stdout[-160:],r.stderr[-200:])
for u in BU.split(","):
    if u: fill(SB,u)
for u in FU.split(","):
    if u: fill(SF,u)
FRONT="Banc : node_modules du slot = lien vers le principal ; tests : node node_modules/vitest/vitest.mjs run --coverage=false <fichiers> ; ne lance aucun serveur Vite."
BACK="Banc : NestJS ; node_modules du slot = lien vers le principal ; tests : node node_modules/vitest/vitest.mjs run --coverage=false <fichiers> (supertest, base SQLite en memoire) ; ne lance aucun serveur."
W="Ta sortie finale = le JSON de sortie du brief, rendu comme rapport final."
def g(us,S,banc):
    D=f"{S}/specs/{F}"
    p=lambda k,t: f"Ton brief est dans {D}/briefs/{us}-{k}.md ; lis-le en entier en premier ; cwd du slot {S}.\n{banc} {t}\n"
    return {"id":us,"prompt":p("worker",W),"reviewPrompt":p("review","Ta sortie finale = le JSON de sortie du brief."),"fixPrompt":p("fix",W)}
out={"barrier":None,"parallel":[{"root":SB,"chain":[g(u,SB,BACK) for u in BU.split(",") if u]},{"root":SF,"chain":[g(u,SF,FRONT) for u in FU.split(",") if u]}],"reviewTier":tier}
if CONTRACT:
    out["hashPrompt"]=f"sha256 du fichier {SF}/specs/{F}/contracts/{CONTRACT}, rends {{sha256}}"
    out["expectedHash"]=open(f"{SF}/specs/{F}/contract.sha256").read().strip()
os.makedirs(B+"/out",exist_ok=True)
path=f"{B}/out/wf-args-{F}-chains.json"; open(path,"w").write(json.dumps(out,ensure_ascii=False)); print(path)
