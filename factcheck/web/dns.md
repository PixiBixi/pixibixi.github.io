---
article: docs/web/dns.md
checked: '2026-11-11'
commit: c95de7e00cace00d8a0d63ec95b33e3aceb92e24
sources:
- repo: bind9
  path: meson.build
  lines: 317-318
  ref: origin/main
  commit: b58e0dcf69709d31b0051c675ff98e9e196b99d2
- repo: bind9
  path: doc/arm/reference.rst
  lines: 2594-2597
  ref: origin/main
  commit: b58e0dcf69709d31b0051c675ff98e9e196b99d2
- repo: bind9
  path: lib/isccfg/namedconf.c
  lines: '948'
  ref: origin/main
  commit: b58e0dcf69709d31b0051c675ff98e9e196b99d2
unpinned: 7
---

# docs/web/dns.md

## Findings

- L84 ERROR corrigé : `8.8.8.8; 8.8.4.4;` retirés de `allow-transfer`, commentaire "seulement à eux" et un paragraphe sur le risque AXFR. Preuve : reverse DNS des IP restantes = `ns6-axfr.gandi.net`, `ns.kimsufi.com`, `dana.ns.cloudflare.com`, `woz.ns.cloudflare.com` (vrais secondaires) ; 8.8.8.8/8.8.4.4 sont Google Public DNS, un résolveur.
- L18 IMPRECISE corrigé : `x.dns.fr` -> `d.nic.fr`, `f.ext.nic.fr`, `g.ext.nic.fr`. Preuve : `dig +short NS fr.` le 2026-11-08.
- L28 IMPRECISE corrigé : paragraphe réécrit : un résolveur local sort le résolveur du FAI de la boucle, mais les requêtes partent en clair ; la falsification est couverte par DNSSEC (`dnssec-validation auto`, défaut), l'espionnage par DoT/DoH. Preuve : `named -C` sur debian:13.1 (BIND 9.20.30) -> `dnssec-validation auto;` ; `meson.build:317-318@origin/main` (VALIDATION_DEFAULT 'auto').
- L33 IMPRECISE corrigé : "annoncé sans log (une promesse du fournisseur, pas un audit)". Preuve : page d'accueil dns.watch : "No Logging, DNSSEC enabled" ; `dig @84.200.69.80 google.fr` répond.
- L39 IMPRECISE corrigé : BIND écoute sur toutes les interfaces, la récursion est limitée à localhost/localnets. Preuve : `doc/arm/reference.rst:3169-3176` et `:2963@origin/main`, `bin/include/defaultconfig.h:44-45,121` ; `named -g` sur debian:13.1 -> "listening on IPv4 interface lo, 127.0.0.1#53" et "interface eth0, 192.168.215.2#53".
- L48 IMPRECISE corrigé : chemin `/etc/bind` cité, liste adaptée Debian 12 / 13, fichiers annexes mentionnés. Preuve : `ls /etc/bind` debian:12.0 (bind 9.18.49) -> bind.keys, db.0/127/255/empty/local, named.conf, named.conf.default-zones, named.conf.local, named.conf.options, rndc.key, zones.rfc1918 ; debian:13.1 (bind 9.20.30) -> named.conf, named.conf.local, named.conf.options, named.conf.root-hints, rndc.key (plus de default-zones).
- L55 IMPRECISE corrigé : phrase ajoutée sur systemd-resolved (`DNS=127.0.0.1` dans `/etc/systemd/resolved.conf`). Preuve : postinst de `systemd-resolved` (debian:13.1) convertit `/etc/resolv.conf` en lien vers `/run/systemd/resolve/stub-resolv.conf` ; `#DNS=` présent dans `/etc/systemd/resolved.conf`. "Défaut sur Ubuntu" : connu, non testé ici.
- L59 IMPRECISE corrigé : "gère toutes les redirections" -> "sert tous ses enregistrements (SOA, NS, A, MX, CNAME...)". Preuve : définition, pas de test.
- L105 IMPRECISE corrigé en partie : dossier de logs passé à `/var/log/named` + `mkdir`/`chown bind:bind` avant le bloc. Preuve : debian:13.1, dossier absent -> "configuring logging: file not found", "exiting (due to fatal error)" ; `/etc/apparmor.d/usr.sbin.named:62-63` n'autorise que `/var/log/named/`. La partie "queries ne journalise rien sans querylog" est **rejetée** : `doc/arm/reference.rst:2594-2597@origin/main` "If querylog is not specified, then query logging is determined by the presence of the logging category queries" ; test : après une requête, `query.log` contient 1 ligne sans `querylog`. Une phrase le dit dans l'article.

## En plus

- L46 : `dig +short google.fr` interroge le résolveur de `/etc/resolv.conf`, pas BIND : remplacé par `dig +short @127.0.0.1 google.fr`.
- Liens : OpenNIC `opennicproject.org` -> `https://opennic.org/` (redirection constatée), DNS Watch `https://dns.watch/index` (404) -> `https://dns.watch/` (200).

## Modernisation

- `type primary;` : appliqué (commentaire : master avant 9.18, toujours accepté ; `lib/isccfg/namedconf.c:948@origin/main` liste "primary", "master").
- `dnssec-validation auto` : mentionné (actif par défaut), pas de bloc options ajouté.
- `named-checkconf` / `named-checkzone` / `rndc reload` : appliqué, bloc ajouté après la zone.

## Tests

- debian:13.1 (BIND 9.20.30), debian:12.0 (BIND 9.18.49) ; `named-checkconf` OK sur les blocs zone + logging tels qu'écrits dans l'article ; `dig` local (macOS).

## À signaler

- Le bloc `named.conf.options` définit les ACL `allowQueried` et `allowRecursion` sans jamais les utiliser (pas de bloc `options {}`), et l'article ne montre pas le fichier de zone `db.jdelgado.fr`. Article incomplet, non complété ici.
- `jdelgado.fr` est aujourd'hui délégué à `ns11/ns12.infomaniak.ch`, plus à `ns1.jdelgado.fr` : l'exemple est historique.
- Profil AppArmor : lu depuis le paquet, pas testé avec AppArmor actif (impossible en conteneur).
