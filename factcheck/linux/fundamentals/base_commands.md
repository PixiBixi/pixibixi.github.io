---
article: docs/linux/fundamentals/base_commands.md
checked: '2026-11-10'
commit: f70b0c3b3e3155c51d8db1b9b71ea1645866f9fd
sources: []
unpinned: 8
---

# docs/linux/fundamentals/base_commands.md

## Findings

- L32 ERROR corrigé : `-S` = taille décroissante. Preuve : debian:12.8-slim, `ls --help` : "-S sort by file size, largest first"; `ls -S` place le fichier de 1000 octets avant celui de 10 octets plus récent.
- L91 ERROR corrigé : umask 022 donne 644 pour les fichiers (666-022) et 755 pour les dossiers. Preuve : debian:12.8-slim, `umask` = 0022, `touch f; mkdir d; stat -c %a` : `644 f`, `755 d`.
- L172 ERROR corrigé : `kill -9 <pid>` / `kill -KILL <pid>`, avec une phrase sur l'effet de `kill 9 <pid>`. Preuve : debian:12.8-slim bash, `kill 9 $P` : "kill: (9) - No such process" et `wait $P` = 143 (SIGTERM, pas SIGKILL).
- L22 IMPRECISE corrigé : `pwd <dir>` devient `pwd`. Preuve : le builtin bash ignore l'argument (affiche `/tmp` pour `pwd /etc`), `/bin/pwd /etc` : "ignoring non-option arguments".
- L25 IMPRECISE corrigé : `ls` = **l**i**s**t. Preuve : non sourçable formellement, "sorted" n'apparaît nulle part dans la doc coreutils; `ls --help` : "List information about the FILEs".
- L47 IMPRECISE corrigé : `type` décrit comme builtin qui dit comment le shell interprète un nom, `command -v` pour le chemin seul. Preuve : debian bash, `type cd` : "cd is a shell builtin", `type ls` : "ls is /usr/bin/ls", `command -v ls` : `/usr/bin/ls`.
- L110 IMPRECISE corrigé : `grep -c` compte des lignes. Preuve : fichier "aa aa / b / aa" (3 occurrences) : `grep -c aa` = 2.
- L122 IMPRECISE corrigé : `-c` octets, ajout de `-m` caractères. Preuve : `printf é | wc -c` = 2, `wc -m` (C.UTF-8) = 1.

## En plus

- L106 corrigé : lien `find` absolu (`https://wiki.jdelgado.fr/linux/cli/find/`) remplacé par le lien relatif `../cli/find.md`.
- L157 corrigé : `pstree -p` affiche les PID, pas "les processus". Preuve : debian:12.8-slim + psmisc, `pstree --help` : "-p, --show-pids show PIDs".
- L40 corrigé : typo "symoblique".

## Modernisation

- Appliquée : `command -v` mentionné dans l'entrée `type`.

## Tests

- debian:12.8-slim (coreutils 9.1, bash 5.2, psmisc) via OrbStack.

## À signaler

- `less/more`, `cut` et `tail/less` ont des entrées vides ou incomplètes : laissées telles quelles.
