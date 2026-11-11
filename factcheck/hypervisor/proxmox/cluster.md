---
article: docs/hypervisor/proxmox/cluster.md
checked: '2026-11-11'
commit: bc52f844bb8f0e5aa59b07c3bbf3cde5ab5ba576
sources: []
unpinned: 4
---

# docs/hypervisor/proxmox/cluster.md

Sources : clone git.proxmox.com pve-docs @e67813a (2026-11-07) et pve-cluster @f79e17b (2026-11-04), tous deux ajoutés dans ~/Documents/work/src.

## Findings

- L28 ERROR corrigé : priorités inversées (link0 2.5G priority=20, link1 1G priority=15) et phrase réécrite "la priorité la plus haute gagne". Preuve : pve-docs pvecm.adoc:951-954 "--link0 10.10.10.1,priority=15 --link1 10.20.20.1,priority=20 ... This would cause 'link1' to be used first, since it has the higher priority"
- L28 (même finding) corrigé : IP du link1 192.168.1.101 -> 192.168.0.101, cohérente avec le 192.168.0.0/24 de l'intro. Preuve : L12 de l'article
- L44 IMPRECISE corrigé : ajout que `type=insecure` fait transiter la RAM de la VM en clair, à réserver à un réseau maîtrisé, `secure` étant le défaut. La syntaxe `type=insecure,network=` est valide. Preuve : pve-cluster src/PVE/DataCenterConfig.pm:83-100 (type default_key, enum secure/insecure, default secure) ; pve-docs pvecm.adoc:1594-1600
- L59 IMPRECISE corrigé : `rm /etc/corosync/*` -> `rm -r /etc/corosync/*`, ordre aligné sur la doc, ajout de `rm /var/lib/corosync/*`, avertissement "not the recommended method" (stockage partagé, VMID), mention de `pvecm delnode` comme voie recommandée pour retirer un node, nettoyage de /etc/pve/nodes/<autre_node> et authorized_keys. Preuve : pve-docs pvecm.adoc:484-572 (procédure "Separate a Node Without Reinstalling", CAUTION L488) et :424-436 (power off avant delnode)

## En plus

- Aucun

## Modernisation

- `qm migrate --migration_network` et datacenter.cfg : déjà les bonnes voies, rien à changer (pvecm.adoc:1667-1680)
- pvecm delnode d'abord : appliqué (une phrase en tête de section)

## Tests

- Aucun test exécuté (pas de Proxmox disponible) ; vérification sur le source de la doc et du schéma datacenter.cfg uniquement
- markdownlint-cli2 0.23.0, check_code_blocks.py : OK

## À signaler

- L'échec de `rm /etc/corosync/*` sans -r vient du sous-dossier uidgid.d livré par le paquet corosync Debian : non vérifié sur un node réel, la doc officielle utilise -r de toute façon
- Article court en "nous/vous" plutôt qu'en "on" : style non retouché hors des phrases corrigées
