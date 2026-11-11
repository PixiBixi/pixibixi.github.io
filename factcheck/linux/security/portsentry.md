---
article: docs/linux/security/portsentry.md
checked: '2026-11-11'
commit: ae8ac200489fea9ad88ed4783fe9b06a2a8dfa80
sources: []
unpinned: 3
---

# docs/linux/security/portsentry.md

## Findings

- L37 OUTDATED corrigé : ajout d'un paragraphe après l'installation qui borne le tuto à portsentry 1.2 (bookworm, trixie) et résume ce qui change en 2.x (plus de /etc/default/portsentry ni de modes tcp/atcp, stealth libpcap par défaut). Le reste du tuto (écrit pour 1.2) est conservé. Preuve : debian:trixie-20251020 -> portsentry 1.2-16, /etc/default/portsentry avec TCP_MODE="tcp" UDP_MODE="udp" ; debian:sid-20251020 -> 2.0.7-1, "/etc/default/portsentry: No such file or directory", /etc/portsentry contient portsentry.conf et portsentry.ignore ; debian:bookworm-20251020 -> 1.2-14+b1. Mention "stealth par défaut" reprise du fact-check (docs/Manual.md@v2.0.7), non relue.
- L88 IMPRECISE corrigé : "Ubuntu 19.04" remplacé par "Ubuntu 20.04". Preuve : ubuntu:20.04 `apt-cache policy ipset-persistent` -> 1.0.14ubuntu1 ; Launchpad disco/+package/ipset-persistent : "Not published at present", et la page source iptables-persistent ne liste plus disco. Debian 10 non retesté en conteneur, conservé sur la foi de sources.debian.org cité par le fact-check (1.0.11+deb10u1 = buster).
- L155 IMPRECISE corrigé : "autour de la ligne 269" remplacé par la ligne `#KILL_RUN_CMD=` à remplacer, avec le numéro réel. Preuve : trixie 1.2-16 `grep -n` -> 268:#KILL_RUN_CMD="/some/path/here/script $TARGET$ $PORT$ $MODE$" ; sid 2.0.7 -> ligne 227.

## En plus

- L68 ERROR corrigé : le `--log-prefix Portsentry: dropping:` non quoté cassait la seconde commande iptables (la règle LOG n'était jamais posée). Ajout de quotes simples autour du préfixe. Preuve : portsentry 1.2-16 portsentry_io.c:562 `killStatus = system (commandStringFinal);` (donc découpage shell) ; test sur trixie avec NET_ADMIN : version non quotée -> "Bad argument `dropping:'" rc=2, version quotée -> rc=0 et règle`--log-prefix "Portsentry: dropping: "` présente. Le parseur de conf (ConfigTokenRetrieve, portsentry_io.c) coupe au prochain `"` : les quotes simples passent.

## Modernisation

- portsentry 2.0 : appliqué en note de périmètre seulement, pas de réécriture du tuto pour la 2.x (non testée en fonctionnement).
- nftables natif à la place d'iptables + ipset : non appliqué, ce serait une réécriture de la section Bonus ; à décider par l'auteur.

## Tests

- Docker : debian:trixie-20251020 (portsentry 1.2-16, iptables, sources apt), debian:sid-20251020 (portsentry 2.0.7-1), debian:bookworm-20251020 (1.2-14+b1, ipset-persistent 1.0.20), ubuntu:20.04 (ipset-persistent 1.0.14ubuntu1).

## À signaler

- Le tuto ne fonctionnera plus à partir de Debian 14 (forky) : prévoir une section 2.x ou une réécriture nftables.
