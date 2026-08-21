<#
.SYNOPSIS
    Install grok-discord-remote as a Windows scheduled task.

.DESCRIPTION
    Creates (or updates) a scheduled task that starts grok-discord-remote
    on login. Requires Node.js 22+ and Grok Build CLI on PATH.

.PARAMETER TaskName
    Name of the scheduled task. Default: "grok-discord-remote".

.PARAMETER InstallDir
    Directory containing the project. Default: current directory.

.PARAMETER WhatIf
    Show what would happen without making changes.

.EXAMPLE
    .\Install-GrokDiscordRemote.ps1 -WhatIf
    .\Install-GrokDiscordRemote.ps1
#>
[CmdletBinding(SupportsShouldProcess)]
param (
    [string]$TaskName   = "grok-discord-remote",
    [string]$InstallDir = (Get-Location).Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$nodePath  = (Get-Command node  -ErrorAction SilentlyContinue)?.Source
$npmPath   = (Get-Command npm   -ErrorAction SilentlyContinue)?.Source
$grokPath  = (Get-Command grok  -ErrorAction SilentlyContinue)?.Source

if (-not $nodePath) {
    Write-Error "node.exe not found on PATH. Install Node.js 22+ first."
    exit 1
}
if (-not $npmPath) {
    Write-Error "npm not found on PATH. Install Node.js 22+."
    exit 1
}
if (-not $grokPath) {
    Write-Warning "grok CLI not found on PATH. Make sure Grok Build is installed before starting the task."
}

$envFile = Join-Path $InstallDir ".env"
if (-not (Test-Path $envFile)) {
    Write-Warning ".env not found at $envFile. Copy .env.example to .env and fill in your DISCORD_BOT_TOKEN."
}

$packageJson = Join-Path $InstallDir "package.json"
if (-not (Test-Path $packageJson)) {
    Write-Error "package.json not found in $InstallDir. Run from the project root."
    exit 1
}

$nodeExe  = $nodePath
$startCmd = "npm.cmd"
$startArgs = "start"
$workDir  = $InstallDir

Write-Host "Task name  : $TaskName"
Write-Host "Install dir: $InstallDir"
Write-Host "Node       : $nodeExe"
Write-Host ""

if ($PSCmdlet.ShouldProcess("Scheduled Task '$TaskName'", "Create / Update")) {
    # Build the task
    $action  = New-ScheduledTaskAction -Execute $startCmd -Argument $startArgs -WorkingDirectory $workDir
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 0) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

    $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existing) {
        Set-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings | Out-Null
        Write-Host "Updated existing scheduled task '$TaskName'."
    } else {
        Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest | Out-Null
        Write-Host "Registered scheduled task '$TaskName'."
    }

    Write-Host ""
    Write-Host "The bot will start automatically at next logon."
    Write-Host "To start it now: Start-ScheduledTask -TaskName '$TaskName'"
}
