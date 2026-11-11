---
article: docs/linux/security/whitelist_ip.md
checked: '2026-11-11'
commit: 2b95a4506718d91c49678ae2b70467c185425251
sources: []
unpinned: 5
---

# docs/linux/security/whitelist_ip.md

## Findings

- L51 ERROR corrigé : ajout d'un bloc `ipset add whitelist <ip>` + `ipset list` avant les règles, avec l'avertissement que le DROP bloque tout le monde sinon ; ajout d'un paragraphe sur `-A` (fin de chaîne) vs une règle ACCEPT plus large, avec `iptables -S INPUT` / `-I INPUT <n>`. Preuve : test Debian 13 : `ipset add whitelist 203.0.113.10` puis règle `-m set` acceptée, `iptables -S INPUT` montre l'ordre.
- L70 OUTDATED corrigé : plugin tiers remplacé par le paquet Debian `ipset-persistent` (ajouté à l'apt-get des pré-requis), avec mise en garde : le plugin tiers porte le même nom de fichier `10-ipset` et sauve dans `/etc/iptables/rules.ipset`. Preuve : test Debian 13 : `dpkg -L ipset-persistent` -> `plugins.d/10-ipset` et `40-ipset`, `netfilter-persistent save` -> `/etc/iptables/ipsets`, `rules.v4`, `rules.v6` ; `apt-cache policy` : 1.0.15 sur Debian 11, 1.0.20 sur 12, 1.0.23 sur 13 (donc depuis bullseye, pas seulement bookworm comme le disait le finding) ; clone freeyoung/netfilter-persistent-plugin-ipset 10-ipset:26 `ipset save > /etc/iptables/rules.ipset`.
- L21 IMPRECISE corrigé : `xt_conntrack` remplacé par `xt_set` (match `-m set`). Preuve : iptables-extensions(8), extension `set` (connu, non relu dans une source locale ; le conteneur OrbStack n'expose pas les modules dans /proc/modules, donc pas de preuve runtime).
- L24 IMPRECISE non vérifié : le warning (dégradation avec beaucoup de règles) est plausible (évaluation linéaire des chaînes) mais non chiffré ; laissé tel quel. Rien cherché de plus qu'une source primaire, aucune trouvée.
- L41 IMPRECISE corrigé : `hashsize 4096` retiré, phrase ajoutée : taille initiale 1024 par défaut, grossit seule, limite réelle `maxelem` 65536. Preuve : test Debian 13 ipset 7.22 : `ipset list whitelist` -> `Header: family inet hashsize 1024 maxelem 65536`.

## En plus

- `/etc/init.d/netfilter-persistent save` remplacé par `netfilter-persistent save` (testé, fonctionne).
- Espace insécable parasite supprimé de l'ancien bloc `cd ~` (bloc supprimé depuis).

## Modernisation

- ipset-persistent : appliqué.
- nftables sets : non appliqué (changerait la nature du tutoriel ; non testé). Note : le test confirme `iptables v1.8.11 (nf_tables)`, iptables est bien le front nft sur Debian 13.
- DROP vs REJECT / -I : -I mentionné, DROP gardé.

## Tests

- Conteneurs debian:13.1 (ipset 7.22, iptables 1.8.11 nf_tables, ipset-persistent 1.0.23, --cap-add NET_ADMIN), debian:12.12 et debian:11.11 (apt-cache policy seulement).

## À signaler

- Le titre et le texte parlent de « whitelist » ; les conventions inclusives de l'auteur préfèrent allowlist (la description le fait déjà). Non modifié : renommer le titre change l'URL/le sens, à décider.
