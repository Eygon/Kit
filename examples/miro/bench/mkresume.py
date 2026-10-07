# Compose le prompt d un enfant du banc : gabarit child-runner.md + (reprise) historique questions/reponses.
# Usage : python3 mkresume.py cfg.json   (cfg = {vars:{CHILD,COMMAND,...}, out, history?:[[q,a],...]})
import sys, json, os
here = os.path.dirname(os.path.abspath(__file__))
cfg = json.load(open(sys.argv[1]))
res = ""
if cfg.get("history"):
    hist = "".join(f"\n--- Question deja posee :\n{q}\nReponse recue : {a}\n" for q, a in cfg["history"])
    res = ("\n\nREPRISE (ta session precedente a ete interrompue par un redemarrage de la machine ; le slot et les fichiers sont intacts). "
           "Echanges deja faits avec le superviseur, dans l ordre :\n" + hist +
           "\nRefais vite les lectures necessaires (git log/diff du slot, fichiers du trio) sans reposer ces questions, puis continue le skill a partir de la derniere reponse.")
s = open(os.path.join(here, "child-runner.md")).read()
for k, v in cfg["vars"].items(): s = s.replace("{{" + k + "}}", v)
s = s.replace("{{RESUME}}", res)
open(cfg["out"], "w").write(s)
print(cfg["out"])
