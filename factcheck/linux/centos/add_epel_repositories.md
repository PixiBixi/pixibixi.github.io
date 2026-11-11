---
article: docs/linux/centos/add_epel_repositories.md
checked: '2026-11-11'
commit: 3ce8fef018eea79b9ac70880553c96d0977a1036
sources: []
unpinned: 4
---

# docs/linux/centos/add_epel_repositories.md

## Findings

- L11 IMPRECISE corrigé : `tmux` et `nginx` retirés des exemples EPEL (remplacés par `ncdu`, `screen`), précision que `ansible-core` est dans AppStream et seul `ansible` complet vient d'EPEL. Même correction dans l'exemple `includepkgs` (tmux -> ncdu). Preuve : `dnf repoquery --qf "%{name} %{repoid}"` sur rockylinux/rockylinux:9.6 + epel-release-9-10 : tmux baseos, nginx appstream, ansible-core appstream, ansible/htop/fail2ban/ncdu/screen epel.
- L59 IMPRECISE corrigé : epel-next limité à Stream 9 (Stream 8 EOL), et précisé qu'il n'existe pas sur Stream 10. Preuve : quay.io/centos/centos:stream10 + epel-release-10-9.el10s : `dnf list --available epel-next-release` -> "No matching Packages" ; stream9 + epel-release-9-7 : `epel-next-release 9-11.el9` disponible.
- L76 IMPRECISE corrigé : phrase réécrite, la politique EPEL interdit de remplacer un paquet de base ; le garde-fou est justifié par la taille du catalogue. Preuve : pagure.io/epel (clone ~/Documents/work/src/epel-docs, commit 0b1306c du 2025-11-07, avant migration vers forge.fedoraproject.org) modules/ROOT/pages/epel-policy.adoc:46-48 "packages from EPEL should never replace packages from the target base distribution", et L255 "EPEL packages must not conflict with packages in the target base of RHEL".
- L95 IMPRECISE corrigé : message yum réel pour CentOS 7, message dnf rattaché à CentOS 8, cause = `mirrorlist.centos.org` mort, pointeur vers vault.centos.org. Preuve : centos:7 `yum makecache` -> "Cannot find a valid baseurl for repo: base/7/aarch64" ; centos:8 `dnf makecache` -> "Error: Failed to download metadata for repo 'appstream'" ; vault.centos.org 7.9.2009 et 8.5.2111 repomd.xml en HTTP 200.

## En plus

- L95 corrigé : "les miroirs ne servent plus ces dépôts" était faux pour EPEL 7 : le metalink EPEL 7 répond encore (centos:7 + epel-release-7-14 depuis l'archive, `yum makecache` OK, 13188 paquets listés). Ce qui casse sur CentOS 7 est le dépôt base. Phrase réécrite en conséquence.

## Modernisation

- `crb enable` appliqué : ajouté après le bloc config-manager. Testé : Rocky 9 -> "CRB repo is enabled and named: crb", Rocky 8 (epel-release-8-22) -> "named: powertools".
- CentOS 8 EOL fin 2021 et Stream 8 EOL mai 2024 : intégré dans L59 et L95 (dates issues du fact-check, non revérifiées en source primaire ; le comportement post-EOL de CentOS 8 est testé).

## Tests

- Docker (OrbStack) : rockylinux/rockylinux:9.6, rockylinux/rockylinux:8.10, quay.io/centos/centos:stream9, quay.io/centos/centos:stream10 (dnf 4.20.0, `dnf config-manager --set-enabled crb` OK, clé RPM-GPG-KEY-EPEL-10 posée), centos:7, centos:8. Tous en aarch64.

## À signaler

- Rien.
