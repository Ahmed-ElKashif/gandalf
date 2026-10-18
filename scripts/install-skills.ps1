# gandalf — install the fellowship's gear (global scope)
# Installs every skill pack referenced by references/loadouts.md, via the skills CLI,
# so all skill-aware agents on this machine pick them up.
#
# Usage:      pwsh -File scripts/install-skills.ps1
#             pwsh -File scripts/install-skills.ps1 -SkipStackPacks   # skip the repo-framework packs
#
# Requires:   Node 18+ (npx). Optional: gh (PR lanes), ffmpeg (ui-review-loop recording).

param([switch]$SkipStackPacks)

$ErrorActionPreference = 'Continue'

function Install-Pack {
    param([string]$Repo, [string[]]$SkillNames)
    $cmd = @('--yes', 'skills', 'add', $Repo, '-g', '-y')
    if ($SkillNames) { $cmd += '-s'; $cmd += $SkillNames }
    $label = if ($SkillNames) { "$Repo ($($SkillNames -join ', '))" } else { $Repo }
    Write-Host "==> $label" -ForegroundColor Cyan
    & npx @cmd
    if ($LASTEXITCODE -ne 0) {
        Write-Host "    pack failed (exit $LASTEXITCODE) — continuing" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Core machinery ===" -ForegroundColor Green
Install-Pack 'amElnagdy/delegate-skills'
Install-Pack 'amElnagdy/review-skills'
Install-Pack 'amElnagdy/guard-skills'
Install-Pack 'DietrichGebert/ponytail'
Install-Pack 'amelnagdy/ui-review-loop'
Install-Pack 'vercel-labs/agent-browser'
Install-Pack 'getsentry/skills' @('security-review')

Write-Host "`n=== Spec, planning & debug discipline ===" -ForegroundColor Green
Install-Pack 'obra/superpowers' @('systematic-debugging', 'verification-before-completion', 'writing-plans', 'executing-plans')
Install-Pack 'mattpocock/skills' @('diagnosing-bugs', 'tdd', 'codebase-design', 'domain-modeling', 'to-spec', 'improve-codebase-architecture', 'setup-pre-commit', 'writing-for-agents', 'wizard')

Write-Host "`n=== UI craft ===" -ForegroundColor Green
Install-Pack 'emilkowalski/skills'
Install-Pack 'Leonxlnx/taste-skill'
Install-Pack 'ibelick/ui-skills'
Install-Pack 'anthropics/skills' @('frontend-design')
Install-Pack 'greensock/gsap-skills'
Install-Pack 'vercel-labs/agent-skills'

if (-not $SkipStackPacks) {
    Write-Host "`n=== Stack packs (feature lane) ===" -ForegroundColor Green
    Install-Pack 'supabase/agent-skills'
    Install-Pack 'prisma/skills'
    Install-Pack 'mongodb/agent-skills'
    Install-Pack 'kadajett/agent-nestjs-skills'
    Install-Pack 'wshobson/agents' @('nextjs-app-router-patterns', 'tailwind-design-system', 'typescript-advanced-types')
    Install-Pack 'shadcn-ui/ui'
    Install-Pack 'langchain-ai/langchain-skills'
}

Write-Host "`n=== DevOps & CI ===" -ForegroundColor Green
Install-Pack 'addyosmani/agent-skills' @('ci-cd-and-automation')
Install-Pack 'wshobson/agents' @('github-actions-templates')
Install-Pack 'github/awesome-copilot' @('github-actions-hardening')

Write-Host "`n=== Installed (global) ===" -ForegroundColor Green
& npx --yes skills ls -g

Write-Host "`nDone. The fellowship is armed. Reviewers live in the orchestrator session;"
Write-Host "headless implementers pick new skills up on their next run."
