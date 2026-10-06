# sk-pool.ps1 — cycle de vie d un SLOT du pool de worktrees : trouver, prendre, marquer,
# liberer, reparer. Seule porte d ecriture de STATUS_FILE (<POOL_BASE>/<REPO_SLUG>/status.md).
#
# Source de verite = GIT (branche du worktree, proprete), status.md n est qu un relevé qui
# porte ce que git ignore : qui tient le slot (agent, session, terminal) et une note. Chaque
# action relit git avant d agir et refuse d ecrire un relevé qui contredit le disque.
#
#   pwsh -File sk-pool.ps1 -Action status  [-Repo <depot ou slot>]                 # les deux verites, cote a cote
#   pwsh -File sk-pool.ps1 -Action find    -Repo <depot> -Feature <slug|NNN>       # slot de reprise
#   pwsh -File sk-pool.ps1 -Action free    -Repo <depot>                           # premier slot libre (git ET relevé)
#   pwsh -File sk-pool.ps1 -Action claim   -Slot <slot> -Branch <b> [-Base <ref>] [-Note <txt>] [-Session <id>] [-Force]
#   pwsh -File sk-pool.ps1 -Action touch   -Slot <slot> [-Note <txt>]              # heartbeat : updated + note
#   pwsh -File sk-pool.ps1 -Action release -Slot <slot> [-Force] [-KeepBranch]
#   pwsh -File sk-pool.ps1 -Action repair  -Repo <depot> [-Apply]                  # reconcilie status.md avec git
#
# Codes de sortie : 0 ok ; 2 rien trouve (find/free) ; 3 refus (slot occupe, sale, plusieurs
# candidats) — relire la sortie, decider, relancer avec -Force seulement apres accord humain ;
# 1 erreur d usage.
#
# Lignes de STATUS_FILE (contrat sk-config.md) :
#   wt-2 | idle
#   wt-2 | <branche> | busy | agent CLAUDE | session <id> | terminal <id> | base <sha> | updated <iso> | <note>

param(
    [Parameter(Mandatory = $true)][ValidateSet('status', 'find', 'free', 'claim', 'touch', 'release', 'repair')]
    [string]$Action,
    [string]$Repo = "",
    [string]$Slot = "",
    [string]$Feature = "",
    [string]$Branch = "",
    [string]$Base = "",
    [string]$Note = "",
    [string]$Session = "",
    [string]$Agent = "CLAUDE",
    [switch]$Force,
    [switch]$KeepBranch,
    [switch]$Apply,
    [switch]$Json
)

$ErrorActionPreference = "Stop"
$SlotNamePattern = '^wt-(?:(audit|test)-)?(\d+)$'
# Une branche qui dit « ce slot travaille ». Tout le reste (defaut, detache) = libre pour git.
$WorkBranchPattern = '^(sk-impl-|sk-xs-|sk-audit-|review-|feature/|fix/|work/)'

function Normalize([string]$p) {
    if (-not $p) { return "" }
    try { $r = (Resolve-Path $p -ErrorAction Stop).Path } catch { $r = $p }
    return $r.TrimEnd('\', '/')
}

function Invoke-Git([string]$Root, [string[]]$GitArgs) {
    $out = & git -C $Root @GitArgs 2>&1
    $code = $LASTEXITCODE
    return @{ ok = ($code -eq 0); out = (($out | Out-String).Trim()); code = $code }
}

# --- Resolution des chemins (contrat sk-config.md) --------------------------------------

function Resolve-PoolBase {
    if ($env:SK_POOL_ROOT) { return $env:SK_POOL_ROOT.TrimEnd('\', '/') }
    if ($IsWindows -or $env:OS -eq 'Windows_NT') { return 'C:\tmp\sk-pool' }
    return (Join-Path $HOME '.cache/sk-pool')
}

# Depot principal d un chemin (depot ou worktree) : parent du git-common-dir.
function Resolve-MainRoot([string]$Path) {
    $r = Invoke-Git $Path @('rev-parse', '--path-format=absolute', '--git-common-dir')
    if (-not $r.ok -or -not $r.out) { return "" }
    return (Normalize (Split-Path -Parent $r.out))
}

function Resolve-DefaultBranch([string]$MainRoot) {
    $r = Invoke-Git $MainRoot @('symbolic-ref', '--short', 'refs/remotes/origin/HEAD')
    if ($r.ok -and $r.out) { return ($r.out -replace '^origin/', '') }
    foreach ($c in @('dev', 'main', 'master')) {
        $t = Invoke-Git $MainRoot @('rev-parse', '--verify', '--quiet', "refs/heads/$c")
        if ($t.ok) { return $c }
    }
    return 'dev'
}

# Reference de base la plus fraiche disponible : origin/<defaut> apres fetch, sinon <defaut> local.
function Resolve-BaseRef([hashtable]$Ctx) {
    $f = Invoke-Git $Ctx.main @('fetch', 'origin', $Ctx.default, '--quiet')
    if (-not $f.ok) { Write-Host ("  fetch impossible ({0}) : base locale" -f (($f.out -split "`r?`n")[0])) }
    foreach ($ref in @("origin/$($Ctx.default)", $Ctx.default)) {
        if ((Invoke-Git $Ctx.main @('rev-parse', '--verify', '--quiet', "$ref^{commit}")).ok) { return $ref }
    }
    return $Ctx.default
}

function Resolve-Context([string]$Path) {
    $start = if ($Path) { Normalize $Path } else { Normalize (Get-Location).Path }
    $main = Resolve-MainRoot $start
    if (-not $main) { Write-Output "pas un depot git : $start"; exit 1 }
    $slug = Split-Path -Leaf $main
    $poolRoot = Join-Path (Resolve-PoolBase) $slug
    return @{
        main = $main; slug = $slug; poolRoot = $poolRoot
        statusFile = (Join-Path $poolRoot 'status.md')
        default = (Resolve-DefaultBranch $main)
    }
}

# --- Lecture du relevé ------------------------------------------------------------------

function Read-Status([string]$File) {
    $lines = @()
    if (-not (Test-Path $File)) { return $lines }
    foreach ($raw in (Get-Content $File)) {
        if (-not $raw.Trim()) { continue }
        $fields = @($raw -split '\|' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
        if ($fields.Count -eq 0 -or $fields[0] -notmatch $SlotNamePattern) { continue }
        $e = @{ slot = $fields[0].ToLower(); busy = $false; task = $null; note = $null; agent = $null; session = $null; terminal = $null; base = $null; updated = $null; raw = $raw }
        foreach ($f in $fields[1..($fields.Count - 1)]) {
            $l = $f.ToLower()
            if ($l -eq 'busy') { $e.busy = $true; continue }
            if ($l -eq 'idle') { $e.busy = $false; continue }
            # Champ nomme `<cle> <valeur>` ; `continue` dans un switch PowerShell ne sortirait
            # pas du foreach, d ou le drapeau.
            $parts = $f -split '\s+', 2
            $named = $false
            if ($parts.Count -eq 2) {
                $key = $parts[0].ToLower()
                if ($key -in @('agent', 'session', 'terminal', 'base', 'updated')) { $e[$key] = $parts[1]; $named = $true }
            }
            if ($named) { continue }
            if ($null -eq $e.task) { $e.task = $f } elseif ($null -eq $e.note) { $e.note = $f }
        }
        $lines += $e
    }
    return $lines
}

function Format-Line([hashtable]$E) {
    if (-not $E.busy) { return "$($E.slot) | idle" }
    $parts = @($E.slot, $E.task, 'busy')
    if ($E.agent)    { $parts += "agent $($E.agent)" }
    if ($E.session)  { $parts += "session $($E.session)" }
    if ($E.terminal) { $parts += "terminal $($E.terminal)" }
    if ($E.base)     { $parts += "base $($E.base)" }
    if ($E.updated)  { $parts += "updated $($E.updated)" }
    if ($E.note)     { $parts += $E.note }
    return ($parts -join ' | ')
}

# Reecrit UNE ligne (ou l ajoute en fin), sans toucher aux autres ni a leur ordre.
function Write-StatusLine([string]$File, [hashtable]$E) {
    $dir = Split-Path -Parent $File
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }
    $existing = @()
    if (Test-Path $File) { $existing = @(Get-Content $File) }
    $done = $false
    $out = @()
    foreach ($raw in $existing) {
        $name = (($raw -split '\|')[0]).Trim().ToLower()
        if ($name -eq $E.slot) { $out += (Format-Line $E); $done = $true } else { $out += $raw }
    }
    if (-not $done) { $out += (Format-Line $E) }
    Set-Content -Path $File -Value ($out -join "`n") -Encoding utf8 -NoNewline
}

function Remove-StatusLine([string]$File, [string]$SlotName) {
    if (-not (Test-Path $File)) { return }
    $out = @(Get-Content $File | Where-Object { ((($_ -split '\|')[0]).Trim().ToLower()) -ne $SlotName.ToLower() })
    Set-Content -Path $File -Value ($out -join "`n") -Encoding utf8 -NoNewline
}

function Now-Iso { return (Get-Date).ToString('yyyy-MM-ddTHH:mm:sszzz') }

# --- Lecture de git, slot par slot -------------------------------------------------------

function Read-GitSlot([string]$Path, [string]$Default) {
    $g = @{ path = $Path; exists = (Test-Path (Join-Path $Path '.git')); branch = ""; detached = $false; dirty = $false; head = ""; lastCommit = ""; occupied = $false }
    if (-not $g.exists) { return $g }
    $b = Invoke-Git $Path @('branch', '--show-current')
    $g.branch = $b.out
    $g.detached = (-not $g.branch)
    $h = Invoke-Git $Path @('rev-parse', '--short', 'HEAD'); $g.head = $h.out
    $p = Invoke-Git $Path @('status', '--porcelain'); $g.dirty = ($p.out.Length -gt 0)
    $d = Invoke-Git $Path @('log', '-1', '--format=%cI'); $g.lastCommit = $d.out
    # Occupe pour git = sur une branche qui n est ni le defaut ni detachee.
    $g.occupied = ($g.branch -and $g.branch -ne $Default)
    return $g
}

function Get-SlotDirs([string]$PoolRoot) {
    if (-not (Test-Path $PoolRoot)) { return @() }
    return @(Get-ChildItem -Path $PoolRoot -Directory | Where-Object { $_.Name -match $SlotNamePattern } | Sort-Object Name | ForEach-Object { $_.FullName })
}

# Vue fusionnee : un enregistrement par slot connu (disque OU relevé).
function Read-Pool([hashtable]$Ctx) {
    $status = Read-Status $Ctx.statusFile
    $byName = @{}
    foreach ($e in $status) { $byName[$e.slot] = $e }
    $names = New-Object System.Collections.Generic.List[string]
    foreach ($d in (Get-SlotDirs $Ctx.poolRoot)) { $names.Add((Split-Path -Leaf $d).ToLower()) }
    foreach ($k in $byName.Keys) { if (-not $names.Contains($k)) { $names.Add($k) } }
    $rows = @()
    foreach ($n in ($names | Sort-Object)) {
        $path = Join-Path $Ctx.poolRoot $n
        $g = Read-GitSlot $path $Ctx.default
        $s = $byName[$n]
        $verdict = 'ok'
        if (-not $g.exists) { $verdict = if ($s -and $s.busy) { 'INTROUVABLE' } else { 'absent' } }
        elseif ($s -and $s.busy -and -not $g.occupied) { $verdict = if ($g.dirty) { 'A-LIBERER (sale)' } else { 'A-LIBERER' } }
        elseif ((-not $s -or -not $s.busy) -and $g.occupied) { $verdict = 'HORS-RELEVE' }
        elseif ($s -and $s.busy -and $g.occupied -and $s.task -and $s.task -ne $g.branch) { $verdict = 'BRANCHE-DIFFERENTE' }
        $rows += @{ slot = $n; path = $path; git = $g; status = $s; verdict = $verdict
                    free = ($g.exists -and -not $g.occupied -and (-not $s -or -not $s.busy)) }
    }
    return $rows
}

function Show-Pool([hashtable]$Ctx, [array]$Rows) {
    Write-Output ("pool {0}  (depot {1}, defaut {2})" -f $Ctx.poolRoot, $Ctx.main, $Ctx.default)
    Write-Output ("{0,-11} {1,-8} {2,-52} {3,-5} {4,-8} {5,-20} {6}" -f 'slot', 'releve', 'branche git', 'sale', 'agent', 'session', 'verdict')
    foreach ($r in $Rows) {
        $rel = if (-not $r.status) { '-' } elseif ($r.status.busy) { 'busy' } else { 'idle' }
        $br = if (-not $r.git.exists) { '(dossier absent)' } elseif ($r.git.detached) { "(detache $($r.git.head))" } else { $r.git.branch }
        $dirty = if ($r.git.dirty) { 'oui' } else { '' }
        $ag = if ($r.status) { $r.status.agent } else { '' }
        $se = if ($r.status) { $r.status.session } else { '' }
        Write-Output ("{0,-11} {1,-8} {2,-52} {3,-5} {4,-8} {5,-20} {6}" -f $r.slot, $rel, $br, $dirty, $ag, $se, $r.verdict)
    }
}

# Session courante : argument, puis variable posee par la fleet, puis transcript le plus
# recent du dossier principal (heuristique : la session qui claim est celle qui tourne).
function Resolve-Session([string]$Given, [string]$MainRoot) {
    if ($Given -and $Given -ne 'auto') { return $Given }
    if ($env:FLEETVIEW_SESSION_ID) { return $env:FLEETVIEW_SESSION_ID }
    if ($env:CLAUDE_SESSION_ID) { return $env:CLAUDE_SESSION_ID }
    try {
        $enc = ($MainRoot -replace '[^a-zA-Z0-9]', '-')
        $dir = Join-Path $HOME ".claude\projects\$enc"
        if (Test-Path $dir) {
            $f = Get-ChildItem -Path $dir -Filter '*.jsonl' -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
            if ($f -and ((Get-Date) - $f.LastWriteTime).TotalMinutes -lt 10) { return $f.BaseName }
        }
    } catch {}
    return ""
}

# Serveurs de dev du slot : arretes par sk-runtime.ps1 (kill par port, jamais par PID herite).
function Stop-SlotServers([string]$SlotPath) {
    $rt = Join-Path $PSScriptRoot 'sk-runtime.ps1'
    if (-not (Test-Path $rt)) { return }
    # sk-runtime arrete les serveurs par Get-NetTCPConnection, qui n existe que sous Windows : ailleurs
    # il imprimait une erreur a chaque claim / release.
    if (-not $IsWindows) { return }
    try { & pwsh -NoProfile -File $rt -Action stop -Slot $SlotPath 2>&1 | Where-Object { $_ -notmatch '^aucun serveur' } | ForEach-Object { Write-Output "  runtime: $_" } } catch {}
}

function Resolve-SlotPath([string]$S) {
    if (-not $S) { Write-Output "-Slot requis"; exit 1 }
    $p = Normalize $S
    if (-not (Test-Path (Join-Path $p '.git'))) { Write-Output "pas un worktree : $p"; exit 1 }
    return $p
}

# =========================================================================================

switch ($Action) {

    'status' {
        $ctx = Resolve-Context $Repo
        $rows = Read-Pool $ctx
        if ($Json) { $rows | ForEach-Object { [pscustomobject]@{ slot = $_.slot; path = $_.path; branch = $_.git.branch; detached = $_.git.detached; dirty = $_.git.dirty; declaredBusy = ($_.status -and $_.status.busy); task = $(if ($_.status) { $_.status.task } else { $null }); verdict = $_.verdict; free = $_.free } } | ConvertTo-Json -Depth 3; exit 0 }
        Show-Pool $ctx $rows
        exit 0
    }

    'find' {
        # Reprise : un slot dont la BRANCHE git (ou la tache du relevé) porte la feature.
        if (-not $Feature) { Write-Output "-Feature requis (slug ou numero NNN)"; exit 1 }
        $ctx = Resolve-Context $Repo
        $f = $Feature.Trim()
        $nnn = if ($f -match '^(\d{3})(-|$)') { $Matches[1] } else { "" }
        $slugCore = ($f -replace '^sk-(impl|xs)-', '' -replace '^feature/', '')
        $hits = @()
        foreach ($r in (Read-Pool $ctx)) {
            if (-not $r.git.exists) { continue }
            $cands = @($r.git.branch); if ($r.status -and $r.status.task) { $cands += $r.status.task }
            $match = $false
            foreach ($c in $cands) {
                if (-not $c) { continue }
                $core = ($c -replace '^sk-(impl|xs|audit)-', '' -replace '^feature/', '' -replace '^review-', '')
                if ($core -eq $slugCore -or $core -like "$slugCore-*" -or $slugCore -like "$core-*") { $match = $true }
                elseif ($nnn -and $core -match "^$nnn(-|$)") { $match = $true }
            }
            if ($match) { $hits += $r }
        }
        if ($hits.Count -eq 0) { Write-Output "AUCUN slot ne porte '$f' dans $($ctx.poolRoot)"; exit 2 }
        foreach ($h in $hits) {
            $src = if ($h.git.branch) { "branche $($h.git.branch)" } else { "releve seul (git detache $($h.git.head))" }
            $dirty = if ($h.git.dirty) { " | SALE" } else { "" }
            Write-Output ("REPRISE {0} | {1} | verdict {2}{3}" -f $h.path, $src, $h.verdict, $dirty)
        }
        if ($hits.Count -gt 1) { Write-Output "PLUSIEURS candidats : trancher (AskUserQuestion), ne pas deviner."; exit 3 }
        exit 0
    }

    'free' {
        $ctx = Resolve-Context $Repo
        $rows = Read-Pool $ctx
        $work = @($rows | Where-Object { $_.slot -match '^wt-\d+$' })
        $free = @($work | Where-Object { $_.free -and -not $_.git.dirty })
        $freeDirty = @($work | Where-Object { $_.free -and $_.git.dirty })
        if ($free.Count -gt 0) { Write-Output ("LIBRE {0}" -f $free[0].path); exit 0 }
        if ($freeDirty.Count -gt 0) { Write-Output ("LIBRE-SALE {0} (porcelain non vide : AskUserQuestion avant reset)" -f $freeDirty[0].path); exit 0 }
        Write-Output "AUCUN slot de travail libre :"
        Show-Pool $ctx $work
        exit 2
    }

    'claim' {
        $slot = Resolve-SlotPath $Slot
        if (-not $Branch) { Write-Output "-Branch requis"; exit 1 }
        $ctx = Resolve-Context $slot
        $name = (Split-Path -Leaf $slot).ToLower()
        $g = Read-GitSlot $slot $ctx.default
        $st = Read-Status $ctx.statusFile | Where-Object { $_.slot -eq $name } | Select-Object -First 1
        $sessionId = Resolve-Session $Session $ctx.main
        $terminalId = $env:FLEETVIEW_TERMINAL_ID

        if ($g.branch -eq $Branch) {
            # Reprise : rien de destructif, on ne fait que reecrire le relevé.
            # Une reprise sans session resolue garde celle du releve : la reecrire a vide faisait
            # perdre a Claude Fleet la session a rouvrir (banc, claim de reprise sans -Session).
            if (-not $sessionId -and $st) { $sessionId = $st.session }
            if (-not $terminalId -and $st) { $terminalId = $st.terminal }
            $e = @{ slot = $name; busy = $true; task = $Branch; agent = $Agent; session = $sessionId; terminal = $terminalId
                    base = $(if ($st -and $st.base) { $st.base } else { $null }); updated = (Now-Iso); note = $(if ($Note) { $Note } elseif ($st) { $st.note } else { $null }) }
            Write-StatusLine $ctx.statusFile $e
            Write-Output ("REPRISE {0} deja sur {1} (HEAD {2}{3}) — releve reecrit, rien touche" -f $slot, $Branch, $g.head, $(if ($g.dirty) { ', SALE' } else { '' }))
            exit 0
        }
        if ($g.occupied -and -not $Force) {
            Write-Output ("REFUS {0} : git est sur {1} (autre chantier). -Force pour l ecraser apres accord humain." -f $slot, $g.branch); exit 3
        }
        if ($st -and $st.busy -and -not $Force) {
            Write-Output ("REFUS {0} : releve busy ({1}, agent {2}, session {3}) alors que git est libre. Lancer 'release' d abord, ou -Force." -f $slot, $st.task, $st.agent, $st.session); exit 3
        }
        if ($g.dirty -and -not $Force) {
            Write-Output ("REFUS {0} : porcelain non vide sur un slot libre. Verifier (git -C {0} status), puis -Force pour reset --hard + clean -fd." -f $slot); exit 3
        }
        Stop-SlotServers $slot
        if (-not $Base) { $Base = Resolve-BaseRef $ctx }
        $co = Invoke-Git $slot @('checkout', '-B', $Branch, $Base)
        if (-not $co.ok) { Write-Output "ECHEC checkout -B ${Branch} ${Base} : $($co.out)"; exit 1 }
        Invoke-Git $slot @('reset', '--hard') | Out-Null
        Invoke-Git $slot @('clean', '-fd') | Out-Null
        $baseSha = (Invoke-Git $slot @('rev-parse', '--short', 'HEAD')).out
        $e = @{ slot = $name; busy = $true; task = $Branch; agent = $Agent; session = $sessionId; terminal = $terminalId; base = $baseSha; updated = (Now-Iso); note = $(if ($Note) { $Note } else { $null }) }
        Write-StatusLine $ctx.statusFile $e
        # SHA de base hors worktree (contrat sk-config.md), survit aux clean.
        try {
            $bsDir = Join-Path $ctx.poolRoot 'base-sha'; New-Item -ItemType Directory -Force $bsDir | Out-Null
            Set-Content -Path (Join-Path $bsDir (($Branch -replace '[\\/:]', '_') + '.txt')) -Value $baseSha -NoNewline
        } catch {}
        Write-Output ("CLAIM {0} | {1} | base {2} ({3}) | session {4} | terminal {5}" -f $slot, $Branch, $baseSha, $Base, $(if ($sessionId) { $sessionId } else { '-' }), $(if ($terminalId) { $terminalId } else { '-' }))
        exit 0
    }

    'touch' {
        $slot = Resolve-SlotPath $Slot
        $ctx = Resolve-Context $slot
        $name = (Split-Path -Leaf $slot).ToLower()
        $g = Read-GitSlot $slot $ctx.default
        $st = Read-Status $ctx.statusFile | Where-Object { $_.slot -eq $name } | Select-Object -First 1
        if (-not $st -or -not $st.busy) {
            if (-not $g.occupied) { Write-Output "RIEN a marquer : $slot est libre (git et releve)"; exit 0 }
            $st = @{ slot = $name; busy = $true; task = $g.branch; agent = $Agent; session = (Resolve-Session $Session $ctx.main); terminal = $env:FLEETVIEW_TERMINAL_ID; base = $null; updated = $null; note = $null }
        }
        $st.busy = $true
        if ($g.branch) { $st.task = $g.branch }
        if ($Note) { $st.note = $Note }
        if ($Session) { $st.session = (Resolve-Session $Session $ctx.main) }
        $st.updated = (Now-Iso)
        Write-StatusLine $ctx.statusFile $st
        Write-Output ("TOUCH {0} | {1} | updated {2}{3}" -f $slot, $st.task, $st.updated, $(if ($st.note) { " | $($st.note)" } else { '' }))
        exit 0
    }

    'release' {
        $slot = Resolve-SlotPath $Slot
        $ctx = Resolve-Context $slot
        $name = (Split-Path -Leaf $slot).ToLower()
        $g = Read-GitSlot $slot $ctx.default
        Stop-SlotServers $slot

        # 1. Rien ne se perd : un slot sale part en stash nomme, jamais en reset.
        if ($g.dirty) {
            $label = "sk-release $name $(if ($g.branch) { $g.branch } else { $g.head }) $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
            $s = Invoke-Git $slot @('stash', 'push', '--include-untracked', '-m', $label)
            if ($s.ok) { Write-Output "  stash : $label" } else { Write-Output "  stash impossible : $($s.out)"; if (-not $Force) { Write-Output "REFUS release : slot sale et stash impossible. -Force pour reset --hard."; exit 3 }; Invoke-Git $slot @('reset', '--hard') | Out-Null; Invoke-Git $slot @('clean', '-fd') | Out-Null }
        }
        # 2. Detacher sur la base fraiche : `checkout <defaut>` echouerait des que la branche
        #    par defaut est extraite ailleurs (depot principal, autre slot).
        $target = Resolve-BaseRef $ctx
        $co = Invoke-Git $slot @('checkout', '--detach', $target)
        if (-not $co.ok) { Write-Output "ECHEC checkout --detach : $($co.out)"; exit 1 }
        # 3. Branches de travail. Une branche ne part que si son contenu est ailleurs : sur
        #    origin, ou dans la branche de publication qui la porte.
        $deleted = @(); $kept = @()
        if ($g.branch -and -not $KeepBranch) {
            # Le coeur du nom, commun a la branche de travail (sk-impl-<core>) et a sa branche
            # de publication (feature/<core>). Le slot peut porter l une ou l autre : apres une
            # publication reussie, c est la seconde qui est extraite.
            $core = ""
            if ($g.branch -match '^sk-(?:impl|xs)-(.+)$') { $core = $Matches[1] }
            elseif ($g.branch -match '^feature/(?:xs-)?(.+)$') { $core = $Matches[1] }
            $cands = @($g.branch)
            if ($core) {
                $names = @("sk-impl-$core", "sk-xs-$core", "feature/$core", "feature/xs-$core") | ForEach-Object { "refs/heads/$_" }
                $cands += ((Invoke-Git $ctx.main (@('for-each-ref', '--format=%(refname:short)') + $names)).out -split "`r?`n" | Where-Object { $_ })
            }

            # Le travail a-t-il ete publie ? Une branche de publication poussee cree
            # `refs/remotes/origin/feature/<core>`. Un merge --squash ne laissant pas la branche
            # de travail ancetre de quoi que ce soit, c est le SEUL indice qui dit qu elle est
            # devenue inutile — sans lui, chaque run publie laisserait sa branche derriere lui.
            $published = $false
            if ($core) {
                foreach ($remote in @("refs/remotes/origin/feature/$core", "refs/remotes/origin/feature/xs-$core")) {
                    if ((Invoke-Git $ctx.main @('rev-parse', '--verify', '--quiet', $remote)).ok) { $published = $true }
                }
            }

            foreach ($b in ($cands | Select-Object -Unique)) {
                $upstream = (Invoke-Git $ctx.main @('for-each-ref', '--format=%(upstream:short)', "refs/heads/$b")).out
                $onOrigin = $false
                if ($upstream) { $onOrigin = (Invoke-Git $ctx.main @('merge-base', '--is-ancestor', $b, $upstream)).ok }
                if (-not $onOrigin) { $onOrigin = (Invoke-Git $ctx.main @('merge-base', '--is-ancestor', $b, $target)).ok }
                # Une branche de review n est qu un pointeur sur la tete d une PR : toujours jetable.
                $reason = ""
                if ($onOrigin) { $reason = "sur origin" }
                elseif ($b -match '^review-') { $reason = "pointeur de PR" }
                elseif ($published -and $b -match '^sk-(impl|xs)-') { $reason = "publiee en squash sur feature/$core" }
                elseif ($Force) { $reason = "-Force" }
                if ($reason) {
                    $d = Invoke-Git $ctx.main @('branch', '-D', $b)
                    if ($d.ok) { $deleted += "$b ($reason)" } else { $kept += "$b (echec : $($d.out))" }
                } else { $kept += "$b (contenu nulle part ailleurs : conservee)" }
            }
        }
        # 4. Relevé : ligne idle nue. Puis prune des worktrees fantomes.
        Write-StatusLine $ctx.statusFile @{ slot = $name; busy = $false }
        Invoke-Git $ctx.main @('worktree', 'prune') | Out-Null
        Write-Output ("RELEASE {0} | detache sur {1} | branches supprimees : {2} | conservees : {3}" -f $slot, $target, $(if ($deleted) { $deleted -join ', ' } else { 'aucune' }), $(if ($kept) { $kept -join ', ' } else { 'aucune' }))
        exit 0
    }

    'repair' {
        # Reconcilie status.md avec le disque. Dry-run sans -Apply.
        $ctx = Resolve-Context $Repo
        $rows = Read-Pool $ctx
        $changes = @()
        foreach ($r in $rows) {
            switch -Regex ($r.verdict) {
                '^INTROUVABLE|^absent' { if ($r.status) { $changes += @{ what = "supprimer la ligne $($r.slot) (dossier absent)"; do = { Remove-StatusLine $ctx.statusFile $r.slot }.GetNewClosure() } } }
                '^A-LIBERER' { $changes += @{ what = "$($r.slot) -> idle (git libre : $(if ($r.git.detached) { 'detache' } else { $r.git.branch })$(if ($r.git.dirty) { ', SALE — stash a faire via release' } else { '' }))"; do = { Write-StatusLine $ctx.statusFile @{ slot = $r.slot; busy = $false } }.GetNewClosure() } }
                '^HORS-RELEVE' { $changes += @{ what = "$($r.slot) -> busy $($r.git.branch) (git occupe, releve muet)"; do = { Write-StatusLine $ctx.statusFile @{ slot = $r.slot; busy = $true; task = $r.git.branch; agent = $null; session = $null; terminal = $null; base = $null; updated = $r.git.lastCommit; note = 'repris par repair' } }.GetNewClosure() } }
                '^BRANCHE-DIFFERENTE' { $changes += @{ what = "$($r.slot) : tache '$($r.status.task)' -> branche git '$($r.git.branch)'"; do = { $e = $r.status; $e.task = $r.git.branch; $e.updated = (Now-Iso); Write-StatusLine $ctx.statusFile $e }.GetNewClosure() } }
            }
            if ($r.git.exists -and -not $r.status) {
                $changes += @{ what = "ajouter la ligne $($r.slot) (dossier present, releve muet)"; do = { Write-StatusLine $ctx.statusFile @{ slot = $r.slot; busy = $r.git.occupied; task = $r.git.branch; updated = $r.git.lastCommit } }.GetNewClosure() }
            }
        }
        Show-Pool $ctx $rows
        Write-Output ""
        if ($changes.Count -eq 0) { Write-Output "RIEN a reparer : releve et git concordent."; exit 0 }
        foreach ($c in $changes) { Write-Output ("{0} {1}" -f $(if ($Apply) { 'FAIT   ' } else { 'A FAIRE' }), $c.what); if ($Apply) { & $c.do } }
        if (-not $Apply) { Write-Output ""; Write-Output "Dry-run. Relancer avec -Apply pour ecrire. Un slot A-LIBERER SALE se libere proprement par 'release' (stash nomme)." }
        exit 0
    }
}
