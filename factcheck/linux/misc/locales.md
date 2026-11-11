---
article: docs/linux/misc/locales.md
checked: '2026-11-11'
commit: 559412fa9e150ba32b56b482891618fb01954f86
sources: []
unpinned: 1
---

# docs/linux/misc/locales.md

## Findings

- L15 IMPRECISE corrigé : précisé "paquet Debian/Ubuntu", ajouté un paragraphe : les man pages des langues non cochées sont supprimées aussi (défaut), la purge se relance après chaque `apt install`. Preuve : debian:13.1, localepurge 0.7.3.11 : `/etc/locale.nopurge` contient `MANDELETE` et `USE_DPKG` par défaut, `/etc/apt/apt.conf.d/99-localepurge` a un `DPkg::Post-Invoke` qui lance `/usr/sbin/localepurge`.

## En plus

- Ajouté un avertissement : avec les options par défaut (aucune locale cochée, `NEEDSCONFIGFIRST`), le filtre dpkg `/etc/dpkg/dpkg.cfg.d/50localepurge` (`path-exclude=/usr/share/locale/*`, `use-dpkg-feature: true`) s'applique déjà : les paquets installés ensuite arrivent sans aucune traduction. Preuve : après `apt install localepurge` puis `apt install wget`, 0 fichier `wget.mo` ; sans localepurge, 41.

## Modernisation

- Aucune suggestion.

## Tests

- Docker `debian:13.1`, localepurge 0.7.3.11, comparaison avec/sans localepurge sur l'install de wget.

## À signaler

- La phrase "Laissez les options par défaut pour le moment" est conservée mais l'avertissement ajouté invite à configurer tout de suite : l'auteur peut préférer la supprimer.
