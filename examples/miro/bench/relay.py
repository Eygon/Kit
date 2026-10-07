# Banc : relaie une [SK-QUESTION] dans le faux Notion (commentaire + statut + pending), puis,
# humain absent, y repond a sa place (commentaire humain explicite) et rend la ligne de reponse.
# Usage : python3 relay.py <sup> <TK-n> <page> <question.txt> <options.json> <choix> [motif]
import json, subprocess, sys, datetime
sup, tk, page, qfile, ofile, choice = sys.argv[1:7]
motif = sys.argv[7] if len(sys.argv) > 7 else "option recommandée"
SIM = ["node", "/home/user/Kit/skills/_shared/notion-sim.mjs", "--board", f"{sup}/board.json"]
PLAN = ["node", "/home/user/Kit/skills/_shared/notion-plan.mjs"]
now = lambda d=0: (datetime.datetime.now(datetime.UTC).replace(tzinfo=None) + datetime.timedelta(seconds=d)).strftime("%Y-%m-%dT%H:%M:%SZ")
asked = now()
subprocess.run(SIM + ["comment", "--page", tk, "--file", qfile, "--now", asked], check=True, capture_output=True)
subprocess.run(SIM + ["set", "--page", tk, "Statut=Question pour toi", f"Journal={asked[11:16]} question posée (voir commentaire)"], check=True, capture_output=True)
r = json.load(open(f"{sup}/runs.json")); run = r["runs"][page]
run["pending"] = {"kind": "question", "options": json.load(open(ofile)), "expectsText": False, "askedAt": asked}
json.dump(r, open(f"{sup}/runs.json", "w"), indent=1)
open(f"{sup}/a.txt", "w").write(f"{choice} — (réponse donnée par Claude à la place de Thomas, absent : {motif})")
subprocess.run(SIM + ["comment", "--page", tk, "--file", f"{sup}/a.txt", "--as", "human", "--now", now(1)], check=True, capture_output=True)
subprocess.run(SIM + ["set", "--page", tk, "Statut=Réponse donnée"], check=True, capture_output=True)
subprocess.run(SIM + ["view", "--out", f"{sup}/rows.json"], check=True, capture_output=True)
t = json.loads(subprocess.run(PLAN + ["tick", "--rows", f"{sup}/rows.json", "--state", f"{sup}/runs.json", "--config", f"{sup}/notion.json"], check=True, capture_output=True, text=True).stdout)
assert any(a["type"] == "relay-answer" and a["page"] == page for a in t["actions"]), t
cm = subprocess.run(SIM + ["comments", "--page", tk], check=True, capture_output=True, text=True).stdout
open(f"{sup}/comments.json", "w").write(cm)
ans = json.loads(subprocess.run(PLAN + ["answer", "--comments-file", f"{sup}/comments.json", "--state", f"{sup}/runs.json", "--page", page], check=True, capture_output=True, text=True).stdout)["answer"]
assert ans, "reponse humaine introuvable"
run["pending"] = None; run.setdefault("history", []).append([open(qfile).read()[:200], ans])
json.dump(r, open(f"{sup}/runs.json", "w"), indent=1)
phase = "Claude prépare" if run["phase"] == "prep" else "Claude implémente"
subprocess.run(SIM + ["set", "--page", tk, f"Statut={phase}", f"Journal={now()[11:16]} réponse relayée : {choice}"], check=True, capture_output=True)
print(ans)
