#!/usr/bin/env bash
# Pruebas de .github/scripts/validar-rama.sh.
#
# Cada caso: código de salida esperado | base | rama de origen | título
# | autor del PR (opcional; vacío = persona sin nombre conocido).
# Uso: .github/scripts/pruebas/validar-rama.test.sh
# Sale con 1 si algún caso no da el código esperado.

set -uo pipefail

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
script="$raiz/validar-rama.sh"

casos=(
  # ── Aceptados ──────────────────────────────────────────────────────────
  "0|develop|feature/login|feat: iniciar sesión con cédula"
  "0|develop|feature/123-login-sso|feat: login con sso"
  "0|develop|fix/fecha-fin|fix: evitar fecha de fin anterior al inicio de la campaña"
  "0|develop|docs/guia|docs: ampliar la guía de contribución"
  "0|develop|chore/limpieza|chore: limpiar archivos sin uso"
  "0|develop|refactor/capas|refactor: separar casos de uso"
  "0|develop|test/dominio|test: cubrir la cédula vacía"
  "0|develop|ci/cache|ci: cachear paquetes de nuget"
  "0|develop|main|chore: devolver hotfix de main a develop"
  "0|main|develop|chore: publicar versión 0.1.0"
  "0|main|hotfix/x|fix: algo"
  "0|main|hotfix/fecha-fin-de-campana|fix: corregir el año de la campaña"
  "0|develop|feature/x|feat: 2fa por correo"
  "0|develop|dependabot/nuget/src/Backend/xunit-2.9.4|chore: bump xunit from 2.9.3 to 2.9.4|dependabot[bot]"
  "0|develop|dependabot/nuget/src/Backend/multi-a1b2c3|chore: bump Microsoft.AspNetCore.OpenApi from 10.0.12 to 10.0.13|dependabot[bot]"
  # ── Rama de origen no permitida para la base ──────────────────────────
  "1|main|feature/x|feat: algo"
  "1|main|fix/x|fix: algo"
  "1|main|main|fix: algo"
  "1|main|dependabot/npm_and_yarn/src/Frontend/rxjs-7.8.2|chore: bump rxjs from 7.8.1 to 7.8.2|dependabot[bot]"
  "1|develop|hotfix/x|fix: algo"
  "1|develop|develop|fix: algo"
  "1|develop|release/1.0|chore: algo"
  "1|release|feature/x|feat: algo"
  # ── Nombre de rama mal formado ────────────────────────────────────────
  "1|develop|Feature/x|feat: algo"
  "1|develop|feature/Login|feat: algo"
  "1|develop|feature/login_sso|feat: algo"
  "1|develop|feature/|feat: algo"
  "1|develop|feature/login-|feat: algo"
  "1|develop|feature/-login|feat: algo"
  "1|develop|feature/a/b|feat: algo"
  "1|develop|feat/login|feat: algo"
  "1|main|hotfix/Arreglo|fix: algo"
  # ── Título mal formado ────────────────────────────────────────────────
  "1|main|hotfix/x|Fix: Algo"
  "1|develop|fix/x|fix: Algo"
  "1|develop|fix/x|fix: corregir Error"
  "1|develop|fix/x|fix: Ácido en la campaña"
  "1|develop|fix/x|corregir algo"
  "1|develop|fix/x|foo: algo"
  "1|develop|feature/x|feat(api): algo"
  "1|develop|feature/x|feat!: algo"
  "1|develop|feature/x|feat:algo"
  "1|develop|feature/x|feat:  algo"
  "1|develop|feature/x|feat: "
  "1|develop|feature/x|"
  "1|develop|main|Devolver hotfix"
  "1|develop|dependabot/nuget/src/Backend/xunit-2.9.4|Bump xunit from 2.9.3 to 2.9.4|dependabot[bot]"
  "1|develop|dependabot/nuget/src/Backend/xunit-2.9.4|build(deps): bump xunit from 2.9.3 to 2.9.4|dependabot[bot]"
  # ── Excepción de Dependabot: solo para el autor dependabot[bot] ───────
  "0|develop|dependabot/npm_and_yarn/foo|chore: bump Foo from 1.0.0 to 2.0.0|dependabot[bot]"
  "1|main|dependabot/npm_and_yarn/foo|chore: bump Foo from 1.0.0 to 2.0.0|dependabot[bot]"
  "1|develop|dependabot/x|feat: Agregar Login SSO|alguien"
  "1|develop|dependabot/x|feat: agregar login sso|alguien"
  "1|develop|dependabot/x|feat: Agregar Login SSO|"
  "1|develop|dependabot/npm_and_yarn/foo|chore: bump Foo from 1.0.0 to 2.0.0|dependabot"
  "1|develop|feature/x|feat: Agregar login|dependabot[bot]"
)

total=0
fallos=0

for caso in "${casos[@]}"; do
  IFS='|' read -r esperado base cabeza titulo autor <<<"$caso"
  total=$((total + 1))
  salida="$(bash "$script" "$base" "$cabeza" "$titulo" "$autor" 2>&1)"
  obtenido=$?
  if [ "$obtenido" -eq "$esperado" ]; then
    printf 'OK     %-8s <- %-45s "%s" %s\n' "$base" "$cabeza" "$titulo" "${autor:+[$autor]}"
  else
    fallos=$((fallos + 1))
    printf 'FALLA  %-8s <- %-45s "%s" %s\n' "$base" "$cabeza" "$titulo" "${autor:+[$autor]}"
    printf '       esperado %s, obtenido %s\n' "$esperado" "$obtenido"
    printf '       %s\n' "${salida//$'\n'/$'\n'       }"
  fi
done

# Uso incorrecto: sin argumentos debe salir con 2.
total=$((total + 1))
bash "$script" >/dev/null 2>&1
obtenido=$?
if [ "$obtenido" -eq 2 ]; then
  echo "OK     sin argumentos -> 2"
else
  fallos=$((fallos + 1))
  echo "FALLA  sin argumentos: esperado 2, obtenido $obtenido"
fi

echo
if [ "$fallos" -eq 0 ]; then
  echo "Resultado: $total casos, todos correctos."
  exit 0
fi
echo "Resultado: $fallos de $total casos fallaron."
exit 1
