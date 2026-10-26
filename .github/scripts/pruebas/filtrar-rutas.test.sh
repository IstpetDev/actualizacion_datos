#!/usr/bin/env bash
# Pruebas de .github/scripts/filtrar-rutas.sh.
#
# Cada caso: archivos cambiados (separados por comas) | salida esperada
# (backend frontend openapi workflows docs, como 1/0).
# Uso: .github/scripts/pruebas/filtrar-rutas.test.sh

set -uo pipefail

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
script="$raiz/filtrar-rutas.sh"

casos=(
  "src/Frontend/x.ts|0 1 0 0 0"
  "src/Backend/x.cs|1 0 1 0 0"
  "data/catalogos/Banco.csv|1 0 1 0 0"
  "data/catalogos/fuentes.json|1 0 1 0 0"
  ".dockerignore|1 0 1 0 0"
  "docs/x.md|0 0 0 0 1"
  "README.md,CONTRIBUTING.md|0 0 0 0 1"
  "src/Frontend/src/app/api-client/index.ts|0 1 1 0 0"
  "openapi/v1.json|0 0 1 0 0"
  ".github/workflows/ci.yml|0 0 0 1 0"
  ".github/scripts/validar-rama.sh|0 0 0 1 0"
  ".editorconfig|1 1 0 0 0"
  "src/Backend/Dockerfile,src/Frontend/package.json|1 1 1 0 0"
  "docker-compose.yml,.gitleaks.toml|0 0 0 0 0"
  "|0 0 0 0 0"
)

a_bits() {
  local salida="$1" clave valor bits=""
  for clave in backend frontend openapi workflows docs; do
    valor="$(grep -E "^${clave}=" <<<"$salida" | cut -d= -f2)"
    if [ "$valor" = "true" ]; then bits+="1 "; else bits+="0 "; fi
  done
  echo "${bits% }"
}

total=0
fallos=0
for caso in "${casos[@]}"; do
  IFS='|' read -r archivos esperado <<<"$caso"
  total=$((total + 1))
  salida="$(tr ',' '\n' <<<"$archivos" | bash "$script")"
  obtenido="$(a_bits "$salida")"
  if [ "$obtenido" = "$esperado" ]; then
    printf 'OK     %-50s -> %s\n' "${archivos:-(ninguno)}" "$(tr '\n' ' ' <<<"$salida")"
  else
    fallos=$((fallos + 1))
    printf 'FALLA  %-50s esperado [%s], obtenido [%s]\n' "${archivos:-(ninguno)}" "$esperado" "$obtenido"
  fi
done

echo
if [ "$fallos" -eq 0 ]; then
  echo "Resultado: $total casos, todos correctos."
  exit 0
fi
echo "Resultado: $fallos de $total casos fallaron."
exit 1
