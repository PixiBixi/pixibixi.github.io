---
article: docs/monitoring/munin.md
checked: '2026-11-10'
commit: 9c02efeb877fc184c9821a8dcd6ca1999ae9a320
sources: []
unpinned: 4
---

# docs/monitoring/munin.md

## Findings

- L37 ERROR corrigé : `/etc/munin.conf` -> `/etc/munin/munin.conf` (L37 et L69) et `/etc/munin-node.conf` -> `/etc/munin/munin-node.conf` (L53). Preuve : debian:bookworm-20241016 + munin/munin-node 2.0.73-1 : `/etc/munin.conf` et `/etc/munin-node.conf` absents, `/etc/munin/munin.conf` et `/etc/munin/munin-node.conf` présents
- L20 IMPRECISE corrigé : rôles réécrits : le node fait tourner les plugins et renvoie des valeurs texte, le master collecte, écrit les RRD et génère pages et graphes. Preuve : test bookworm, munin-update (master, user munin) crée `/var/lib/munin/example/t.example-cpu-*.rrd` après interrogation du node sur [::1]:4949
- L85 IMPRECISE corrigé : URLs julienschmidt passées en https, phrase "scripts tiers qui tournent en root, sans checksum, on les relit", commentaire indiquant que l'archive mirtouf contient les mêmes 2 scripts. Preuve : `curl -L` http -> 301 vers https, 200 text/plain ; archive mirtouf (gzip 2015) = spawn-fcgi-munin-html + spawn-fcgi-munin-graph, `diff` avec la version julienschmidt du graph : identique
- L151 IMPRECISE corrigé : `location ~ /'.ht` -> `location ~ /\.ht`. Preuve : nginx:1.27.3, `nginx -t` OK, avec les deux blocs `/'.ht` (418) et `/\.ht` (403) : `/.htaccess` et `/x/.htpasswd` -> 403, la regex avec apostrophe ne matche jamais

## En plus

- L56 : `host ::1` dans munin-node.conf fait planter le node (`Unresolveable [:1]:4949: Name or service not known`, rien n'écoute) ; `host [::1]` écoute bien (`ss` : `[::1]:4949`). Corrigé avec une phrase d'explication. Preuve : bookworm munin-node 2.0.73-1, libnet-server-perl 2.013-2, conteneur sur réseau Docker IPv6
- L164 : socket du vhost "pages dynamiques" `/var/run/munin/fcgi-html.sock` ne correspondait pas au script (`SOCK_FILE=/var/run/munin/$NAME.sock`, NAME=spawn-fcgi-munin-html). Corrigé en `/run/munin/spawn-fcgi-munin-html.sock`, cohérent avec le bloc graph. Preuve : spawn-fcgi-munin-html L29-31 de l'archive téléchargée
- Vérifié sans changement : côté master, `address :::1` (L42) fonctionne, `address ::1` échoue ("failed to connect to node"), `[::1]` fonctionne aussi. Même conteneur IPv6, testé dans les deux ordres

## Modernisation

- Unit systemd au lieu des scripts sysvinit : déjà mentionné dans l'article, rien ajouté
- fcgiwrap / munin-httpd : non appliqué. fcgiwrap existe dans bookworm (1.1.0-14+deb12u1) mais je n'ai pas testé munin-cgi-graph derrière ; munin-httpd n'existe qu'en Munin 2.999 (bookworm livre 2.0.73), non vérifié

## Tests

- debian:bookworm-20241016 : munin 2.0.73-1, munin-node 2.0.73-1, spawn-fcgi, libnet-server-perl 2.013-2 ; réseau Docker `--ipv6` temporaire (fc-v6, supprimé) car sans IPv6 global getaddrinfo refuse ::1
- nginx:1.27.3 (nginx -t + curl)
- curl des 3 URLs de scripts
- Tous les conteneurs en --rm, aucun restant
- markdownlint-cli2 0.23.0, check_code_blocks.py : OK

## À signaler

- Les scripts spawn-fcgi viennent toujours d'un site perso (julienschmidt.com) : l'auteur peut préférer les vendoriser dans le wiki ou écrire directement l'unit systemd
- `http2 on;` demande nginx 1.25.1+ (validé en 1.27.3, pas sur une version plus vieille)
