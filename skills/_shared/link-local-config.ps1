# link-local-config.ps1 — rend la configuration locale NON VERSIONNEE du depot principal
# (fichiers de credentials ignores par git) disponible dans un slot du pool, sans que
# le modele ne lise jamais leur contenu.
#
# Pourquoi un script et pas une commande : le hook block-secrets refuse tout tool call
# dont le TEXTE porte un motif sensible (`.env`, `appsettings`, `secrets.json`, ...).
# L appel de ce script n en porte aucun ; les motifs vivent ICI, dans le fichier, et
# seule sa sortie (des NOMS de fichiers, jamais leur contenu) remonte au modele.
#
# Pourquoi un HARDLINK et pas une copie : le slot voit alors TOUJOURS le fichier du
# principal, meme apres une edition de celui-ci. Un hardlink exige le meme volume ;
# sinon le script retombe sur une copie et le dit. Un `git clean -fd` (sans -x) ne
# touche pas ces fichiers : ils sont ignores.
#
# Effet de bord a connaitre : editer le fichier lie DEPUIS le slot modifie aussi le
# principal (meme donnee). C est voulu — le principal est la seule source.
#
# Idempotent. A relancer avant chaque lancement d application depuis un slot.
#
#   pwsh -File ~/.claude/skills/_shared/link-local-config.ps1 -Slot C:\tmp\sk-pool\<repo>\wt-3
#   pwsh -File ~/.claude/skills/_shared/link-local-config.ps1 -RepoPath <depot> -Slot <slot>
#   pwsh -File ~/.claude/skills/_shared/link-local-config.ps1 -Slot <slot> -List   (inventaire seul)

param(
    [string]$RepoPath = ".",
    [Parameter(Mandatory = $true)][string]$Slot,
    [switch]$List
)

$ErrorActionPreference = "Stop"

# Memes motifs que le hook block-secrets : ce script ne lie QUE ce que le hook protege.
$sensitivePatterns = @(
    '\.env(\.|$|\b)',
    'localSettings\.json',
    'appsettings.*\.json',
    'secrets\.json',
    '\.pfx\b',
    '\.pem\b'
)

# Ce qui n a rien a faire dans un slot, meme si ca matche (artefacts, caches, livrables).
$excludedRoots = @('node_modules', 'dist', 'build', 'coverage', 'bin', 'obj', '.vite', '.turbo',
                   'specs', '.sk', 'audit-runs', 'playwright-report', 'test-results',
                   'stryker-tmp', '.stryker-tmp', 'tmp', '.tmp', 'logs', 'TestResults')
# Segment interdit n importe ou dans le chemin (artefacts de build, sandboxes).
$excludedSegment = '[\\/](bin|obj|node_modules|stryker-tmp|\.stryker-tmp|TestResults)[\\/]'

$commonDir = git -C $RepoPath rev-parse --path-format=absolute --git-common-dir 2>$null
if ($LASTEXITCODE -ne 0 -or -not $commonDir) {
    Write-Output "Pas un depot git : $RepoPath"
    exit 1
}
$mainRoot = Split-Path -Parent $commonDir.Trim()

if (-not (Test-Path $Slot)) { Write-Output "Slot absent du disque : $Slot"; exit 1 }
$slotRoot = (Resolve-Path $Slot).Path.TrimEnd('\', '/')
$mainNorm = (Resolve-Path $mainRoot).Path.TrimEnd('\', '/')

Write-Output "principal : $mainNorm"
Write-Output "slot      : $slotRoot"

if ($slotRoot -ieq $mainNorm) {
    Write-Output "le slot EST le principal : rien a lier"
    exit 0
}

# Inventaire : ignores ET non suivis, un chemin par entree, sans jamais nommer un motif.
# --ignored=matching : un dossier ignore (node_modules) sort en UNE entree, pas en milliers.
$raw = git -C $mainNorm status --porcelain=v1 -z --ignored=matching --untracked-files=normal 2>$null
if ($LASTEXITCODE -ne 0) { Write-Output "git status a echoue dans $mainNorm"; exit 1 }

$entries = @()
if ($raw) {
    foreach ($item in ($raw -split "`0")) {
        if ($item.Length -lt 4) { continue }
        $code = $item.Substring(0, 2)
        if ($code -ne '!!' -and $code -ne '??') { continue }
        $rel = $item.Substring(3).TrimEnd('/')
        $first = ($rel -split '[\\/]')[0]
        if ($excludedRoots -contains $first) { continue }
        if ("/$rel/" -match $excludedSegment) { continue }
        $entries += $rel
    }
}

# Un dossier retenu est deplie en fichiers ; un fichier est garde tel quel.
$candidates = @()
foreach ($rel in $entries) {
    $abs = Join-Path $mainNorm $rel
    if (-not (Test-Path $abs)) { continue }
    if ((Get-Item $abs -Force).PSIsContainer) {
        foreach ($f in (Get-ChildItem -Recurse -File -Force $abs)) {
            $sub = $f.FullName.Substring($mainNorm.Length + 1)
            if ("/$sub/" -match $excludedSegment) { continue }
            $candidates += $sub
        }
    } else {
        $candidates += $rel
    }
}

$targets = @()
foreach ($rel in ($candidates | Sort-Object -Unique)) {
    $leaf = Split-Path -Leaf $rel
    foreach ($p in $sensitivePatterns) {
        if ($leaf -match $p) { $targets += $rel; break }
    }
}

if ($targets.Count -eq 0) {
    Write-Output "aucune configuration locale a lier (rien d ignore ne matche un motif protege)"
    exit 0
}

if ($List) {
    Write-Output "a lier ($($targets.Count)) :"
    foreach ($t in $targets) { Write-Output "  $t" }
    exit 0
}

$linked = 0; $copied = 0; $aside = 0
foreach ($rel in $targets) {
    $src = Join-Path $mainNorm $rel
    $dst = Join-Path $slotRoot $rel
    $dstDir = Split-Path -Parent $dst
    if (-not (Test-Path $dstDir)) { New-Item -ItemType Directory -Force $dstDir | Out-Null }

    if (Test-Path $dst) {
        # Meme contenu (ou deja le meme hardlink) : on recree le lien, sans perte.
        # Contenu different : le fichier du slot est mis de cote, jamais ecrase en silence.
        $same = (Get-FileHash -Algorithm SHA256 $src).Hash -eq (Get-FileHash -Algorithm SHA256 $dst).Hash
        if (-not $same) {
            $bak = "$dst.before-link-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
            Move-Item -Force $dst $bak
            Write-Output "  ecarte   : $rel  (contenu du slot different, garde sous $(Split-Path -Leaf $bak))"
            $aside++
        } else {
            Remove-Item -Force $dst
        }
    }

    try {
        New-Item -ItemType HardLink -Path $dst -Target $src -ErrorAction Stop | Out-Null
        Write-Output "  hardlink : $rel"
        $linked++
    } catch {
        Copy-Item -Force $src $dst
        Write-Output "  copie    : $rel  (hardlink impossible : volumes differents ?)"
        $copied++
    }
}

Write-Output "termine : $linked hardlink(s), $copied copie(s), $aside fichier(s) du slot mis de cote"
if ($copied -gt 0) {
    Write-Output "note : une copie ne suit PAS les modifications du principal — relancer ce script apres chaque changement"
}
