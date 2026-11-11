---
article: docs/databases/mysql/db_mysql.md
checked: '2026-11-10'
commit: f49208c8523443b660073e1616a4e652a66973a5
sources: []
unpinned: 2
---

# docs/databases/mysql/db_mysql.md

## Findings

- L17 ERROR corrigé : `mysql_install_db` remplacé par `mysqld --initialize-insecure --user=mysql` pour MySQL 8.0+ et `mariadb-install-db --user=mysql --datadir=/var/lib/mysql` pour MariaDB ; suppression des `mkdir`/`chown` (le pré-création de `mysql/` fait échouer l'initialisation). Preuve : `git ls-tree -r` mysql-server : `client/mysql_install_db.cc` présent @mysql-5.7.44, absent @mysql-8.0.40 et @mysql-8.4.3 ; test Docker mysql:8.4.3 : datadir contenant `mysql/` donne `[MY-013236] The designated data directory /var/lib/mysql/ is unusable`, datadir vide initialise OK ; `command -v mysql_install_db` absent dans mysql:8.4.3.
- L9 IMPRECISE corrigé : ajout que seules les tables système reviennent, les bases applicatives sont perdues et seul un backup les restaure. Preuve : comportement de l'initialisation (datadir neuf), constaté dans le test ci-dessus.

## En plus

- Ajout de l'avertissement sur `--initialize-insecure` (root sans mot de passe, warning `[MY-010453]` vu dans le test) et de l'alternative `--initialize`.
- `systemctl stop` avant l'initialisation.

## Modernisation

- Les deux suggestions (MySQL 8 `--initialize-insecure`, MariaDB `mariadb-install-db`) appliquées.
- `tested_with` ajouté : MySQL 8.4.3, MariaDB 11.4.4 (testés dans cette passe).

## Tests

- Docker mysql:8.4.3 (`mysqld --initialize-insecure`, avec et sans sous-dossier `mysql/`), mariadb:11.4.4 (`mariadb-install-db`, OK ; `mysql_install_db` absent du PATH). Conteneurs `--rm`.

## À signaler

- Le mot de passe temporaire de `--initialize` écrit dans le log d'erreur : affirmé d'après la doc MySQL connue, pas testé dans cette passe.
- La première phrase garde le « vous » de l'auteur.
