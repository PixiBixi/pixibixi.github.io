---
article: docs/linux/shell/template_bash_script.md
checked: '2026-11-10'
commit: 31e42325408d1f5ff4d20baa69b0834c60e86550
sources: []
unpinned: 3
---

# docs/linux/shell/template_bash_script.md

## Findings

- L16 ERROR corrigé : `trap cleanup SIGINT SIGTERM ERR EXIT` remplacé par `trap cleanup ERR EXIT` + `trap 'exit 130' SIGINT` + `trap 'exit 143' SIGTERM` (le trap EXIT lance le cleanup), et l'explication en bas l'indique. Preuve : bash 5.3.20 local, script minimal avec l'ancien trap + `kill -INT $$` -> `cleanup` puis `still running after SIGINT`, rc=0 ; template corrigé -> cleanup puis rc=130, la ligne suivante n'est plus exécutée (idem /bin/bash 3.2.57).
- L72 IMPRECISE corrigé : `-p` sans valeur fait maintenant `die "Missing value for $1"` (`[[ $# -ge 2 ]] || die ...`, puis `param="$2"`). Preuve : bash 5.3.20, ancien parse_params avec `-p` seul -> rc=1 sans message ; template corrigé -> `Missing value for -p` rc=1 ; `-f -p x a b` toujours OK.
- L103 IMPRECISE corrigé : la phrase sur env ne promet plus « une compatibilité sur tous les OS » : env prend le bash du PATH (utile sur macOS où /bin/bash est 3.2, NixOS, BSD) sans garantir la version. Preuve : /bin/bash local = 3.2.57 ; env(1) ne fait que chercher la commande dans le PATH.

## En plus

- L21 : commentaire `# remove the space between << and EOF, this is due to web plugin issue` supprimé et `cat <<EOF` écrit sans espace : la consigne n'avait plus lieu d'être (le heredoc marche avec ou sans espace, `-h` testé, l'aide s'affiche).
- Coquille « paramètres fournit » -> « fournis ».

## Modernisation

- Appliquée : exit dans le handler de signal (via `exit 130` / `exit 143`, cleanup par le trap EXIT).

## Tests

- GNU bash 5.3.20 (Homebrew) et /bin/bash 3.2.57 (macOS) sur le bloc extrait de l'article, avec un hook de test injecté (kill -INT $$).

## À signaler

- Rien.
