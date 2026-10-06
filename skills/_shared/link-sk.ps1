# link-sk.ps1 — partage .sk entre tous les worktrees d un depot, sans jamais le versionner.
#
# Pourquoi une jonction de DOSSIER et pas un lien de fichier : /sk-init et les
# editeurs REECRIVENT repos.json au lieu de le modifier en place. Un hardlink ou
# un symlink de fichier se casse silencieusement a la premiere reecriture et les
# worktrees divergent sans prevenir. Avec une jonction de dossier, peu importe la
# strategie d ecriture : tout atterrit dans le seul dossier reel.
#
# Idempotent. Relancer apres chaque `git worktree add`.
#
#   pwsh -File ~/.claude/skills/_shared/link-sk.ps1
#   pwsh -File ~/.claude/skills/_shared/link-sk.ps1 -RepoPath C:\chemin\vers\repo

# DANGER, verifie le 2026-09-07 : `git worktree remove --force` RECURSE a travers
# une jonction et detruit la CIBLE. Avant de retirer un worktree, retirer d abord
# la jonction :  -Unlink <chemin du worktree>   (ou `rmdir <wt>\.sk` en cmd, qui
# ne retire que le lien). Chaque execution rafraichit aussi une sauvegarde.

param(
    [string]$RepoPath = ".",
    [string]$Unlink = ""
)

$ErrorActionPreference = "Stop"

$commonDir = git -C $RepoPath rev-parse --path-format=absolute --git-common-dir 2>$null
if ($LASTEXITCODE -ne 0 -or -not $commonDir) {
    $here = (Resolve-Path $RepoPath -ErrorAction SilentlyContinue)
    Write-Output "Pas un depot git : $(if ($here) { $here } else { $RepoPath })"
    Write-Output "Lance le script depuis un worktree, ou passe le chemin :"
    Write-Output "  pwsh -File ~/.claude/skills/_shared/link-sk.ps1 -RepoPath <chemin du depot>"
    exit 1
}
$commonDir = $commonDir.Trim()
$mainRoot = Split-Path -Parent $commonDir
$slug     = Split-Path -Leaf $mainRoot
$poolBase = if ($env:SK_POOL_ROOT) { $env:SK_POOL_ROOT.Trim() } else { "C:\tmp\sk-pool" }
$src      = Join-Path (Join-Path $poolBase $slug) ".sk"

Write-Output "depot   : $mainRoot ($slug)"
Write-Output "source  : $src"

if (-not (Test-Path $src)) { New-Item -ItemType Directory -Force $src | Out-Null }

# -Unlink : retire la jonction d UN worktree sans toucher a la source, pour
# pouvoir ensuite faire `git worktree remove` sans detruire la cible.
if ($Unlink) {
    # TOUTE jonction du worktree, pas seulement .sk : node_modules pointe sur le
    # node_modules du depot principal dans la plupart des slots, et un
    # `git worktree remove --force` le supprimerait aussi.
    $found = 0
    foreach ($name in @(".sk", "specs", "node_modules")) {
        $p = Join-Path $Unlink $name
        if (-not (Test-Path $p)) { continue }
        $item = Get-Item $p
        if (-not $item.LinkType) { Write-Output "  reel, non touche      : $name"; continue }
        $target = $item.Target
        & cmd /c "rmdir `"$p`""      # rmdir retire le lien seul ; Remove-Item -Recurse recurserait
        if (Test-Path $p) { Write-Output "  ECHEC du deliement    : $name"; continue }
        $kept = Test-Path $target
        Write-Output "  jonction retiree      : $name -> $target (cible $(if ($kept) { 'intacte' } else { 'PERDUE' }))"
        $found++
    }
    if ($found -eq 0) { Write-Output "aucune jonction a delier dans $Unlink" }
    else { Write-Output "`ntu peux maintenant faire : git worktree remove --force $Unlink" }
    exit 0
}

# Sauvegarde rafraichie a chaque execution : seul filet contre un
# `git worktree remove` lance sans avoir delie d abord.
$bak = Join-Path (Split-Path -Parent $src) ".sk-backup"
if ((Get-ChildItem -Recurse -File $src -ErrorAction SilentlyContinue).Count -gt 0) {
    if (Test-Path $bak) { & cmd /c "rmdir /s /q `"$bak`"" }
    Copy-Item -Recurse -Force $src $bak
    Write-Output "sauvegarde : $bak"
}

# Premiere migration : un .sk REEL dans un worktree alimente la source, puis cede la place.
foreach ($wt in ((git -C $mainRoot worktree list --porcelain | Select-String '^worktree ') -replace '^worktree ','')) {
    $p = Join-Path $wt ".sk"
    if ((Test-Path $p) -and -not (Get-Item $p).LinkType) {
        Write-Output "migration depuis $p"
        Copy-Item -Recurse -Force "$p\*" $src -ErrorAction SilentlyContinue
    }
}

# .sk/ dans info/exclude : vit dans le common dir, donc partage par TOUS les
# worktrees, et jamais pousse (contrairement a .gitignore, qui est suivi).
$exclude = Join-Path $commonDir "info\exclude"
if (-not (Test-Path $exclude)) { New-Item -ItemType File -Force $exclude | Out-Null }
if (-not (Select-String -Path $exclude -SimpleMatch -Pattern ".sk/" -Quiet)) {
    Add-Content -Path $exclude -Value ".sk/"
    Write-Output "exclude : .sk/ ajoute"
} else {
    Write-Output "exclude : .sk/ deja present"
}

# Deux sources partagees, de natures differentes :
#   .sk    -> <POOL_BASE>\<slug>\.sk       (config lue + corpus d audit)
#   specs  -> <mainRoot>\specs             (trios ; la source EST le principal,
#            comme node_modules, pour ne pas deplacer des livrables hors du depot)
# node_modules est deja jonctionne par /sk-impl et audit-run.mjs : on ne le pose
# pas ici, mais -Unlink le traite, sinon `git worktree remove` le detruit.
$shared = [ordered]@{ ".sk" = $src; "specs" = (Join-Path $mainRoot "specs") }
foreach ($k in $shared.Keys) { if (-not (Test-Path $shared[$k])) { New-Item -ItemType Directory -Force $shared[$k] | Out-Null } }

$linked = 0; $already = 0; $skipped = 0
foreach ($wt in ((git -C $mainRoot worktree list --porcelain | Select-String '^worktree ') -replace '^worktree ','')) {
    if (-not (Test-Path $wt)) { Write-Output "  absent du disque : $wt"; $skipped++; continue }
    $isMain = (Resolve-Path $wt).Path -eq (Resolve-Path $mainRoot).Path
    foreach ($name in $shared.Keys) {
        $target = $shared[$name]
        # Ne jamais jonctionner une source sur elle-meme.
        if ($isMain -and (Resolve-Path $target -ErrorAction SilentlyContinue).Path -eq (Join-Path (Resolve-Path $wt).Path $name)) { continue }
        $p = Join-Path $wt $name
        if (Test-Path $p) {
            if ((Get-Item $p).LinkType) { $already++; continue }
            # Contenu deja recopie dans la source : on remplace par la jonction.
            Copy-Item -Recurse -Force "$p\*" $target -ErrorAction SilentlyContinue
            [System.IO.Directory]::Delete($p, $true)
            New-Item -ItemType Junction -Path $p -Target $target | Out-Null
            Write-Output "  remplace par une jonction : $name dans $(Split-Path -Leaf $wt)"
            $linked++
            continue
        }
        New-Item -ItemType Junction -Path $p -Target $target | Out-Null
        $linked++
    }
}

Write-Output "jonctions : $linked creees, $already deja en place, $skipped ignorees"
foreach ($k in $shared.Keys) {
    Write-Output ("  {0,-6} -> {1}  ({2} fichiers)" -f $k, $shared[$k], (Get-ChildItem -Recurse -File $shared[$k] -ErrorAction SilentlyContinue).Count)
}
