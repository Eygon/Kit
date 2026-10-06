# sk-runtime.ps1 — demarre, inspecte et arrete les serveurs de dev (front Vite, back .NET)
# d un SLOT du pool, sans jamais confondre un slot avec le depot principal.
#
# Chaque slot a SES ports, derives de son nom de dossier : front 5183 + N, back 5085 + N
# (wt-1..4 -> N = 1..4 ; le principal et tout autre dossier -> N = 0). Le front d un slot
# vise le back du slot qui porte la MEME BRANCHE dans le pool backend (sinon BACK_ROOT).
# Aucun port n est devine : -Port et -ApiPort ne servent qu a surcharger la table.
#
# Source de verite = les ports qui ecoutent, pas un registre de PID : pour chaque port,
# le processus qui ecoute est remonte a sa RACINE servie (le worktree) via sa ligne de
# commande ou son executable. Un kill n est jamais fait sur un PID herite : toujours
# sur le processus qui ecoute le port, apres verification de la racine qu il sert.
#
# Journaux : <parent du slot>\<slot>-dev.log et <slot>-api.log (convention du pool).
#
#   pwsh -File sk-runtime.ps1 -Action ports       [-Slot <slot front>]
#   pwsh -File sk-runtime.ps1 -Action status
#   pwsh -File sk-runtime.ps1 -Action up          -Slot <slot front> [-Force]
#   pwsh -File sk-runtime.ps1 -Action start-front -Slot <slot front> [-Port N] [-ApiPort N] [-Force]
#   pwsh -File sk-runtime.ps1 -Action start-back  -Slot <slot back>  [-Port N] [-Force]
#   pwsh -File sk-runtime.ps1 -Action stop        -Slot <slot>
#
# Codes de sortie : 0 ok / deja en route ; 3 CONFLIT (le port sert une AUTRE racine,
# relancer avec -Force apres accord humain) ; 4 timeout (le journal est affiche) ;
# 1 erreur d usage.

param(
    [Parameter(Mandatory = $true)][ValidateSet('ports', 'status', 'up', 'start-front', 'start-back', 'stop')]
    [string]$Action,
    [string]$Slot = "",
    [int]$Port = 0,
    [int]$ApiPort = 0,
    [string]$LogDir = "",
    [switch]$Force,
    [int]$TimeoutSec = 0
)

$ErrorActionPreference = "Stop"

# Table des ports. Doit rester alignee avec vite.config.mts du front (meme formule, filet
# pour un `yarn dev` lance a la main) et avec la liste CORS de developpement du backend.
$slotOffsets    = @{ "wt-1" = 1; "wt-2" = 2; "wt-3" = 3; "wt-4" = 4 }
$frontBasePort  = 5183
$backBasePort   = 5085

# Profils par DEPOT, cle = nom de dossier du depot principal. Un depot absent de la table
# suit les bases par defaut ci-dessus. `backFixed` = le backend n est pas un `dotnet run`
# du pool mais un service deja en ecoute sur un port fixe (IIS / http.sys) : le script ne
# le demarre jamais et ne lui attribue pas de slot, il se contente de le viser.
$repoProfiles = @{
    "Extranet_Client_v3" = @{ frontBase = 5173; backFixed = 9898 }
}

$scanPorts = @()
foreach ($base in (@($frontBasePort) + ($repoProfiles.Values | ForEach-Object { $_.frontBase } | Where-Object { $_ }))) {
    $scanPorts += (0..4 | ForEach-Object { $base + $_ })
}
$scanPorts += (0..4 | ForEach-Object { $backBasePort + $_ })
$scanPorts += ($repoProfiles.Values | ForEach-Object { $_.backFixed } | Where-Object { $_ })
$scanPorts = @($scanPorts | Sort-Object -Unique)

function Normalize([string]$p) {
    if (-not $p) { return "" }
    try { $r = (Resolve-Path $p -ErrorAction Stop).Path } catch { $r = $p }
    return $r.TrimEnd('\', '/')
}

function Get-SlotOffset([string]$Root) {
    $o = $slotOffsets[(Split-Path -Leaf $Root)]
    if ($null -eq $o) { return 0 }
    return $o
}
# Profil du depot auquel appartient une racine (slot ou principal). Vide hors table.
function Get-RepoProfile([string]$Root) {
    $main = Resolve-MainRoot $Root
    if (-not $main) { $main = $Root }
    return $repoProfiles[(Split-Path -Leaf $main)]
}
function Get-FrontPort([string]$Root) {
    $p = Get-RepoProfile $Root
    $base = if ($p -and $p.frontBase) { $p.frontBase } else { $frontBasePort }
    return $base + (Get-SlotOffset $Root)
}
function Get-BackPort([string]$Root)  { return $backBasePort  + (Get-SlotOffset $Root) }

function Get-Branch([string]$Root) {
    try { return ((git -C $Root branch --show-current 2>$null) | Out-String).Trim() } catch { return "" }
}

# Depot principal d un worktree : parent du git-common-dir (jamais --show-toplevel,
# qui rend le slot lui-meme). Regle de sk-config.md.
function Resolve-MainRoot([string]$Root) {
    try {
        $common = ((git -C $Root rev-parse --path-format=absolute --git-common-dir 2>$null) | Out-String).Trim()
        if ($common) { return (Normalize (Split-Path -Parent $common)) }
    } catch {}
    return ""
}

# BACK_ROOT = cle `backend` de <MAIN_ROOT>/.sk/repos.json (contrat sk-repos.md). Vide si absent.
function Resolve-BackRoot([string]$MainRoot) {
    $f = Join-Path $MainRoot ".sk\repos.json"
    if (-not (Test-Path $f)) { return "" }
    try {
        $j = Get-Content $f -Raw | ConvertFrom-Json
        if ($j.backend) { return (Normalize ([string]$j.backend)) }
    } catch {}
    return ""
}

# Le slot back apparie a un slot front est celui dont la branche est IDENTIQUE, dans le
# pool du backend. Les slots sont attribues independamment dans chaque pool : front wt-2
# et back wt-2 portent rarement la meme feature, l index ne vaut rien ici.
function Resolve-BackSlot([string]$BackRoot, [string]$Branch) {
    if (-not $BackRoot -or -not $Branch) { return "" }
    $current = ""
    foreach ($line in (git -C $BackRoot worktree list --porcelain 2>$null)) {
        if ($line.StartsWith("worktree ")) { $current = $line.Substring(9) }
        elseif ($line -eq "branch refs/heads/$Branch") { return (Normalize $current) }
    }
    return ""
}

# Racine servie par un processus : la partie du chemin AVANT node_modules (node/vite),
# ou avant <Projet>\bin\ (executable .NET). Vide si inconnue.
function Get-ServedRoot([int]$ProcessId) {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction SilentlyContinue
    if (-not $proc) { return @{ name = "?"; root = ""; cmd = "" } }
    $cmd = [string]$proc.CommandLine
    $exe = [string]$proc.ExecutablePath
    $root = ""
    # Ligne type : "C:\...\node.exe" "C:\tmp\sk-pool\<repo>\wt-3\node_modules\vite\bin\vite.js" --port ...
    # [^"]*? empeche de remonter jusqu au premier argument (l executable node).
    if ($cmd -match '([A-Za-z]:[^"]*?)[\\/]node_modules[\\/]') { $root = $Matches[1] }
    elseif ($exe -match '^(.*?)[\\/][^\\/]+[\\/]bin[\\/]') { $root = $Matches[1] }
    elseif ($cmd -match '--project\s+"?([^"\s]+)') { $root = Split-Path -Parent (Split-Path -Parent $Matches[1]) }
    return @{ name = $proc.Name; root = (Normalize $root); cmd = $cmd }
}

function Get-Listener([int]$P) {
    $c = Get-NetTCPConnection -LocalPort $P -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $c) { return $null }
    $info = Get-ServedRoot $c.OwningProcess
    return @{ port = $P; pid = $c.OwningProcess; name = $info.name; root = $info.root; cmd = $info.cmd }
}

function Show-Status([int[]]$Ports) {
    $any = $false
    foreach ($p in $Ports) {
        $l = Get-Listener $p
        if (-not $l) { continue }
        $any = $true
        Write-Output ("port {0} | pid {1} | {2} | root {3}" -f $l.port, $l.pid, $l.name, ($(if ($l.root) { $l.root } else { "?" })))
    }
    if (-not $any) { Write-Output "aucun serveur sur $($Ports -join ', ')" }
}

# Tue l arbre du processus qui ecoute, puis les parents/orphelins (cmd, yarn, node,
# dotnet) dont la ligne de commande cite la MEME racine. Jamais un autre.
function Stop-ServedRoot([hashtable]$Listener, [string]$Root) {
    & taskkill /PID $Listener.pid /T /F 2>$null | Out-Null
    Start-Sleep -Milliseconds 500
    if ($Root) {
        $esc = [regex]::Escape($Root)
        Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match '^(node|cmd|dotnet|yarn)(\.exe)?$' -and $_.CommandLine -and $_.CommandLine -match $esc } |
            ForEach-Object { & taskkill /PID $_.ProcessId /T /F 2>$null | Out-Null }
    }
    Write-Host ("arrete : port {0} (pid {1}, root {2})" -f $Listener.port, $Listener.pid, $(if ($Root) { $Root } else { "?" }))
}

function Wait-Ready([int]$P, [string]$Root, [int]$Seconds, [string]$Log) {
    $deadline = (Get-Date).AddSeconds($Seconds)
    while ((Get-Date) -lt $deadline) {
        $l = Get-Listener $P
        if ($l -and ($l.root -ieq $Root -or -not $l.root)) { return $l }
        Start-Sleep -Seconds 2
    }
    Write-Output "TIMEOUT apres ${Seconds}s — fin du journal $Log :"
    if (Test-Path $Log) { Get-Content $Log -Tail 30 | ForEach-Object { Write-Output "  $_" } }
    exit 4
}

function Resolve-LogDir([string]$SlotPath) {
    if ($LogDir) { return $LogDir }
    return (Split-Path -Parent $SlotPath)
}

# Conflit de port : deja le bon slot -> rien a faire (0) ; autre racine -> 3 sauf -Force.
function Ensure-PortFree([int]$P, [string]$Root, [string]$Kind) {
    $l = Get-Listener $P
    if (-not $l) { return $false }
    if ($l.root -ieq $Root) {
        Write-Host ("READY {0} deja en route : port {1} (pid {2}) sert {3}" -f $Kind, $P, $l.pid, $Root)
        return $true
    }
    if (-not $Force) {
        Write-Host ("CONFLIT port {0} : servi par {1} (pid {2}, root {3}). Relancer avec -Force pour l arreter." -f $P, $l.name, $l.pid, $(if ($l.root) { $l.root } else { "?" }))
        exit 3
    }
    Stop-ServedRoot $l $l.root
    return $false
}

function Resolve-Slot([string]$S) {
    if (-not $S) { Write-Output "-Slot requis"; exit 1 }
    $root = Normalize $S
    if (-not (Test-Path $root)) { Write-Output "slot absent : $root"; exit 1 }
    return $root
}

# Back que doit viser un slot front : slot apparie par branche, sinon BACK_ROOT (annonce).
function Resolve-BackTarget([string]$FrontRoot) {
    # Depot a backend fixe : un seul back possible, hors pool, deja en ecoute.
    $p = Get-RepoProfile $FrontRoot
    if ($p -and $p.backFixed) {
        return @{ root = ""; port = $p.backFixed; external = $true; how = "port fixe du depot, service externe non demarre par ce script" }
    }
    $main = Resolve-MainRoot $FrontRoot
    $backRoot = Resolve-BackRoot $main
    if (-not $backRoot) { return @{ root = ""; port = 0; external = $false; how = "aucun backend dans .sk/repos.json" } }
    $branch = Get-Branch $FrontRoot
    $slot = Resolve-BackSlot $backRoot $branch
    if ($slot) { return @{ root = $slot; port = (Get-BackPort $slot); external = $false; how = "branche $branch" } }
    return @{ root = $backRoot; port = (Get-BackPort $backRoot); external = $false; how = "aucun slot back sur $branch -> BACK_ROOT ($(Get-Branch $backRoot))" }
}

function Start-Front([string]$Root, [int]$P, [int]$Api, [int]$Seconds) {
    if (Ensure-PortFree $P $Root "front") { return }
    $log = Join-Path (Resolve-LogDir $Root) ("{0}-dev.log" -f (Split-Path -Leaf $Root))
    Set-Content -Path $log -Value "" -Encoding utf8
    # Les variables VITE_* posees ici PRIMENT sur le .env (hardlink du principal, identique
    # dans tous les slots) : le front vise SON port et SON back sans toucher au fichier.
    # BROWSER=none : Vite (server.open) n ouvre pas de navigateur ; c est le testeur qui navigue.
    $env = "set BROWSER=none&& set API_PORT=$Api&& set VITE_AUTH_REDIRECT_URI=https://localhost:$P&& set VITE_API_BASE_URL=http://localhost:$Api&& set VITE_API_BASE_URL_LOCAL=http://localhost:$Api"
    $inner = "$env&& yarn dev --port $P --strictPort --host localhost >> `"$log`" 2>&1"
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $inner -WorkingDirectory $Root -WindowStyle Hidden | Out-Null
    $l = Wait-Ready $P $Root $Seconds $log
    Write-Output ("READY front https://localhost:{0} -> api {1} | pid {2} | root {3} | log {4}" -f $P, $Api, $l.pid, $Root, $log)
}

function Start-Back([string]$Root, [int]$P, [int]$Seconds) {
    # Projet hote = celui qui porte Properties/launchSettings.json (hors bin/obj).
    $launch = Get-ChildItem -Path $Root -Recurse -Depth 3 -Filter "launchSettings.json" -File -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch '[\\/](bin|obj)[\\/]' -and (Split-Path -Leaf $_.DirectoryName) -eq 'Properties' } |
        Select-Object -First 1
    if (-not $launch) { Write-Output "aucun projet hote (Properties/launchSettings.json) sous $Root"; exit 1 }
    $hostDir = Split-Path -Parent $launch.DirectoryName
    $csproj = Get-ChildItem -Path $hostDir -Filter "*.csproj" -File | Select-Object -First 1
    if (-not $csproj) { Write-Output "aucun .csproj dans $hostDir"; exit 1 }

    # Profil 'http' pour l environnement (ASPNETCORE_ENVIRONMENT) ; le PORT vient de la
    # table, passe a l application par `-- --urls`, qui prime sur l applicationUrl du profil.
    $profile = "http"
    try {
        $ls = Get-Content $launch.FullName -Raw | ConvertFrom-Json
        if (-not $ls.profiles.$profile) { $profile = ($ls.profiles.PSObject.Properties | Where-Object { $_.Value.commandName -eq 'Project' } | Select-Object -First 1).Name }
    } catch {}
    if (Ensure-PortFree $P $Root "back") { return }

    $log = Join-Path (Resolve-LogDir $Root) ("{0}-api.log" -f (Split-Path -Leaf $Root))
    Set-Content -Path $log -Value "" -Encoding utf8
    $inner = "dotnet run --project `"$($csproj.FullName)`" --launch-profile $profile -- --urls http://localhost:$P >> `"$log`" 2>&1"
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $inner -WorkingDirectory $hostDir -WindowStyle Hidden | Out-Null
    $l = Wait-Ready $P $Root $Seconds $log
    Write-Output ("READY back http://localhost:{0} | pid {1} | root {2} | profil {3} | log {4}" -f $P, $l.pid, $Root, $profile, $log)
}

switch ($Action) {
    'ports' {
        # Tableau slot -> ports, pour les deux pools. -Slot (front) restreint a ce slot et son back.
        $start = if ($Slot) { Resolve-Slot $Slot } else { Normalize (Get-Location).Path }
        $main = Resolve-MainRoot $start
        if (-not $main) { Write-Output "pas un depot git : $start"; exit 1 }
        $backRoot = Resolve-BackRoot $main
        $fronts = if ($Slot) { @($start) } else { @($main) + @(git -C $main worktree list --porcelain | Where-Object { $_.StartsWith("worktree ") } | ForEach-Object { Normalize $_.Substring(9) } | Where-Object { $slotOffsets.ContainsKey((Split-Path -Leaf $_)) }) }
        Write-Output ("{0,-42} {1,-52} {2,6} {3,6}  {4}" -f "FRONT", "branche", "front", "back", "back vise")
        foreach ($f in $fronts) {
            $t = Resolve-BackTarget $f
            $backLabel = if ($t.root) { "{0} ({1})" -f (Split-Path -Leaf $t.root), $t.how } else { $t.how }
            Write-Output ("{0,-42} {1,-52} {2,6} {3,6}  {4}" -f $f, (Get-Branch $f), (Get-FrontPort $f), $t.port, $backLabel)
        }
        $mainProfile = Get-RepoProfile $main
        if ($backRoot -and -not $Slot -and -not ($mainProfile -and $mainProfile.backFixed)) {
            Write-Output ""
            Write-Output ("{0,-42} {1,-52} {2,6}" -f "BACK", "branche", "port")
            $backs = @($backRoot) + @(git -C $backRoot worktree list --porcelain | Where-Object { $_.StartsWith("worktree ") } | ForEach-Object { Normalize $_.Substring(9) } | Where-Object { $slotOffsets.ContainsKey((Split-Path -Leaf $_)) })
            foreach ($b in $backs) { Write-Output ("{0,-42} {1,-52} {2,6}" -f $b, (Get-Branch $b), (Get-BackPort $b)) }
        }
        exit 0
    }

    'status' {
        if ($Port -gt 0) { Show-Status @($Port) } else { Show-Status $scanPorts }
        exit 0
    }

    'up' {
        # Back apparie puis front, en un appel : c est la commande « lance le front et le back ».
        $root = Resolve-Slot $Slot
        $t = Resolve-BackTarget $root
        $frontPort = if ($Port -gt 0) { $Port } else { Get-FrontPort $root }
        Write-Output ("slot front {0} [{1}] -> https://localhost:{2}" -f $root, (Get-Branch $root), $frontPort)
        if ($t.external) {
            $bl = Get-Listener $t.port
            if ($bl) { Write-Output ("back externe http://localhost:{0} deja en ecoute (pid {1})  ({2})" -f $t.port, $bl.pid, $t.how) }
            else { Write-Output ("ATTENTION back externe http://localhost:{0} : rien n ecoute. Le demarrer hors de ce script (IIS)." -f $t.port) }
        } elseif ($t.root) {
            Write-Output ("back {0} [{1}] -> http://localhost:{2}  ({3})" -f $t.root, (Get-Branch $t.root), $t.port, $t.how)
            Start-Back $t.root $t.port $(if ($TimeoutSec -gt 0) { $TimeoutSec } else { 300 })
        } else {
            Write-Output ("pas de back : {0}" -f $t.how)
        }
        Start-Front $root $frontPort $t.port $(if ($TimeoutSec -gt 0) { $TimeoutSec } else { 120 })
        exit 0
    }

    'start-front' {
        $root = Resolve-Slot $Slot
        if ($Port -le 0) { $Port = Get-FrontPort $root }
        if ($ApiPort -le 0) {
            $t = Resolve-BackTarget $root
            $ApiPort = $t.port
            if ($t.root) { Write-Output ("back vise : {0} -> http://localhost:{1}  ({2})" -f $t.root, $t.port, $t.how) }
            elseif ($t.external) { Write-Output ("back vise : http://localhost:{0}  ({1})" -f $t.port, $t.how) }
        }
        if ($TimeoutSec -le 0) { $TimeoutSec = 120 }
        Start-Front $root $Port $ApiPort $TimeoutSec
        exit 0
    }

    'start-back' {
        $root = Resolve-Slot $Slot
        if ($Port -le 0) { $Port = Get-BackPort $root }
        if ($TimeoutSec -le 0) { $TimeoutSec = 300 }
        Start-Back $root $Port $TimeoutSec
        exit 0
    }

    'stop' {
        $root = Resolve-Slot $Slot
        $ports = if ($Port -gt 0) { @($Port) } else { $scanPorts }
        $n = 0
        foreach ($p in $ports) {
            $l = Get-Listener $p
            if ($l -and $l.root -ieq $root) { Stop-ServedRoot $l $root; $n++ }
        }
        if ($n -eq 0) { Write-Output "aucun serveur ne sert $root sur $($ports -join ', ')" }
        exit 0
    }
}
