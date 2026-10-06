# install-cursor.ps1 — pose le kit sk-* dans l installation CURSOR d une machine.
#
# Le kit est le MEME des deux cotes : ce script ne transforme rien, il copie
# skills/ et agents/ tels quels, puis genere les raccourcis /sk-* que Cursor
# attend dans commands/. L adaptation de runtime (outils, modeles, sous-agents,
# navigateur, CLI) vit dans _shared/sk-host.md, lue a l execution.
#
# Idempotent. Ne supprime JAMAIS rien : un fichier local seul est signale, pas
# nettoye — meme regle que /sk-update.
#
#   pwsh -File <clone>/skills/_shared/install-cursor.ps1 -Source <clone>
#   pwsh -File <clone>/skills/_shared/install-cursor.ps1 -Source <clone> -Check
#
# -Source  racine du clone sk-kit (celle qui porte skills/ et agents/).
#          Par defaut : deux niveaux au-dessus de ce script.
# -Target  racine d installation Cursor. Par defaut : $env:CURSOR_HOME,
#          sinon ~/.cursor. Aucun chemin machine n est ecrit dans ce fichier.
# -Check   n ecrit rien, rend le plan et s arrete.

param(
    [string]$Source = "",
    [string]$Target = "",
    [switch]$Check
)

$ErrorActionPreference = "Stop"

# --- Resolution des racines -------------------------------------------------

if (-not $Source) { $Source = Split-Path -Parent (Split-Path -Parent $PSScriptRoot) }
$Source = (Resolve-Path $Source).Path

foreach ($sub in @("skills", "agents")) {
    if (-not (Test-Path (Join-Path $Source $sub))) {
        Write-Output "PAS UN CLONE sk-kit : $Source ne porte pas $sub/"
        exit 1
    }
}

if (-not $Target) {
    $Target = if ($env:CURSOR_HOME) { $env:CURSOR_HOME.Trim() } else { Join-Path $HOME ".cursor" }
}

$skillsDst = Join-Path $Target "skills"
$agentsDst = Join-Path $Target "agents"
$cmdsDst   = Join-Path $Target "commands"

Write-Output "source : $Source"
Write-Output "cible  : $Target"
Write-Output ""

# --- Inventaire, en lecture seule -------------------------------------------

# Trois classes, les memes que /sk-update : nouveau, modifie, local seul.
# Un local seul n est jamais touche.
function Get-Plan {
    param([string]$SrcDir, [string]$DstDir)

    $plan = @{ New = @(); Changed = @(); Same = @(); LocalOnly = @() }
    if (-not (Test-Path $SrcDir)) { return $plan }

    $srcFiles = Get-ChildItem -Recurse -File $SrcDir -ErrorAction SilentlyContinue
    foreach ($f in $srcFiles) {
        $rel = $f.FullName.Substring($SrcDir.Length).TrimStart("\", "/")
        $dst = Join-Path $DstDir $rel
        if (-not (Test-Path $dst)) { $plan.New += $rel; continue }
        $a = (Get-FileHash $f.FullName -Algorithm SHA256).Hash
        $b = (Get-FileHash $dst -Algorithm SHA256).Hash
        if ($a -eq $b) { $plan.Same += $rel } else { $plan.Changed += $rel }
    }

    if (Test-Path $DstDir) {
        foreach ($f in (Get-ChildItem -Recurse -File $DstDir -ErrorAction SilentlyContinue)) {
            $rel = $f.FullName.Substring($DstDir.Length).TrimStart("\", "/")
            if (-not (Test-Path (Join-Path $SrcDir $rel))) { $plan.LocalOnly += $rel }
        }
    }
    return $plan
}

$plans = [ordered]@{
    "skills" = Get-Plan -SrcDir (Join-Path $Source "skills") -DstDir $skillsDst
    "agents" = Get-Plan -SrcDir (Join-Path $Source "agents") -DstDir $agentsDst
}

foreach ($k in $plans.Keys) {
    $p = $plans[$k]
    Write-Output ("{0,-8} nouveaux {1,-4} modifies {2,-4} identiques {3,-4} locaux seuls {4}" -f `
        "$k/", $p.New.Count, $p.Changed.Count, $p.Same.Count, $p.LocalOnly.Count)
}
Write-Output ""

foreach ($k in $plans.Keys) {
    foreach ($rel in $plans[$k].New)     { Write-Output "  nouveau  : $k/$rel" }
    foreach ($rel in $plans[$k].Changed) { Write-Output "  modifie  : $k/$rel" }
}

# Une skill sk-* presente en local et absente du depot est une commande RETIREE
# (sk-do, sk-tdd, sk-full, sk-light, sk-nw, sk-fast, sk-spec) : elle continue
# d apparaitre dans le menu / et echoue en cours de run, car elle appelle des
# fichiers _shared/ disparus. On la nomme ; on ne la supprime pas.
$stale = @()
foreach ($rel in $plans["skills"].LocalOnly) {
    $top = ($rel -split "[\\/]")[0]
    if ($top -like "sk-*" -and $stale -notcontains $top) { $stale += $top }
}
if ($stale.Count -gt 0) {
    Write-Output ""
    Write-Output "PERIMEES — skills sk-* locales absentes du depot (a supprimer A LA MAIN) :"
    foreach ($s in $stale) { Write-Output "  $skillsDst\$s" }
}

if ($Check) { Write-Output ""; Write-Output "-Check : plan seul, rien ecrit."; exit 0 }

# --- Copie ------------------------------------------------------------------

Write-Output ""
foreach ($d in @($skillsDst, $agentsDst, $cmdsDst)) {
    if (-not (Test-Path $d)) { New-Item -ItemType Directory -Force $d | Out-Null }
}

# Jamais robocopy /MIR ni rsync --delete : ils effacent les locaux seuls.
Copy-Item -Recurse -Force (Join-Path $Source "skills\*") $skillsDst
Copy-Item -Recurse -Force (Join-Path $Source "agents\*") $agentsDst
Write-Output "copie : skills/ et agents/ -> $Target"

# --- Raccourcis /sk-* -------------------------------------------------------

# Cursor ne derive pas une commande d une skill : chaque /sk-<nom> a besoin
# d un fichier dans commands/. Ces fichiers sont GENERES, jamais edites a la
# main — ils portent le chemin resolu de CETTE machine, donc ils ne remontent
# pas dans le depot.
function Get-FrontMatter {
    param([string]$Path)

    $lines = Get-Content -LiteralPath $Path
    if ($lines.Count -eq 0 -or $lines[0].Trim() -ne "---") { return $null }

    $fm = @{}
    $key = $null
    for ($i = 1; $i -lt $lines.Count; $i++) {
        if ($lines[$i].Trim() -eq "---") { break }
        if ($lines[$i] -match '^([a-zA-Z-]+):\s*(.*)$') {
            $key = $Matches[1]
            $fm[$key] = $Matches[2].Trim().Trim('"').Trim("'")
        } elseif ($key -and $lines[$i] -match '^\s+\S') {
            $fm[$key] = ($fm[$key] + " " + $lines[$i].Trim()).Trim()
        }
    }
    return $fm
}

$hostPath = Join-Path $skillsDst "_shared\sk-host.md"
$made = 0

foreach ($dir in (Get-ChildItem -Directory $skillsDst | Where-Object { $_.Name -like "sk-*" })) {
    $skill = Join-Path $dir.FullName "SKILL.md"
    if (-not (Test-Path $skill)) { continue }

    # Une skill retiree du depot ne recoit pas de raccourci : la generer
    # ranimerait une commande qui echoue en cours de run.
    if (-not (Test-Path (Join-Path $Source "skills\$($dir.Name)\SKILL.md"))) { continue }

    $fm   = Get-FrontMatter $skill
    $name = if ($fm -and $fm["name"]) { $fm["name"] } else { $dir.Name }
    $desc = if ($fm -and $fm["description"]) { $fm["description"] } else { "" }
    $hint = if ($fm -and $fm["argument-hint"]) { $fm["argument-hint"] } else { "" }

    $body = @()
    $body += "---"
    $body += "name: $name"
    if ($desc) { $body += "description: $desc" }
    if ($hint) { $body += "argument-hint: $hint" }
    $body += "---"
    $body += ""
    $body += "# /$name"
    $body += ""
    $body += "Lis et execute INTEGRALEMENT la skill :"
    $body += ""
    $body += "    $skill"
    $body += ""
    $body += "Ne la resume pas, ne la survole pas : ses STOP, ses gates et ses"
    $body += "validations humaines font partie du contrat."
    $body += ""
    $body += "## Hote"
    $body += ""
    $body += "Tu tournes dans **Cursor**. Avant le premier appel d outil, lis la"
    $body += "table de correspondance de runtime et applique sa colonne Cursor :"
    $body += ""
    $body += "    $hostPath"
    $body += ""
    $body += "Elle donne les noms d outils, les slugs de modeles, les sous-agents,"
    $body += "le remplacant de la boucle Workflow, les worktrees, le navigateur et"
    $body += "la CLI non interactive. N invente aucun slug ni aucun nom d outil."
    $body += ""
    $body += "## Cible"
    $body += ""
    $body += "`$ARGUMENTS"
    $body += ""

    Set-Content -LiteralPath (Join-Path $cmdsDst "$name.md") -Value ($body -join "`n") -Encoding utf8NoBOM
    $made++
}

Write-Output "raccourcis : $made fichiers generes dans $cmdsDst"

# --- Trace ------------------------------------------------------------------

$version = if (Test-Path (Join-Path $Source "VERSION")) { (Get-Content (Join-Path $Source "VERSION") -Raw).Trim() } else { "inconnue" }
$commit  = try { (git -C $Source rev-parse --short HEAD 2>$null).Trim() } catch { "" }

@{
    version     = $version
    commit      = $commit
    source      = $Source
    installedAt = (Get-Date).ToUniversalTime().ToString("o")
    subtrees    = @("skills", "agents", "commands")
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $Target ".sk-kit-install.json") -Encoding utf8NoBOM

Write-Output ""
Write-Output "kit sk-* $version installe dans Cursor."
Write-Output "Redemarre Cursor : les skills et les commandes sont chargees au demarrage."
if ($stale.Count -gt 0) {
    Write-Output "Rien n a ete supprime. Les $($stale.Count) skills perimees listees plus haut restent au menu /."
}
