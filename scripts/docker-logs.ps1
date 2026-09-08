param([string]$Service = "")
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
if ([string]::IsNullOrWhiteSpace($Service)) {
  docker compose -f docker-compose.full.yml logs -f --tail 100
} else {
  docker compose -f docker-compose.full.yml logs -f --tail 200 $Service
}
