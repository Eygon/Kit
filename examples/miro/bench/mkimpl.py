#!/usr/bin/env python3
"""mkimpl.py <repo: front|back> <label> <prepSlot> <feature> <US> [--backend <chemin>] : slot d implementation depuis dev + trio copie + brief + brief-fill.
   Ecrit aussi hk/w-<label>-<US>.md (prompt worker). Banc seulement."""
import json,re,os,shutil,hashlib,subprocess,sys
B="/tmp/claude-0/-home-user-Kit/6d0ce183-8a0e-5e9b-8ccd-4301258ef079/scratchpad/nbench"
repo,label,prep,F,US=sys.argv[1:6]
be=sys.argv[sys.argv.index("--backend")+1] if "--backend" in sys.argv else None
S=f"{B}/slots/I-{label}"; P=f"{prep}/specs/{F}"; D=f"{S}/specs/{F}"
new_slot=not os.path.isdir(S)  # une 2e US dans le meme slot : on ne recree ni le worktree ni le trio
if new_slot:
    subprocess.run(["git","-C",f"{B}/{repo}","worktree","add","-q","-b",f"sk-impl-{label}",S,"dev"],check=True)
    if repo=="front": os.symlink(f"{B}/front/node_modules",S+"/node_modules")
if be and new_slot: open(S+"/.sk/repos.json","w").write(json.dumps({"backend":be,"legacyBackend":None,"legacyFrontend":None})+"\n")
os.makedirs(D+"/briefs",exist_ok=True)
if new_slot:
    for n in ("spec.md","plan.md","recon.md","tasks.md","parallel.yml"):
        if os.path.exists(f"{P}/{n}"): shutil.copy(f"{P}/{n}",D)
    for d in ("checklists","contracts"):
        if os.path.isdir(f"{P}/{d}"): shutil.copytree(f"{P}/{d}",f"{D}/{d}",dirs_exist_ok=True)
brief={"featureDir":D,"slot":S,"us":US,"skShared":"/home/user/Kit/skills/_shared","standardsRoot":S,"lecture":[],"facts":[]}
cs=[f for f in os.listdir(D+"/contracts")] if os.path.isdir(D+"/contracts") else []
if cs:
    h=hashlib.sha256(open(f"{D}/contracts/{cs[0]}","rb").read()).hexdigest(); open(D+"/contract.sha256","w").write(h+"\n")
    brief["contractPath"]=f"{D}/contracts/{cs[0]}"; brief["contractHash"]=h
tasks=open(D+"/tasks.md").read(); parts=re.split(r"^## \[(US\d)\]",tasks,flags=re.M)
sec={parts[i]:parts[i+1] for i in range(1,len(parts),2)}
paths=[]
for m in re.findall(r"`((?:src|Tableau)[^`\s#:]*\.(?:tsx?|cs|json))",sec.get(US,"")):
    if m not in paths and "__tests__" not in m and "Tests/" not in m and os.path.exists(f"{S}/{m}"): paths.append(m)
brief["lecture"]=[p+":1-80" for p in paths[:8]]
json.dump(brief,open(f"{D}/briefs/{US}.json","w"),ensure_ascii=False,indent=1)
print(subprocess.run(["node","/home/user/Kit/skills/_shared/brief-fill.mjs",f"{D}/briefs/{US}.json","--out",f"{D}/briefs"],capture_output=True,text=True).stdout[-300:])
print(subprocess.run(["bash",f"{B}/../../../../../../../home/user/Kit/examples/miro/bench/mkwprompt.sh".replace(B+"/../../../../../../..",""),S,F,US,f"{B}/hk/w-{label}-{US}.md"],capture_output=True,text=True))
print("slot",S,"lecture",brief["lecture"])
