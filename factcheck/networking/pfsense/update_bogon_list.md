---
article: docs/networking/pfsense/update_bogon_list.md
checked: '2026-11-11'
commit: 3f0bbb18c954be3cc60773c73e7ed63bb9f65933
sources: []
unpinned: 1
---

# docs/networking/pfsense/update_bogon_list.md

## Findings

- L9 IMPRECISE corrigé (chemin confirmé) : Diagnostics > Tables existe toujours, la table bogons (ou bogonsv6) affiche un bouton **Update** ; précisé le nom du bouton et bogonsv6. Preuve : pfsense `src/usr/local/www/diag_tables.php:31` (`$pgtitle = Diagnostics, Tables`), `:61` (bogons/bogonsv6), `:150-153` (bouton `Download` libellé `Update`), `:92` (lance `/etc/rc.update_bogons.sh now`) @ origin/master.

## En plus

- Aucune.

## Modernisation

- Appliqué : commande shell `/etc/rc.update_bogons.sh now` (sans argument, sommeil aléatoire jusqu'à 86400 s : `rc.update_bogons.sh:71-75`, `jot -r 1 86400`), et la fréquence automatique dans System > Advanced > Firewall & NAT, section Bogon Networks, Update Frequency Monthly (défaut) / Weekly / Daily : `system_advanced_firewall.php:354-364` @ origin/master. Description du front matter complétée ("ou en shell").

## Tests

- Lecture du source pfSense (clone ~/Documents/work/src/pfsense-pfsense, origin/master), pas d'instance testée.

## À signaler

- Le titre "via l'interface graphique" reste, alors que l'article couvre aussi le shell.
