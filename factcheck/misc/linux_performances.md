---
article: docs/misc/linux_performances.md
checked: '2026-11-10'
commit: ebce492af8525fed9399c217aa0046384c9a226d
sources: []
unpinned: 17
---

# docs/misc/linux_performances.md

## Findings

- L92 ERROR corrigé : commentaire vmstat réécrit sur les colonnes `si`/`so`. Preuve : debian:12.8-slim procps 4.0.2, en-tête `vmstat 1 1` : `r b swpd free buff cache si so bi bo in cs us sy id wa st`, aucune colonne kswapd.
- L109 ERROR corrigé : `%util` proche de 100% = saturation seulement pour un disque série, renvoi vers r_await/w_await et aqu-sz (bloc et tableau). Preuve : sysstat `man/iostat.in:215-217` @origin/master (v12.8.0).
- L110 OUTDATED corrigé : `await` remplacé par `r_await`/`w_await`, ajout de `aqu-sz`, tableau mis à jour. Preuve : debian:12.8-slim sysstat 12.6.1, en-tête `iostat -x` : `... r_await ... w_await ... d_await ... f_await aqu-sz %util`, pas de `await`.
- L116 OUTDATED corrigé : commentaire indiquant que dstat n'est plus maintenu et que la commande vient de pcp-system-tools sur RHEL 9. Preuve : `gh api repos/dstat-real/dstat` : `archived: true`, dernier push 2020-06-18; rockylinux:9.3 `dnf provides /usr/bin/dstat` : `pcp-system-tools`. "Même syntaxe de flags" non vérifié, pas écrit.
- L36 IMPRECISE corrigé : commentaire "snapshot unique en mode batch". La partie "%CPU de la 1re itération = moyenne depuis le boot" est non vérifiée (rien trouvé dans `man/top.1` ni `src/top/top.c` de procps @origin/master), pas ajoutée.
- L44 IMPRECISE corrigé : ajout de `sar -u` sans intervalle (fichier du jour) et du chemin RHEL `/var/log/sa/saDD`. Preuve : debian `SA_DIR=/var/log/sysstat` (/etc/sysstat/sysstat); sysstat `configure.ac:382` défaut `SA_DIR=/var/log/sa`; `man/sar.in:44-48` (lecture du fichier du jour par défaut).
- L47 IMPRECISE corrigé : load présenté comme heuristique, mention des process en état D et de vmstat r/b. Preuve : linux `kernel/sched/loadavg.c:25` (`nr_active += nr_running + nr_uninterruptible`), clone local torvalds/linux @8a651625.
- L95 IMPRECISE corrigé : le grep existant est relibellé "page faults et swap", ajout d'un grep reclaim/compaction (`pgscan_`, `pgsteal_`, `allocstall`, `compact_stall`). Preuve : compteurs présents dans `/proc/vmstat` (debian:12.8-slim, noyau OrbStack 7.0.14).
- L118 IMPRECISE corrigé : lecture par défaut, ajout d'une ligne `-W -Y`. Preuve : ioping `ioping.1:131-146` @origin/master (v1.3); `ioping -c 2 -W -Y /tmp` fonctionne (debian:12.8-slim).
- L157 IMPRECISE corrigé : `netstat -s | grep -i drop` remplacé par `nstat -az | grep -i drop`. Preuve : debian:12.8-slim + iproute2 : `netstat` absent, `nstat -az` sort `TcpExtListenDrops`, `TcpExtTCPBacklogDrop`...
- L190 IMPRECISE corrigé : `ps -L -o pid,lwp,stat,comm -p <PID>`. Preuve : procps 4.0.2, en-tête `ps -eLf` : `UID PID PPID LWP C NLWP STIME TTY TIME CMD` (pas d'état); la nouvelle commande affiche `STAT`.
- L209 IMPRECISE corrigé : commentaire "en direct, 5 mesures", historique = sans intervalle. Preuve : `man/sar.in:44-48`.
- L217 IMPRECISE corrigé : précision "moyenne depuis le démarrage", ajout de `pidstat 1 5`. Preuve : procps `man/ps.1:984` (cputime/realtime ratio); `pidstat` présent dans sysstat (debian).
- L231 IMPRECISE corrigé : présenté comme indice, voluntary = cède le CPU (I/O, lock, sleep). Preuve : sémantique des compteurs, non re-sourcée dans le noyau.
- L234 IMPRECISE corrigé : `ulimit -a` = shell courant, ajout de `cat /proc/<PID>/limits`. Preuve : `ulimit` est un builtin du shell (bash), limites par process.
- L248 IMPRECISE non vérifié : seuil `%iowait > 20%` laissé, c'est une heuristique de l'auteur; aucune source ne donne de seuil.
- L249 IMPRECISE corrigé : ligne "Swap utilisé > 0" remplacée par "Swap actif (`si`/`so`) > 0 en continu, `vmstat 1`". Preuve : colonnes si/so de vmstat (cf. L92).

## En plus

- Aucun.

## Modernisation

- Appliqué : colonnes r_await/w_await/aqu-sz, signalement dstat/pcp-dstat, `nstat`, `lsof +L1` (testé : liste un fichier supprimé encore ouvert, `NLINK 0`), PSI `/proc/pressure/memory` ajouté dans "Pression mémoire" (sans version de noyau : je n'ai pas pu dater l'apparition de psi.c dans le clone partiel; `/proc/pressure` est absent dans le noyau OrbStack, d'où "si le noyau l'expose").

## Tests

- debian:12.8-slim (sysstat 12.6.1, procps-ng 4.0.2, ioping, iproute2, lsof), rockylinux:9.3 (`dnf provides`), via OrbStack.
- Clones sysstat (v12.8.0), ioping (v1.3), procps (v4.0.7), linux.

## À signaler

- Le seuil `%iowait > 20%` du tableau reste sans source : à garder ou retirer selon l'auteur.
