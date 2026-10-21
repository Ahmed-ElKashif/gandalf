# gandalf - arm the fellowship (global scope, Windows convenience)
#
# Reads packs.json from the council-of-elrond skill beside it - the single source of
# truth for what to install and what to credit - and runs the install command listed
# there, in file order. delegate-skills is first in that file and installs first, so
# the relays and the delegate-setup engine land before anything is cast.
#
# This script is a convenience for Windows / offline use. The recommended path is
# the council-of-elrond skill, which arms the machine from the same file, shows one
# delta table, and takes one approval. Neither path invents an install list.
#
# Usage:      pwsh -File scripts/install-skills.ps1                  # core + ui (the default)
#             pwsh -File scripts/install-skills.ps1 -SkipStackPacks  # core + ui only (same as default)
#             pwsh -File scripts/install-skills.ps1 -All             # everything except `optional`
#             pwsh -File scripts/install-skills.ps1 -All -IncludeOptional  # + security-review, ui-review-loop
#
# After installing, it runs the council's patch verifier (`patch-skills.mjs apply`) so a
# reinstall repairs the verified upstream fixes instead of silently dropping them.
#
# Requires:   Node 18+ (npx). Optional: gh (PR lanes). ffmpeg is only needed if you
#             record video - palantir's evidence does not depend on it.
#
# Note: keep this file ASCII-only. Windows PowerShell 5.1 reads it without a BOM as
# ANSI, and a UTF-8 em dash decodes into a stray quote character.

param(
    [switch]$SkipStackPacks,
    [switch]$All,
    [switch]$IncludeOptional
)

$ErrorActionPreference = 'Continue'

# packs.json ships inside the council-of-elrond skill, so it survives install:
#   dev clone        <repo>/skills/gandalf      -> ../council-of-elrond/packs.json
#   installed store  ~/.agents/skills/gandalf   -> ../council-of-elrond/packs.json
$packsFile = Join-Path $PSScriptRoot '..\..\council-of-elrond\packs.json'
if (-not (Test-Path $packsFile)) {
    Write-Host "packs.json not found at $packsFile" -ForegroundColor Red
    Write-Host "Install council-of-elrond beside this skill, or run this from the repository clone." -ForegroundColor Red
    exit 1
}

$manifest = Get-Content -Raw $packsFile | ConvertFrom-Json
$defaultTiers = @($manifest.defaultTiers)

function Select-Tiers {
    if ($All) {
        $tiers = @($manifest.packs | ForEach-Object { $_.tier } | Select-Object -Unique)
    } else {
        $tiers = $defaultTiers
    }
    if (-not $IncludeOptional) { $tiers = $tiers | Where-Object { $_ -ne 'optional' } }
    return @($tiers)
}

$wanted = Select-Tiers
$skipped = @()

Write-Host "`n=== Arming from packs.json (tiers: $($wanted -join ', ')) ===" -ForegroundColor Green

foreach ($pack in $manifest.packs) {
    if ($wanted -notcontains $pack.tier) { $skipped += $pack; continue }

    $tokens = $pack.install -split '\s+'
    if ($tokens[0] -ne 'npx') {
        # Packs that ship WITH this repo (palantir, celebrimbor) have no npx command.
        # Say so plainly rather than reporting a failure: the skill is already here.
        Write-Host "    $($pack.repo): ships with this repo - $($pack.install)" -ForegroundColor DarkGray
        continue
    }
    $npxArgs = @('--yes') + $tokens[1..($tokens.Count - 1)]

    Write-Host "==> $($pack.repo)  [$($pack.tier)]" -ForegroundColor Cyan
    & npx @npxArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Host "    pack failed (exit $LASTEXITCODE) - continuing" -ForegroundColor Yellow
    }
}

if ($skipped.Count -gt 0) {
    Write-Host "`n=== Not installed (offer these per repo) ===" -ForegroundColor Green
    $skipped | ForEach-Object { Write-Host "  [$($_.tier)] $($_.repo) - $($_.why)" }
    Write-Host "`n  Re-run with -All to take everything except 'optional'." -ForegroundColor DarkGray
}

Write-Host "`n=== Installed (global) ===" -ForegroundColor Green
& npx --yes skills ls -g

# A reinstall of an upstream pack replaces its files; the verifier puts our fixes back
# and fails loudly when upstream has moved instead of guessing.
$patchFailed = $false
$patchScript = Join-Path $PSScriptRoot '..\..\council-of-elrond\scripts\patch-skills.mjs'
if (Test-Path $patchScript) {
    Write-Host "`n=== Verified patches ===" -ForegroundColor Green
    & node $patchScript apply
    if ($LASTEXITCODE -ne 0) {
        Write-Host "    patch step needs attention (exit $LASTEXITCODE) - see above" -ForegroundColor Yellow
        $patchFailed = $true
    }
} else {
    Write-Host "`n    patch verifier not found at $patchScript - the install is unverified" -ForegroundColor Yellow
    $patchFailed = $true
}

# The upstream installer sometimes prints "Failed to install N skills" even when
# every skill landed. Confirm the real state before declaring victory.
$verifyScript = Join-Path $PSScriptRoot 'verify-install.mjs'
if (Test-Path $verifyScript) {
    Write-Host "`n=== Verify install ===" -ForegroundColor Green
    & node $verifyScript
    if ($LASTEXITCODE -ne 0) {
        Write-Host "    install is incomplete - see above (exit $LASTEXITCODE)" -ForegroundColor Yellow
        $patchFailed = $true
    }
} else {
    Write-Host "`n    verify-install not found at $verifyScript" -ForegroundColor Yellow
}

Write-Host "`nDone. The fellowship is armed. Reviewers live in the orchestrator session;"
Write-Host "headless implementers pick new skills up on their next run."

if ($patchFailed) { exit 1 }
