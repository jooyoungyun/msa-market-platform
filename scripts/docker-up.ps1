$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
Write-Host "[1/3] Docker engine check"
docker version | Out-Host
Write-Host "[2/3] Build + start full stack"
docker compose -f docker-compose.full.yml up -d --build
Write-Host "[3/3] Status"
docker compose -f docker-compose.full.yml ps
Write-Host "Frontend:      http://localhost:3300"
Write-Host "Gateway:       http://localhost:8000"
Write-Host "Eureka:        http://localhost:8761"
Write-Host "Elasticsearch: http://localhost:9200"
Write-Host "Kibana:        http://localhost:5601"
