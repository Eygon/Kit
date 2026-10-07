# Compose le prompt de reprise d un enfant du banc : gabarit + historique questions/reponses.
import sys, json
B = "/tmp/claude-0/-home-user-Kit/a9c6902d-2d75-5bd2-9427-2993629a2727/scratchpad/nbench"
cfg = json.load(open(sys.argv[1]))
hist = "".join(f"\n--- Question deja posee :\n{q}\nReponse recue : {a}\n" for q, a in cfg["history"])
res = ("\n\nREPRISE (ta session precedente a ete interrompue par un redemarrage de la machine ; le slot et les fichiers sont intacts). "
       "Echanges deja faits avec le superviseur, dans l ordre :\n" + hist +
       "\nRefais vite les lectures necessaires (git log/diff du slot, fichiers du trio) sans reposer ces questions, puis continue le skill a partir de la derniere reponse.")
s = open(f"{B}/child-runner.md").read()
for k, v in cfg["vars"].items(): s = s.replace("{{" + k + "}}", v)
s = s.replace("{{RESUME}}", res)
open(cfg["out"], "w").write(s)
