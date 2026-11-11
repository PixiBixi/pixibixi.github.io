---
article: docs/networking/proof_files.md
checked: '2026-11-10'
commit: 9ef78400fe8c52d02af2cee7f4d885c0c5978cf4
sources: []
unpinned: 7
---

# docs/networking/proof_files.md

## Findings

- L86 ERROR corrigé : `-t` décrit comme une durée en secondes (exemple passé à `-t 10`). Preuve : `iperf --help` (iperf 2.2.0) "-t, --time # time in seconds to transmit for (default 10 secs)", idem iperf3 3.17.1.
- L88 ERROR corrigé : `-i` = intervalle des rapports intermédiaires. Preuve : `iperf --help` "-i, --interval # seconds between periodic bandwidth reports".
- L72 OUTDATED corrigé : 5001 pour iperf2, 5201 pour iperf3 ; exemple réécrit en iperf3 sur ping.online.net port 5200, la capture iperf2 est présentée comme historique avec sa commande d'origine. Preuve : esnet/iperf src/iperf.h:446 `#define PORT 5201` ; `nc -z ping.online.net` 5001 fermé, 5200/5201/5209 ouverts ; `iperf3 -c ping.online.net -p 5202 -t 3` -> 542 Mbits/s sender (5200 et 5201 répondaient "server is busy").
- L38 IMPRECISE corrigé en partie : Vultr (404) remplacé par <https://fra-de-ping.vultr.com/> (200, fichiers vultr.com.100MB.bin / 1000MB.bin), Hetzner (`speed.hetzner.de` ne résout plus) remplacé par <https://fsn1-speed.hetzner.com/> (200, 100MB.bin, 1GB.bin, 10GB.bin), Feral (404 sur test.bin) supprimé. Non vérifié : i3D (403) et Linode (403, aussi sur /speed-test/), probablement une protection anti-bot, laissés ; Tele2 (`speedtest.tele2.net` résout en 90.130.70.73 mais curl en timeout, 000), laissé.
- L65 IMPRECISE corrigé : SCTP réservé à iperf3 sous Linux et FreeBSD, avec la mention que iperf2 et iperf3 ne sont pas compatibles. Preuve : esnet/iperf docs/invoking.rst:302 "--sctp Use SCTP for tests rather than TCP (FreeBSD and Linux)" ; `iperf --help` 2.2.0 sans option SCTP.
- L87 IMPRECISE corrigé : `-r` séquentiel, `-d` simultané. Preuve : `iperf --help` 2.2.0 "-d, --dualtest Do a bidirectional test simultaneously", "-r, --tradeoff Do a ... test individually".
- L115 IMPRECISE corrigé : l'écart de 10 Mbps n'est plus présenté comme une perte quasi certaine, renvoi vers UDP (`Lost/Total`) ou `Retr`. Preuve : test iperf3 en loopback, la sortie UDP affiche `0/764 (0%)` et la sortie TCP la colonne `Retr`.

## En plus

- Aucun.

## Modernisation

- iperf3 (port 5201, `-P`, `-R`) : appliqué dans l'exemple principal.
- `iperf3 -c ping.online.net -p 5200` : appliqué, avec le conseil de changer de port si le serveur est occupé.

## Tests

- OrbStack alpine:3.20 : iperf 2.2.0 et iperf3 3.17.1 (`--help`, test réel vers ping.online.net, test loopback UDP/TCP).
- curl/dig/nc depuis le Mac pour les liens et ports.

## À signaler

- Le paragraphe sur le script "disponible sur Dropbox" (L54-56) ne donne aucun lien : à compléter ou supprimer.
- La capture `_img/iperf_client.webp` reste une sortie iperf2 : une capture iperf3 fraîche serait plus cohérente avec le nouvel exemple.
- Linode, i3D et Tele2 restent dans le tableau sans confirmation qu'ils fonctionnent.
