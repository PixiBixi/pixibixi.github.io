---
article: docs/linux/bsd/wheel_group.md
checked: '2026-11-11'
commit: 1e0246a440536d5cc3a9e57384687d194f491592
sources: []
unpinned: 1
---

# docs/linux/bsd/wheel_group.md

## Findings

- L16 IMPRECISE corrigé : la commande `pw` est présentée comme propre à FreeBSD, avec la précision `-m` (ajoute sans écraser) vs `-M` (remplace), et ajout de l'équivalent OpenBSD `usermod -G wheel username`. Description du front matter passée de "sous BSD" à "sous FreeBSD ou OpenBSD". Preuve : man.freebsd.org pw(8), "-m ... allows the addition of existing users to a group without replacing the existing list of members" et "-M ... replace an existing membership list (in groupmod)" ; man.openbsd.org usermod(8), "-G Appends the user to the given groups in the /etc/group file".

## En plus

- L19 : "vous pourriez effectuer" devient "on peut effectuer" (règle du "on").

## Modernisation

- Aucune suggestion.

## Tests

- Aucun (pas de VM BSD), vérification sur les man pages officielles.

## À signaler

- NetBSD non ajouté : la sémantique de son `usermod -G` (ajout ou remplacement des groupes secondaires) n'a pas été vérifiée, le finding l'affirmait sans source.
