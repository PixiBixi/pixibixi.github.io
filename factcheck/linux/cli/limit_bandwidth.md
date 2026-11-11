---
article: docs/linux/cli/limit_bandwidth.md
checked: '2026-11-10'
commit: a14c04baa1f74bb2ef7aeb4f1d2edd928e528eae
sources:
- repo: null
  path: tc/q_tbf.c
  lines: 179,190
  ref: v7.3.0-18
  commit: null
- repo: wondershaper
  path: wondershaper
  lines: 43-69
  ref: 98792b5
  commit: 98792b55c2ebf4ab4cafffb0780e0c4185fdc03d
unpinned: 4
---

# docs/linux/cli/limit_bandwidth.md

## Findings

- L66 ERROR corrigé : la commande tbf devient `tc qdisc add dev eth0 root tbf rate 10mbit burst 32kbit latency 400ms`, avec une phrase qui dit que burst et latency/limit sont obligatoires. Preuve : test debian:bookworm (iproute2 6.1.0), la commande d'origine sort `tbf: the "burst" parameter is mandatory.` / `either "limit" or "latency" is required.` rc=1, la nouvelle passe (rc=0) ; iproute2 tc/q_tbf.c:179,190 @v7.3.0-18.
- L82 ERROR corrigé : la section wondershaper explique les deux versions et passe à la syntaxe upstream `wondershaper -a eth0 -d 1024 -u 1024`, avec `wondershaper -c -a eth0` pour retirer. Preuve : magnific0/wondershaper wondershaper:43-69 @98792b5 ; test : la 1.1a-10.1 de bookworm sort `Error: Specified qdisc kind is unknown` (elle utilise `cbq`, wondershaper:81) sur un kernel 7.0, rc=0 malgré l'échec ; l'upstream pose bien htb+sfq sur eth0 (le download demande ifb0, absent dans le conteneur). Kernel : CBQ retiré par le commit 051d44209842 (cycle 6.3, recherche web) ; iproute2 a retiré CBQ dans 07ba0af3 (v6.6.0). Paquet absent de trixie (`apt-cache policy wondershaper` vide sur debian:trixie).
- L28 IMPRECISE corrigé : ajout d'une section "Retirer les règles" (`tc qdisc show` / `tc qdisc del dev eth0 root`) et d'un avertissement sur la session SSH. Preuve : test bookworm, après `del` la qdisc revient à `noqueue`.
- L40 IMPRECISE corrigé : "delta de 10ms selon 25% du ping-1" remplacé par jitter 10ms et corrélation de 25% avec le délai précédent. Preuve : iproute2 man/man8/tc-netem.8:86-93 et 270-283 @v7.3.0-18.
- L49 IMPRECISE corrigé : précisé que `change` remplace toute la config netem, avec une commande combinée `replace ... delay ... loss 2%`. Preuve : test bookworm, `delay 100ms 10ms 25%` puis `change ... loss 2%` donne `qdisc netem ... loss 2%` (delay disparu) ; `replace` combiné donne `delay 100ms 10ms 25% loss 2% rate 10Mbit`.
- L86 IMPRECISE corrigé : "1mbps" devient "environ 1 Mbit/s (les débits sont en Kbps)". Preuve : wondershaper upstream:50-51.

## En plus

- L59 : "corrélés avec les 33% des derniers paquets" était faux, réécrit en corrélation de 33% sur la perte du paquet précédent (pertes en rafales). Preuve : tc/q_netem.c:31 `loss random PERCENT [ CORRELATION ]`, :256 `loss_corr`.
- Ajout `tested_with: iproute2 6.1` (version testée dans le conteneur).

## Modernisation

- `netem ... rate 10mbit` : appliqué (exemple combiné), testé OK.
- `tc qdisc replace` idempotent : appliqué pour la commande combinée ; test `change` sans qdisc existante = `Error: Qdisc not found` rc=2, `replace` crée.
- systemd-run IPEgressBandwidthMax : non appliqué, je ne connais pas de telle propriété systemd et aucun clone systemd local pour vérifier.

## Tests

- OrbStack, kernel 7.0.14-orbstack, debian:bookworm-20251020 (iproute2 6.1.0, wondershaper 1.1a-10.1), debian:trixie-20251020 (apt-cache), wondershaper upstream @98792b5 lancé dans bookworm.

## À signaler

- Le bridage download de wondershaper upstream n'a pas pu être testé (module ifb absent du conteneur).
