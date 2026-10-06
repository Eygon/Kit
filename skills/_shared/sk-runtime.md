# Lancer l application depuis un slot du pool (source unique)

Contrat lu par `/sk-test` et par toute session a qui l humain dit « lance le
front et le back ». Une skill qui demarre, inspecte ou arrete un serveur de
dev passe par `_shared/sk-runtime.ps1` et ne lance JAMAIS `yarn dev` ou
`dotnet run` a la main : le script porte la table des ports et les trois
regles qui ont coute des incidents (origine par slot, racine servie, kill par
port).

## Un slot = ses ports, derives de son nom de dossier ET de son depot

La base de port depend du **depot** ; l offset, du **dossier du slot**. Le defaut
(`MySepteoWeb` et tout depot hors table) :

| Dossier | Front (Vite) | Back (.NET) |
|---|---|---|
| depot principal (et tout dossier hors `wt-1..4`) | 5183 | 5085 |
| `wt-1` | 5184 | 5086 |
| `wt-2` | 5185 | 5087 |
| `wt-3` | 5186 | 5088 |
| `wt-4` | 5187 | 5089 |

**`Extranet_Client_v3` (Espace Client)** a son propre profil, dans `$repoProfiles` :

| Dossier | Front (Vite) | Back |
|---|---|---|
| depot principal | 5173 | 9898 |
| `wt-1` .. `wt-4` | 5174 .. 5177 | 9898 |

Son backend n est **pas** un `dotnet run` du pool : c est un service .NET Framework
deja en ecoute sur `http://localhost:9898` (IIS / http.sys, PID 4). Le script ne le
demarre jamais et ne lui attribue aucun slot — `up` se contente de verifier qu il
ecoute et le signale sinon. `start-back` n a pas de sens pour ce depot.

Se tromper de plage n est pas benin : l origine `https://localhost:518x` n est pas
enregistree comme redirect URI du client SSO d Espace Client, et la connexion echoue
sur `Invalid parameter: redirect_uri` — un symptome qui ressemble a un bug applicatif.

Le port depend du **dossier**, jamais de la feature. Les deux pools sont
remplis independamment : front `wt-2` et back `wt-2` portent rarement la meme
feature. Le back que vise un slot front est donc **le slot back qui porte la
meme branche** (`git worktree list` du backend, cle `backend` de
`.sk/repos.json` du principal) ; aucun -> `BACK_ROOT` lui-meme, sur sa branche
courante, et le script le dit. `-Action ports` affiche ce tableau pour l etat
reel des deux pools.

La table vit dans `sk-runtime.ps1`. Le `vite.config.mts` du front applique la
meme formule (filet pour un `yarn dev` lance a la main hors kit) et la liste
CORS de developpement du backend enumere ces origines : les trois doivent
rester alignees.

## Trois faits d environnement qui gouvernent tout

1. **L authentification est liee a l ORIGINE.** Le front s authentifie via
   MSAL contre un `redirectUri` enregistre dans Azure AD. Chaque origine
   `https://localhost:518x` de la table y est enregistree en SPA : un slot
   s authentifie sur SON port, sans arreter le principal. Un port hors table
   (Vite qui bascule sur 5188 faute de `--strictPort`, `-Port` fantaisiste)
   s affiche mais ne se connecte jamais — la popup Microsoft revient sur une
   origine enregistree, pas sur lui.
2. **Un port ne dit pas quel worktree il sert.** Le processus qui ecoute est
   remonte a sa racine par sa ligne de commande (`<racine>\node_modules\...`)
   ou son executable (`<racine>\<Projet>\bin\...`). Toujours `status` avant
   `start` : « deja en route » est une reponse normale.
3. **Un kill se fait par PORT, jamais par PID herite.** Le PID retenu au
   lancement est celui de `cmd`/`yarn`, pas de Vite ; il peut etre reattribue.
   Le script tue le processus qui ecoute, puis les orphelins dont la ligne de
   commande cite la MEME racine — rien d autre.

## Le script

```
pwsh -File <SK_HOME>/skills/_shared/sk-runtime.ps1 -Action ports [-Slot <slot front>]
pwsh -File ... -Action status
pwsh -File ... -Action up          -Slot <slot front> [-Force]           <- « lance le front et le back »
pwsh -File ... -Action start-front -Slot <slot front> [-Port N] [-ApiPort N] [-Force]
pwsh -File ... -Action start-back  -Slot <slot back>  [-Port N] [-Force]
pwsh -File ... -Action stop        -Slot <slot>
```

`-Slot .` vaut depuis le worktree courant. `up` resout le back apparie, le
demarre (ou le trouve deja en route), puis demarre le front en le pointant
dessus : c est la commande nominale. `start-front` / `start-back` separent
les deux pour lancer le back en `run_in_background`. `-Port` et `-ApiPort`
ne servent qu a **surcharger** la table (un back hors pool, un port de
secours) : jamais par defaut.

| Sortie | Sens | Ce que fait la skill |
|---|---|---|
| `READY front https://localhost:5186 -> api 5087 ...` | serveur pret, racine verifiee, back vise affiche | continue sur CETTE url |
| `READY <kind> deja en route : ...` | le port sert DEJA ce slot | continue, rien relance |
| `CONFLIT port N : servi par ... root <autre>` (exit 3) | le port du slot sert une autre racine — anormal depuis la table par slot, souvent un `yarn dev --port` manuel | `AskUserQuestion` puis relance avec `-Force` si accord ; jamais `-Force` d emblee |
| `TIMEOUT ... fin du journal` (exit 4) | pas d ecoute dans le delai | lire les 30 lignes rendues, diagnostiquer, ne pas relancer en boucle |

Journaux : `<parent du slot>/<slot>-dev.log` et `<slot>-api.log`, tronques a
chaque lancement. Le back construit avant d ecouter : compter 1 a 5 min au
premier lancement d un slot (restore + build), `-TimeoutSec 300` par defaut
— `up` peut donc durer jusqu a 7 min : le lancer avec un timeout de 600 s ou
en `run_in_background`.

Comment le front recoit ses ports : `start-front` pose `--port` et
`--strictPort`, et injecte `VITE_AUTH_REDIRECT_URI`, `VITE_API_BASE_URL`,
`VITE_API_BASE_URL_LOCAL` (plus `API_PORT`) dans l environnement du processus.
Vite fait primer `process.env` sur les fichiers `.env` : le `.env` du slot,
hardlink de celui du principal et identique partout, n est ni lu par la skill
ni modifie. `start-back` garde le profil `http` de `launchSettings.json` pour
l environnement et passe le port par `-- --urls`, qui prime sur son
`applicationUrl`.

## Ordre de lancement

`up -Slot <slot front>` fait tout. A la main :

1. `status` — une fois, pour les deux pools.
2. `start-back` en **arriere-plan** (`run_in_background`) : c est le plus long.
3. `start-front` en premier plan (il affiche le back vise).
4. Relire le resultat du back. Les deux `READY` = environnement pret.

Front seul (feature sans US backend) : `start-front` vise `BACK_ROOT` sur son
port (5085), et le dit. Aucun back en route : `start-back -Slot <BACK_ROOT>`,
apres l avoir annonce.

## Configuration locale d un slot

Un worktree ne recoit que les fichiers versionnes. Le `.env` du front et tout
autre credential ignore par git manquent donc dans un slot, et `yarn dev` y
demarre sans configuration. Deux scripts, a relancer avant chaque lancement,
idempotents :

```
pwsh -File <SK_HOME>/skills/_shared/link-sk.ps1 -RepoPath <slot>
pwsh -File <SK_HOME>/skills/_shared/link-local-config.ps1 -RepoPath <principal> -Slot <slot>
```

Le second cree des **hardlinks** des credentials du principal dans le slot :
le slot voit toujours la version courante du principal, sans copie a
resynchroniser. Il se relance aussi contre le backend
(`-RepoPath <BACK_ROOT> -Slot <slot back>`) ; si les secrets vivent hors depot
(`UserSecretsId`, `%APPDATA%\Microsoft\UserSecrets`) il repond « aucune
configuration locale a lier » — c est une reponse, pas un manque.

**Regle absolue** : la skill ne nomme JAMAIS un fichier de credentials dans
un tool call (le hook `block-secrets` refuse la commande), et ne lit JAMAIS
son contenu. Elle lit la sortie du script — des noms de fichiers — et rien
d autre. Un `Test-Path`, un `ls` cible ou un `Grep` sur ce fichier sont tous
interdits ; la detection passe par ce script ou par un listage de dossier.

## Apres le test

Les serveurs restent en route par defaut (l humain reprend souvent la main
dans le meme onglet). `stop -Slot <slot>` seulement sur demande. Chaque slot
ayant ses ports, arreter un slot ne rend rien a personne : il n y a plus de
port a « rendre au principal ».
