---
article: docs/linux/advanced/strace.md
checked: '2026-11-11'
commit: fb05976a0c494ec0244a263c23b721a56226740f
sources: []
unpinned: 5
---

# docs/linux/advanced/strace.md

## Findings

- L46 IMPRECISE corrigé : `-x` = strings non ASCII en hexadécimal, `-xx` = toutes. Preuve : strace 6.13, `strace -x echo ab` affiche `"ab\n"`, avec un octet non ASCII la string sort en `\x..` ; `-xx echo ab` affiche `"\x61\x62\x0a"`.
- L107 IMPRECISE corrigé : `-e trace=stat` devient `-c -e trace=%%stat` (le commentaire annonçait un résumé sans `-c`), et une phrase sous les catégories explique le piège. Preuve : strace 6.13 / glibc 2.41, `strace -e trace=stat ls -l` et `trace=%stat` ne tracent rien, `-c -e trace=%%stat` compte fstat 13, newfstatat 3, statx 1.
- L123 IMPRECISE corrigé : liste des appels bloquants mise à jour (recvfrom, accept4, epoll_wait, poll/ppoll, select/pselect6, futex, clock_nanosleep, wait4). Preuve partielle : un `sleep` tracé est bloqué sur `clock_nanosleep` (strace 6.13) ; le reste vient des noms de syscalls noyau, pas testé un par un. Les noms historiques (poll, select) restent listés, ils existent toujours sur x86_64.
- L130 IMPRECISE corrigé : ajout d'une variante `strace -e trace=openat -Z -o /tmp/trace.log commande`, l'exemple grep est conservé. Preuve : strace NEWS@origin/HEAD L892-896 (release 5.2, 2019-07-12, `-e status=set`, `-z`, `-Z`) ; test 6.13 : seul l'openat en ENOENT est écrit dans le fichier.
- L157 IMPRECISE corrigé : le tri `sort -t '<' -k2` remplacé par `-o fichier` puis `sed -nE 's/.*<([0-9.]+)>$/\1 &/p' | sort -rn`, plus `strace -w -c -f`. Preuve : sur une trace `-f` de test, 94 lignes `<... resumed>` portent une durée ; l'ancien tri les classe à 0 (le 2e champ après `<` est `... wait4 resumed>`), alors que les 3 appels les plus longs (wait4 0,885 ms, rt_sigsuspend, clone) sont justement des lignes resumed, que le nouveau tri remonte en tête.

## En plus

- Aucune autre erreur trouvée. `-p $(pgrep -d',' nginx)` vérifié : strace 6.13 accepte une liste séparée par des virgules (2 process attachés).
- `tested_with: strace 6.13` ajouté.

## Modernisation

- `-Z` / `status=failed` : appliqué (tableau des options et section Fichier introuvable).
- `-k` : appliqué dans le tableau avec la réserve libunwind (le paquet Debian 13 n'a pas le support : "Stack traces (-k/--stack-trace option) are not supported by this build").
- `--seccomp-bpf` : appliqué en une phrase. Preuve : `strace -f --seccomp-bpf -e trace=openat` fonctionne, présent dans `strace -h`.
- Avertissement overhead : appliqué (admonition courte en tête, lien vers Alternatives).
- Préfixe `%` des classes : appliqué en une phrase ; `trace=file` testé, toujours accepté.

## Tests

- Conteneur `debian:13.1` (strace 6.13, glibc 2.41, noyau OrbStack 7.0 arm64), `--cap-add SYS_PTRACE`, supprimé après test. Clone `~/Documents/work/src/strace` créé (NEWS).

## À signaler

- Tests faits sur arm64 : là, poll/select n'existent pas comme syscalls (seulement ppoll/pselect6) ; sur x86_64 les 2 formes existent.
