#!/usr/bin/env bash
# Filtro por rutas del CI (ADR-0005).
#
# Lee la lista de archivos cambiados por la entrada estándar (uno por línea)
# y escribe qué partes del CI deben correr, en formato clave=valor:
#   backend    src/Backend/**, .editorconfig
#   frontend   src/Frontend/**, .editorconfig
#   openapi    src/Backend/**, openapi/**, src/Frontend/src/app/api-client/**
#   workflows  .github/**
#   docs       docs/**, *.md (solo informativo: no dispara compilación)
#
# Ejemplo: git diff --name-only A...B | filtrar-rutas.sh >> "$GITHUB_OUTPUT"

set -euo pipefail

backend=false
frontend=false
openapi=false
workflows=false
docs=false

while IFS= read -r archivo || [ -n "$archivo" ]; do
  case "$archivo" in
    src/Backend/* | data/catalogos/* | .dockerignore) backend=true; openapi=true ;;
    src/Frontend/src/app/api-client/*) frontend=true; openapi=true ;;
    src/Frontend/*) frontend=true ;;
    openapi/*) openapi=true ;;
    .editorconfig) backend=true; frontend=true ;;
    .github/* | scripts/*) workflows=true ;;
  esac
  case "$archivo" in
    docs/* | *.md) docs=true ;;
  esac
done

echo "backend=$backend"
echo "frontend=$frontend"
echo "openapi=$openapi"
echo "workflows=$workflows"
echo "docs=$docs"
