---
description: Template de script bash robuste avec gestion d'erreurs, cleanup automatique et parsing de paramètres
tags:
  - Bash
  - Scripting
---

# Un template pour un script bash

Ecrire un script bash, tout le monde peut le faire. Ecrire un bon script bash, c'est déjà plus compliqué.

```bash
#!/usr/bin/env bash

set -Eeuo pipefail
trap cleanup ERR EXIT
trap 'exit 130' SIGINT
trap 'exit 143' SIGTERM

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd -P)

usage() {
  cat <<EOF
Usage: $(basename "${BASH_SOURCE[0]}") [-h] [-v] [-f] -p param_value arg1 [arg2...]

Script description here.

Available options:

-h, --help      Print this help and exit
-v, --verbose   Print script debug info
-f, --flag      Some flag description
-p, --param     Some param description
EOF
  exit
}

cleanup() {
  trap - SIGINT SIGTERM ERR EXIT
  # script cleanup here
}

setup_colors() {
  if [[ -t 2 ]] && [[ -z "${NO_COLOR-}" ]] && [[ "${TERM-}" != "dumb" ]]; then
    NOFORMAT='\033[0m' RED='\033[0;31m' GREEN='\033[0;32m' ORANGE='\033[0;33m' BLUE='\033[0;34m' PURPLE='\033[0;35m' CYAN='\033[0;36m' YELLOW='\033[1;33m'
  else
    NOFORMAT='' RED='' GREEN='' ORANGE='' BLUE='' PURPLE='' CYAN='' YELLOW=''
  fi
}

msg() {
  echo >&2 -e "${1-}"
}

die() {
  local msg=$1
  local code=${2-1} # default exit status 1
  msg "$msg"
  exit "$code"
}

parse_params() {
  # default values of variables set from params
  flag=0
  param=''

  while :; do
    case "${1-}" in
    -h | --help) usage ;;
    -v | --verbose) set -x ;;
    --no-color) NO_COLOR=1 ;;
    -f | --flag) flag=1 ;; # example flag
    -p | --param) # example named parameter
      [[ $# -ge 2 ]] || die "Missing value for $1"
      param="$2"
      shift
      ;;
    -?*) die "Unknown option: $1" ;;
    *) break ;;
    esac
    shift
  done

  args=("$@")

  # check required params and arguments
  [[ -z "${param-}" ]] && die "Missing required parameter: param"
  [[ ${#args[@]} -eq 0 ]] && die "Missing script arguments"

  return 0
}

parse_params "$@"
setup_colors

# script logic here

msg "${RED}Read parameters:${NOFORMAT}"
msg "- flag: ${flag}"
msg "- param: ${param}"
msg "- arguments: ${args[*]-}"
```

Quelques explications de ce template (qui n'est pas de moi, mais qui est excellent)

* Utilisation de env à la place de `/bin/bash` pour prendre le bash du `PATH` : utile sur macOS (où `/bin/bash` est encore une 3.2), NixOS ou les BSD, mais ça ne garantit pas que la version trouvée soit assez récente
* Utilisation de trap pour effectuer une fonction de cleanup, à la sortie normale comme sur erreur. Sur SIGINT et SIGTERM, le handler fait un `exit` (130 et 143, la convention 128 + numéro du signal) : sans ça, bash reprend le script à la commande suivante une fois le handler fini, et c'est le trap `EXIT` qui lance le cleanup
* Affichage d'une aide
* Parsage des paramètres fournis au script
