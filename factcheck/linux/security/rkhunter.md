---
article: docs/linux/security/rkhunter.md
checked: '2026-11-10'
commit: 9197932b0151b9cb559ca3f8db60e82f6619095f
sources: []
unpinned: 3
---

# docs/linux/security/rkhunter.md

## Findings

- L10 ERROR corrigé : plus de "base de données en ligne", l'article explique que la référence est la baseline locale prise par `--propupd`, que `--update` ne met à jour que les fichiers de données, et ajoute le piège du `--propupd` sur machine compromise. Preuve : rkhunter `files/rkhunter.8` @016a779 (origin/master), L70-74 ("compare various current file properties ... against those it has previously stored"), L52-55 (`--update` = "later version of any of its text data files"), L91-95 (WARNING propupd).
- L9 OUTDATED corrigé : ajout d'un paragraphe sur le projet quasi à l'arrêt et la recommandation AIDE / IDS à baseline hors machine. Preuve : clone rkhunter, tag version-1.4.6 daté 2018-02-19, master 016a779 2018-02-24, develop 866f69c 2022-10-24 ; Debian 12 installe toujours 1.4.6 (test conteneur).
- L10 IMPRECISE corrigé : un seul algo à la fois, SHA256 par défaut, réglable par `HASH_CMD` / `--hash`, MD5/SHA1 avec prelink. Preuve : rkhunter.8 L244-258 ("The default is SHA256", "Systems using prelinking must use either MD5, SHA1 or NONE") ; `/etc/rkhunter.conf` Debian 12 : `#HASH_CMD=SHA256`.

## En plus

- Ajout d'un bloc avec le cycle `--propupd` / `--update` / `--check --sk --rwo` (testé), la page s'appelle "Installer et configurer" et n'avait aucune commande.
- Description du front matter alignée (baseline locale au lieu de "hashs").

## Modernisation

- Appliqué : mention d'AIDE ou d'un IDS à baseline hors machine.

## Tests

- Conteneur debian:12.11, `apt-get install rkhunter` : `rkhunter --version` = 1.4.6, `--propupd` OK, `--check --sk --rwo` OK. `tested_with: "rkhunter 1.4.6 (Debian 12)"` ajouté.

## À signaler

- Les 2 liens externes (wiki.debian-fr.xyz, grepitout.com) n'ont pas été vérifiés.
