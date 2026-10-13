#!/usr/bin/env python3
"""postwf.py <task.output> <label> : lit le resultat d un Workflow, imprime une ligne par US (verdict, commit, revue corrigee, pistes),
ecrit hk/<label>-leads.json (pistes par US) et /tmp/facts-<label>-<US>.json (faits). Banc seulement."""
import json,sys
B="/tmp/claude-0/-home-user-Kit/6d0ce183-8a0e-5e9b-8ccd-4301258ef079/scratchpad/nbench"
o=json.load(open(sys.argv[1])); label=sys.argv[2]; r=o["result"]; d=json.loads(r) if isinstance(r,str) else r
print({k:v for k,v in d.items() if k not in("parallel","results")}, "agents",o.get("agentCount"),"tokens",o.get("totalTokens"))
rows=[]
def flat(x):
    if isinstance(x,list):
        for y in x: flat(y)
    elif isinstance(x,dict):
        if "id" in x and "review" in x: rows.append(x)
        for k,v in x.items():
            if isinstance(v,(list,dict)) and k not in("facts","lensIssues","notes","issues","reviewFixes","filesTouched","reviewCommits"): flat(v)
flat(d.get("parallel",[])); flat(d.get("results",[]))
leads={}
for x in rows:
    li=x.get("lensIssues",[]); leads[x["id"]]=li; json.dump({"facts":x.get("facts",[])},open(f"/tmp/facts-{label}-{x['id']}.json","w"))
    print(x["id"],x["review"],x.get("commit"),"fixedByReview",x.get("fixedByReview"),"lens",len(li),"files",len(x.get("filesTouched",[])),"error",x.get("error"),"halt",x.get("halt"))
    for y in li: print("   lead:",y["text"][:150].replace("\n"," "))
json.dump(leads,open(f"{B}/hk/{label}-leads.json","w"),ensure_ascii=False,indent=1)
