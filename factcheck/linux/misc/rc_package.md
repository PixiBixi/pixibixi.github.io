---
article: docs/linux/misc/rc_package.md
checked: '2026-11-11'
commit: c7a6dbca745172dea4d2ccb0a9e02848e3848255
sources: []
unpinned: 1
---

# docs/linux/misc/rc_package.md

## Findings

- L18 IMPRECISE corrigé : la commande passe à `dpkg-query -W -f='${db:Status-Abbrev} ${Package}\n' | awk '$1 == "rc" {print $2}' | xargs -r sudo dpkg --purge`, avec l'explication et la raison de ne pas parser `dpkg --list`. Preuve : dpkg-query(1) cité par le fact-check ("not easily machine-readable") ; test : les deux commandes listent les mêmes paquets rc et la nouvelle purge tout (compteur rc à 0). Nuance : sur dpkg 1.22.22 je n'ai pas obtenu de troncature en pipe, l'ancienne commande marchait dans mon test.

## En plus

- Rien.

## Modernisation

- Appliqué : `sudo` (dpkg --purge demande root), `xargs -r`.
- Appliqué : `sudo apt purge '~c'` (pattern apt). Testé OK sur apt 3.0.3.
- Rejeté : `apt autoremove --purge` ne purge pas les paquets déjà en rc (testé : compteur rc reste à 1) ; l'article le dit explicitement.

## Tests

- Docker debian:13.1, dpkg 1.22.22, apt 3.0.3 : paquets logrotate/iproute2 installés puis removed pour créer des rc, comparaison cut vs dpkg-query, purge, apt autoremove --purge, apt purge '~c'.

## À signaler

- Version minimale d'apt pour les patterns (`~c`) non vérifiée ici (je l'écris "apt récent").
