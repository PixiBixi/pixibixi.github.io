---
article: docs/linux/networking/openvpn.md
checked: '2026-11-11'
commit: ae9ee4ce9afab603739f930537dfb6f43d862952
sources:
- repo: openvpn-openvpn
  path: doc/man-sections/encryption-options.rst
  lines: '66'
  ref: v2.7.9
  commit: 7b60c2aa34992639691e3a2d651fe27301e2e9d5
- repo: null
  path: service.in
  lines: 12-13
  ref: v2.7.9
  commit: null
unpinned: 2
---

# docs/linux/networking/openvpn.md

## Findings

- L39 IMPRECISE corrigé : `openvpn --genkey secret` remplacé par `openvpn --genkey tls-crypt /etc/openvpn/ta.key`. Preuve : doc/man-sections/encryption-options.rst:66 @v2.7.9 (`openvpn --genkey tls-crypt shared.key`), testé dans debian:12.8 (OpenVPN 2.6.14), clé générée puis serveur démarré avec la config de l'article : "Initialization Sequence Completed".
- L91 IMPRECISE corrigé : `comp-lzo` déprécié depuis 2.4 (remplacé par `compress`), et `allow-compression` vaut `no` par défaut depuis 2.6. Preuve : Changes.md:1993 et :1380 @v2.7.9 (le fichier s'appelle Changes.md, pas Changes.rst).
- L118 IMPRECISE corrigé : plus de "par défaut 10.8.0.0/24", le réseau vient de la directive `server`. Preuve : `git grep 10.8.0` @v2.7.9 ne trouve que des commentaires d'exemple dans src/openvpn/helper.c:227-251.

## En plus

- L50 corrigé : le tableau décrivait `ta.key` comme "Clé TLS (HMAC)", alors que l'article l'utilise en `tls-crypt` (chiffre et authentifie le canal de contrôle). Preuve : même page man, section tls-crypt.

## Modernisation

- Appliqué : `--genkey tls-crypt` (voir finding L39).
- Appliqué : `remote-cert-tls server` dans le `.ovpn` client (protège contre un autre client qui se ferait passer pour le serveur). Non testé en connexion client réelle.
- Appliqué : mention de l'unité `openvpn-server@<nom>` qui lit `/etc/openvpn/server/<nom>.conf`. Preuve : distro/systemd/openvpn-server@.service.in:12-13 @v2.7.9, et unité présente dans le paquet debian:12.8. `openvpn@server` reste valable (unité `openvpn@.service` présente), donc l'exemple n'a pas changé.
- `tested_with` ajouté : OpenVPN 2.6 (Debian 12), easy-rsa 3.1.

## Tests

- debian:12.8 + paquets openvpn 2.6.14 et easy-rsa 3.1.0 : make-cadir, init-pki, build-ca, gen-dh, build-server-full, build-client-full OK (EASYRSA_BATCH=1), puis `openvpn --config server.conf` (config de l'article, log redirigé) avec NET_ADMIN et /dev/net/tun : démarrage OK, aucun warning.

## À signaler

- L13 (obligation légale de conservation des logs pour les VPN français) non vérifiée, hors périmètre du fact-check.
