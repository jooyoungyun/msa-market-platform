$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
docker compose -f docker-compose.full.yml ps
Write-Host "`n--- Eureka apps ---"
try { Invoke-RestMethod -Headers @{Accept='application/json'} http://localhost:8761/eureka/apps | ConvertTo-Json -Depth 6 } catch { Write-Host $_.Exception.Message }
Write-Host "`n--- Elasticsearch indices ---"
try { Invoke-RestMethod 'http://localhost:9200/_cat/indices/msa-market-logs-*?v' } catch { Write-Host $_.Exception.Message }
