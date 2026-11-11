---
article: docs/linux/cli/ss.md
checked: '2026-11-10'
commit: 475ec4a89e7afde6d01b907212b03b1358250c89
sources:
- repo: iproute2
  path: misc/ss.c
  lines: '251'
  ref: v7.3.0
  commit: 19d1276f766daa458fb55096edb38818a7d19606
- repo: iproute2
  path: man/man8/ss.8
  lines: '44'
  ref: v7.3.0
  commit: 19d1276f766daa458fb55096edb38818a7d19606
- repo: iproute2
  path: misc/ss.c
  lines: '5821'
  ref: v7.3.0
  commit: 19d1276f766daa458fb55096edb38818a7d19606
- repo: iproute2
  path: misc/ss.c
  lines: 6161-6165
  ref: v7.3.0
  commit: 19d1276f766daa458fb55096edb38818a7d19606
- repo: iproute2
  path: man/man8/ss.8
  lines: '405'
  ref: v7.3.0
  commit: 19d1276f766daa458fb55096edb38818a7d19606
- repo: iproute2
  path: man/man8/ss.8
  lines: 447-469
  ref: v7.3.0
  commit: 19d1276f766daa458fb55096edb38818a7d19606
- repo: iproute2
  path: misc/ss.c
  lines: 5843-5850
  ref: v7.3.0
  commit: 19d1276f766daa458fb55096edb38818a7d19606
- repo: iproute2
  path: man/man8/ss.8
  lines: '213'
  ref: v7.3.0
  commit: 19d1276f766daa458fb55096edb38818a7d19606
unpinned: 3
---

# docs/linux/cli/ss.md

## Findings

- L47 ERROR corrigé : le défaut masque LISTEN, CLOSED, TIME-WAIT et SYN-RECV (pas "que ESTABLISHED"), et `-l` affiche **seulement** les sockets en écoute. Preuve : `misc/ss.c:251@v7.3.0` (`SS_CONN`), `man/man8/ss.8:44@v7.3.0` "Display only listening sockets (these are omitted by default)".
- L59 ERROR corrigé : `-n` ne concerne que les ports, les IP ne sont pas résolues par défaut, les 2 options sont indépendantes. Preuve : test debian:13.1 (iproute2 6.15.0) sur une connexion 127.0.0.1:8080 : `ss -t` -> `127.0.0.1:http-alt`, `-n` -> `127.0.0.1:8080`, `-r` -> `localhost:http-alt`, `-n -r` -> `localhost:8080`. Note : la partie du finding "-n l'emporte sur -r" est fausse (la ligne `ss.c:6196` ne concerne que le résolveur RPC ; la résolution d'hôte dépend seulement de `resolve_hosts`, `lib/utils.c:1153`), d'où la phrase "on peut cumuler les 2".
- L135 ERROR corrigé : `listen` -> `listening`. Preuve : debian:13.1 `ss state listen` -> "ss: wrong state name: listen" ; `misc/ss.c:5821@v7.3.0`.
- L167 ERROR corrigé : expression quotée `'( dport = :443 or dport = :80 )'` + phrase d'explication. Preuve : `bash -c "ss -nt ( dport ... )"` -> "syntax error near unexpected token `('" ; version quotée OK.
- L36 OUTDATED corrigé : "(retiré dans iproute2 7.3.0)" ajouté, l'option reste listée car encore présente sur les distributions actuelles. Preuve : `rg -c -i dccp misc/ss.c` : 20 @v7.2.0, 0 @v7.3.0 (tag du 2026-10-20) ; `ss -h` sur debian:13.1 (6.15.0) liste encore `-d, --dccp`.
- L68 IMPRECISE rejeté : `ss -s -t -a` n'ignore pas `-t -a`. Le résumé est global, mais la liste des sockets TCP est affichée ensuite. Preuve : `misc/ss.c:6161-6165@v7.3.0` (exit seulement si `do_default && argc == 0`) ; test debian:13.1 avec un `http.server` : résumé puis `LISTEN 0 5 0.0.0.0:http-alt`. Phrase ajoutée pour décrire ce que fait la commande (et que `-s` est vu plus bas).
- L95 IMPRECISE corrigé : familles `unix`, `vsock`, `tipc`, `xdp` ajoutées, titre "par types" -> "par famille". Preuve : `man/man8/ss.8:405@v7.3.0` ; `ss -h` 6.15.0 : `FAMILY := {inet|inet6|link|unix|netlink|vsock|tipc|xdp|help}`.
- L141 IMPRECISE corrigé : quotes parasites retirées, groupes réécrits comme dans le man (connected = tout sauf listening/closed, etc.), `bound-inactive` ajouté à la liste. Preuve : `man/man8/ss.8:447-469@v7.3.0`, `misc/ss.c:5843-5850@v7.3.0`. Présent depuis au moins iproute2 6.8.0 (`git show v6.8.0:misc/ss.c`).
- L191 IMPRECISE corrigé : `rttvar` = déviation moyenne du rtt. Preuve : `man/man8/ss.8:213@v7.3.0`.

## En plus

- L21 : "**toutes** les connexion" précisé "(hors sockets en écoute)", cohérent avec L47.
- L192 : `ptmu` -> `pmtu` (nom réel du champ, visible dans l'exemple de sortie de l'article).
- L190 : "round time trip" -> "RTT (round trip time)".
- L195 : "dman7.org" -> lien `https://man7.org/linux/man-pages/man8/ss.8.html` (200).

## Modernisation

- Familles `unix`, `vsock`, `tipc`, `xdp` : appliqué.

## Tests

- debian:13.1, iproute2 6.15.0 (ss -V). Source : `~/Documents/work/src/iproute2` tags v7.2.0, v7.3.0, v6.8.0.

## À signaler

- Intro "netstat déprécié" et ton "vous" laissés tels quels.
