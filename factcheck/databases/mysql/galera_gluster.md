---
article: docs/databases/mysql/galera_gluster.md
checked: '2026-11-11'
commit: fc660e58526443f644f2abe5b9b8aa9f8c30e693
sources: []
unpinned: 5
---

# docs/databases/mysql/galera_gluster.md

## Findings

- L34 IMPRECISE corrigé : `4567 | TCP (+UDP en multicast)`. Preuve : codership/documentation `galeracluster/source/documentation/firewall-settings.rst:60` "Multicast replication uses both TCP and UDP transport on this port."
- L39 IMPRECISE corrigé : phrase ajoutée en intro (tout vise MariaDB, MySQL Community n'embarque pas Galera, côté MySQL c'est Percona XtraDB Cluster), description front matter passée de "Galera MySQL" à "MariaDB Galera", tag `MariaDB` à la place de `MySQL` (MySQL reste hérité de `.meta.yml`). Preuve : le cluster de test tourne avec `galera_new_cluster` et les paquets MariaDB ; MySQL Community n'a pas de provider wsrep (non revérifié dans les sources MySQL).
- L49 IMPRECISE rejeté : `/usr/lib/libgalera_smm.so` est le vrai fichier sur Debian et sur les paquets MariaDB ; `/usr/lib/galera/libgalera_smm.so` n'est qu'un lien vers lui. L'article est en layout Debian (`/etc/mysql/mariadb.conf.d`). Preuve : `dpkg -c galera-4_26.4.23-0+deb13u1` et `...+deb12u1` : `./usr/lib/libgalera_smm.so` fichier, `./usr/lib/galera/libgalera_smm.so -> ../libgalera_smm.so` ; même chose dans mariadb:11.8.3 (galera-4 26.4.23-ubu2404).
- L105 (L109 actuelle) IMPRECISE corrigé : section réécrite. Après arrêt propre, le dernier nœud arrêté a `safe_to_bootstrap: 1` et se bootstrappe directement ; le cas "tous à 0" est celui d'un crash. Titre de section renommé "Redémarrer tout le cluster - safe_to_bootstrap" (aucun lien entrant vers l'ancienne ancre). Preuve : test 3 nœuds, `docker stop` g2, g3 puis g1 : g1 `seqno 8 safe_to_bootstrap: 1`, g2 `6 / 0`, g3 `7 / 0`.
- L110 (L113 actuelle) IMPRECISE corrigé : après crash, `seqno: -1` partout ; ajout de `sudo -u mysql mariadbd --wsrep-recover | grep 'Recovered position'` sur chaque nœud, et on ne force `safe_to_bootstrap` que sur le seqno le plus haut (avertissement sur la perte de transactions). Preuve : test `docker kill` des 3 nœuds : `seqno: -1`, `safe_to_bootstrap: 0` partout ; `mariadbd --wsrep-recover` donne `Recovered position: 6e66d976-...:11` ; `mariadbd --wsrep-new-cluster` sur un nœud à 0 refuse avec "It may not be safe to bootstrap the cluster from this node".

## En plus

- `tested_with: MariaDB 11.8.3 (Galera 26.4.23)` ajouté (config de l'article utilisée telle quelle, SST rsync, 3 nœuds, réplication vérifiée).

## Modernisation

- `wsrep_sst_method=mariabackup` : non appliqué, demande un user SST et je ne l'ai pas testé.
- Préciser MariaDB vs Percona XtraDB Cluster : appliqué (voir L39).

## Tests

- Docker mariadb:11.8.3 (Ubuntu 24.04, galera-4 26.4.23), cluster 3 nœuds sur un réseau dédié : bootstrap, join SST rsync, arrêt propre, kill, `--wsrep-recover`, refus de bootstrap. debian:trixie-20251020 et debian:bookworm-20241016 pour le contenu du paquet galera-4.

## À signaler

- Le fichier s'appelle `galera_gluster.md` mais ne parle pas de GlusterFS, et vit dans `databases/mysql/`. Renommage ou déplacement vers une section MariaDB à décider par l'auteur (redirect dans `properdocs.yml` nécessaire).
- "MyISAM est encore expérimental" et "Tout est re-importé depuis le nœud primary actuel via SST" (en Galera, on parle de donneur) non vérifiés, laissés tels quels.
- Le reset d'un nœud (`rm -rf /var/lib/mysql && systemctl start mariadb`) suppose le service déjà arrêté ; non testé sur un vrai systemd.
