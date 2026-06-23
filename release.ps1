#!/usr/bin/env pwsh
# release.ps1 — build and push all StreamPipes images to Docker Hub
#
# Usage:
#   .\release.ps1                     # push as yourorg/...:latest
#   .\release.ps1 -Tag 1.0.0          # push as yourorg/...:1.0.0 (also tags :latest)
#
# Requires: Java 17+, Maven 3.9+, Node 20+, Docker Desktop running

param(
    [string]$Tag = "latest",
    [string]$Org = ""
)

# Read org from .env if not passed
if (-not $Org) {
    if (Test-Path .env) {
        $Org = (Get-Content .env | Where-Object { $_ -match "^IMAGE_ORG=" }) -replace "^IMAGE_ORG=", ""
    }
    if (-not $Org) { $Org = "yourorg" }
}

Write-Host "Building and pushing as $Org/...:$Tag" -ForegroundColor Cyan

# 1. Maven build
Write-Host "`n[1/4] Maven build..." -ForegroundColor Yellow
mvn clean package -DskipTests -q
if ($LASTEXITCODE -ne 0) { Write-Error "Maven build failed"; exit 1 }

# 2. Angular build
Write-Host "`n[2/4] Angular build..." -ForegroundColor Yellow
Push-Location ui
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Angular build failed"; exit 1 }
Pop-Location

# 3. Docker build
Write-Host "`n[3/4] Docker build..." -ForegroundColor Yellow
docker compose build
if ($LASTEXITCODE -ne 0) { Write-Error "Docker build failed"; exit 1 }

# 4. Tag and push
Write-Host "`n[4/4] Tagging and pushing..." -ForegroundColor Yellow
$images = @(
    @{ src = "streampipes_backend:release-validation";                     dst = "streampipes-backend" },
    @{ src = "streampipes_ui:release-validation";                          dst = "streampipes-ui" },
    @{ src = "streampipes_pipeline-elements-all-iiot:release-validation";  dst = "streampipes-extensions" }
)

foreach ($img in $images) {
    $remote = "$Org/$($img.dst):$Tag"
    docker tag $img.src $remote
    docker push $remote
    if ($Tag -ne "latest") {
        $latest = "$Org/$($img.dst):latest"
        docker tag $img.src $latest
        docker push $latest
    }
}

Write-Host "`nDone! Colleagues can now run:" -ForegroundColor Green
Write-Host "  docker compose -f docker-compose.deploy.yml up -d" -ForegroundColor White
