$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$apps = @("discoveryservice", "user-service", "catalog-service", "order-service", "apigateway-service", "frontend")
docker compose -f docker-compose.full.yml build --no-cache $apps
docker compose -f docker-compose.full.yml up -d $apps
docker compose -f docker-compose.full.yml ps
