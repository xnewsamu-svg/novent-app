param(
  [string]$Target = "firestore"
)

Write-Host "Deploying Firestore rules and indexes..." -ForegroundColor Cyan

switch ($Target) {
  "rules" {
    firebase deploy --only firestore:rules
  }
  "indexes" {
    firebase deploy --only firestore:indexes
  }
  "firestore" {
    firebase deploy --only firestore:rules,firestore:indexes
  }
  default {
    Write-Host "Usage: .\deploy-rules.ps1 [-Target rules|indexes|firestore]" -ForegroundColor Yellow
  }
}

if ($LASTEXITCODE -eq 0) {
  Write-Host "Deploy completado exitosamente." -ForegroundColor Green
} else {
  Write-Host "Error en el deploy. Revisa la salida de firebase." -ForegroundColor Red
}
