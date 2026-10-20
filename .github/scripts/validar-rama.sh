#!/usr/bin/env bash
# Política de ramas y título de PR (ADR-0002, CONTRIBUTING.md).
#
# Uso: validar-rama.sh <base> <rama-de-origen> <título-del-pr> [<autor-del-pr>]
#   <autor-del-pr>: login de GitHub de quien abrió el PR (branch-policy.yml lo
#   lee de la API). Solo se usa para la excepción de Dependabot.
# Sale con 0 si el PR cumple, 1 si no cumple y 2 si el uso es incorrecto.
#
# Ramas:
#   base main    <- develop, hotfix/<descripcion>
#   base develop <- feature|fix|docs|chore|refactor|test|ci/<descripcion>,
#                   main (solo para devolver un hotfix),
#                   dependabot/... (solo si el autor es exactamente dependabot[bot])
#   <descripcion>: minúsculas, dígitos y guiones; sin guion al inicio ni al
#   final y sin barras. Ejemplo: feature/123-login-con-cedula.
#
# Título: "<tipo>: <resumen>", tipos feat fix docs chore refactor test ci.
#   - Un solo espacio tras los dos puntos. Sin ámbito "(x)" ni "!".
#   - "En minúsculas": el resumen empieza por letra minúscula o dígito y no
#     contiene ninguna mayúscula (incluidas Á, É, Ñ...).
#   - Excepción: en PR de dependabot/... abiertos por dependabot[bot], el
#     resumen puede contener mayúsculas
#     después de la primera letra, porque Dependabot copia el nombre del
#     paquete tal cual (Microsoft.AspNetCore.OpenApi).

set -uo pipefail
export LC_ALL=C.UTF-8

if [ "$#" -lt 3 ] || [ "$#" -gt 4 ]; then
  echo "Uso: $0 <base> <rama-de-origen> <título-del-pr> [<autor-del-pr>]" >&2
  exit 2
fi

base="$1"
cabeza="$2"
titulo="$3"
autor="${4:-}"
errores=()

# La excepción de Dependabot exige la rama y el autor: cualquiera puede crear
# una rama dependabot/x, pero solo el bot de GitHub es dependabot[bot].
dependabot=false
if [[ $cabeza =~ ^dependabot/ ]] && [ "$autor" = "dependabot[bot]" ]; then
  dependabot=true
fi

descripcion='[a-z0-9]+(-[a-z0-9]+)*'
tipos='feat|fix|docs|chore|refactor|test|ci'

case "$base" in
  main)
    if [ "$cabeza" = "develop" ]; then
      :
    elif [[ $cabeza =~ ^hotfix/${descripcion}$ ]]; then
      :
    else
      errores+=("'main' solo acepta PR desde 'develop' o 'hotfix/<descripcion>' (recibido: '$cabeza').")
    fi
    ;;
  develop)
    if [ "$cabeza" = "main" ]; then
      :
    elif [ "$dependabot" = "true" ]; then
      :
    elif [[ $cabeza =~ ^(feature|fix|docs|chore|refactor|test|ci)/${descripcion}$ ]]; then
      :
    else
      errores+=("'develop' solo acepta PR desde feature|fix|docs|chore|refactor|test|ci/<descripcion> o desde 'main' para devolver un hotfix (recibido: '$cabeza').")
      errores+=("La descripción de la rama va en minúsculas, con dígitos y guiones. Ejemplo: feature/123-login-con-cedula.")
    fi
    ;;
  *)
    errores+=("Solo se aceptan PR hacia 'main' o 'develop' (recibido: '$base').")
    ;;
esac

if [[ $titulo =~ ^(${tipos}):\ (.*)$ ]]; then
  resumen="${BASH_REMATCH[2]}"
  if [[ ! $resumen =~ ^[[:lower:][:digit:]] ]]; then
    errores+=("El resumen del título debe empezar por minúscula o dígito (recibido: '$resumen').")
  elif [[ $resumen =~ [[:upper:]] ]] && [ "$dependabot" != "true" ]; then
    errores+=("El resumen del título va en minúsculas (recibido: '$resumen').")
  fi
else
  errores+=("El título debe ser '<tipo>: <resumen en minúsculas>' con tipo feat, fix, docs, chore, refactor, test o ci (recibido: '$titulo').")
fi

if [ "${#errores[@]}" -gt 0 ]; then
  echo "La política de ramas no se cumple para el PR '$cabeza' -> '$base':"
  printf '  - %s\n' "${errores[@]}"
  echo "Ver CONTRIBUTING.md, secciones 'Ramas' y 'Título del PR'."
  exit 1
fi

echo "Política de ramas cumplida: '$cabeza' -> '$base', título '$titulo'."
exit 0
