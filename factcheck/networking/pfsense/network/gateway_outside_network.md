---
article: docs/networking/pfsense/network/gateway_outside_network.md
checked: '2026-11-11'
commit: 5fadb95caa22a3365f3af686af13fd98e9c1dccd
sources:
- repo: pfsense-pfsense
  path: src/etc/inc/filter.inc
  lines: 954-958
  ref: origin/master
  commit: 9363ac5b8651a1c7a333180425ce7719070f95f9
unpinned: 1
---

# docs/networking/pfsense/network/gateway_outside_network.md

## Findings

- L27 ERROR corrigé : ajout d'un avertissement (plus aucun filtrage tant que pf est désactivé) et d'une étape 4 `pfctl -e` une fois la gateway appliquée, avec la mention que pfSense réactive pf au rechargement du filtrage mais qu'on ne compte pas dessus. Preuve : pfsense/pfsense src/etc/inc/filter.inc:954-958 @origin/master, `filter_configure_sync` exécute `/sbin/pfctl -e` si `system/disablefilter` n'est pas coché (clone local ~/Documents/work/src/pfsense-pfsense, créé pour cette passe).
- L22 IMPRECISE rejeté en partie : l'article dit déjà d'adapter adresse et interface. Ajouté seulement que `vmx0` est la carte VMXNET3 d'une VM ESXi. La gateway 62.210.0.1 d'Online/Scaleway Dedibox est non vérifiée (aucune source primaire consultée), laissée telle quelle. Syntaxe `route add -net x/32 -iface` FreeBSD non testée (pas de FreeBSD local).

## En plus

- L33 : artefact de conversion `'[+ Add']` remplacé par `+ Add`.

## Modernisation

- Interface en /32 ou case « Use non-local gateway » : la case est déjà décrite à l'étape 3. Pas appliqué le /32, non vérifié.

## Tests

- Aucun test exécutable (pfSense/FreeBSD non disponible). Lecture de source pfSense master.

## À signaler

- Le tutoiement/vouvoiement (« vous », « rentrez ») n'est pas réécrit en « on » : hors périmètre fact-check.
