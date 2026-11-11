---
article: docs/linux/security/ipset.md
checked: '2026-11-10'
commit: 4a8cd06309a27d4c00ce694082d85e90c4f3bb0e
sources: []
unpinned: 3
---

# docs/linux/security/ipset.md

## Findings

- L77 ERROR corrigé : un `ipset add` sur une entrée existante échoue, on indique l'erreur et on ajoute `ipset -exist add ... timeout 600` pour reposer le timeout. Preuve : conteneur debian:trixie-20251020 privilégié, ipset v7.22 : 2e `add` -> `Element cannot be added to the set: it's already added` rc=1, `-exist add ... timeout 900` rc=0 et le listing affiche `timeout 900`.
- L158 (L162) IMPRECISE corrigé : ajout de `nft add chain inet filter input '{ type filter hook input priority 0; }'` avant la règle. Preuve : même conteneur, nftables v1.1.3 : sans chaîne `Error: Could not process rule: No such file or directory` rc=1 ; avec la chaîne, toute la séquence de l'article passe rc=0.
- L169 IMPRECISE corrigé : `ipset-translate` affiche seulement les commandes nft ; on relit puis on pipe dans `nft -f -`. Preuve : même conteneur : sortie `add table inet global` / `add set inet global ...` sur stdout, `nft list tables` inchangé ; après `| nft -f -` (rc=0) la table `inet global` apparaît.

## En plus

- Aucun.

## Modernisation

- Appliquée : pipe de `ipset-translate` vers `nft -f -` (même chose que le finding L169).

## Tests

- debian:trixie-20251020 (--privileged, --rm), ipset v7.22, nftables v1.1.3.

## À signaler

- `ipset-translate` crée ses sets dans une table `inet global`, pas dans `inet filter` comme l'exemple nft juste au-dessus : à savoir si on mélange les deux.
