param(
  [string]$AuditFile = "face-ai/storage/verification_audit.jsonl"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $AuditFile)) {
  Write-Host "Audit file not found: $AuditFile"
  Write-Host "Create it by doing at least one face verify attempt in the app."
  exit 1
}

Write-Host "Watching audit log: $AuditFile"
Write-Host "Press Ctrl+C to stop."
Write-Host ""
Write-Host "timestamp | outcome | live | challenge | durationMs | bestScore | model"
Write-Host "---------------------------------------------------------------------"

Get-Content $AuditFile -Wait | ForEach-Object {
  $line = $_.Trim()
  if ([string]::IsNullOrWhiteSpace($line)) {
    return
  }

  try {
    $obj = $line | ConvertFrom-Json

    $timestamp = [string]$obj.timestamp
    $outcome = [string]$obj.outcome
    $live = [double]$obj.livenessScore
    $challenge = if ($null -ne $obj.activeLiveness -and $null -ne $obj.activeLiveness.challenge) { [string]$obj.activeLiveness.challenge } else { "-" }
    $durationMs = if ($null -ne $obj.activeLiveness -and $null -ne $obj.activeLiveness.durationMs) { [int]$obj.activeLiveness.durationMs } else { -1 }
    $bestScore = if ($null -ne $obj.recognition -and $null -ne $obj.recognition.bestScore) { [double]$obj.recognition.bestScore } else { [double]::NaN }
    $model = [string]$obj.modelMode

    $liveText = if ([double]::IsNaN($live)) { "-" } else { $live.ToString("0.0000") }
    $durationText = if ($durationMs -lt 0) { "-" } else { $durationMs.ToString() }
    $scoreText = if ([double]::IsNaN($bestScore)) { "-" } else { $bestScore.ToString("0.0000") }

    Write-Host ("{0} | {1} | {2} | {3} | {4} | {5} | {6}" -f $timestamp, $outcome, $liveText, $challenge, $durationText, $scoreText, $model)
  }
  catch {
    Write-Host ("[UNPARSEABLE] {0}" -f $line)
  }
}
