import os,json,sys
S=os.environ["S"]; p=f"{S}/hard-results.json"
d=json.load(open(p)) if os.path.exists(p) else {}
for arg in sys.argv[1:]:
    k,v=arg.split("=",1); d[k]=[int(x) for x in v.split(",")]
json.dump(d,open(p,"w"))
keys=json.load(open(f"{S}/hard-keys.json"))
agg={}
for k,v in sorted(d.items()):
    m,o=k.split("|"); key=keys[o]; sc=sum(1 for i,x in enumerate(v) if x==key[str(i+1)]); agg.setdefault(m,[]).append(sc)
    bad=[i+1 for i,x in enumerate(v) if x!=key[str(i+1)]]
    print(f"{k:22} {sc}/13 erreurs sur cas {bad}")
print({m:f"{sum(s)}/{13*len(s)}" for m,s in agg.items()})
