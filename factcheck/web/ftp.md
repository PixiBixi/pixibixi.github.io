---
article: docs/web/ftp.md
checked: '2026-11-10'
commit: bbc44fc8bbc88f75993ab359bbba0838fb7f73a6
sources: []
unpinned: 7
---

# docs/web/ftp.md

## Findings

- L186 ERROR corrigé : `-R` remplacé par `-r` (liste autorisée), phrase qui explique que `-R` interdit et que `-m` régénère la base. Preuve : README.Virtual-Users@1.0.54:69 `[-r <allow client ip>/<mask>] [-R <deny client ip>/<mask>]` ; test Docker : avec `-R 127.0.0.1` login refusé (530), avec `-r 127.0.0.1` login OK (226).
- L210 ERROR corrigé : reset par chaîne vide `-t '' -T '' -r '' -R '' -m`, plus une ligne pour `-n ''`, `-N ''`, `-q '' -Q ''`. Preuve : README.Virtual-Users@1.0.54:151-158 ; test Docker : la commande de l'article (`-N  -m`) ne retire rien et pose un quota "Max size : 0 Mb (enabled)" (le `-m` est pris comme valeur de -N), la nouvelle remet les débits à "unlimited" et vide les IP autorisées.
- L130 OUTDATED corrigé : section Ciphers réécrite : depuis 1.0.50 SSLv3/TLS 1.0/1.1 refusés, Debian livre `TLSCipherSuite` = `HIGH`, liste optionnelle réduite aux ciphers AEAD (CBC retirés), TLS 1.3 non concerné par ce fichier. Preuve : src/tls.c@1.0.50:315-327 et @1.0.54:340-352 (`SSL_OP_NO_TLSv1`, `SSL_OP_NO_TLSv1_1`), tls.c@1.0.54:358 `SSL_CTX_set_cipher_list` (TLS 1.2 seulement) ; test Docker : TLS 1.1 refusé (alert protocol version), avec la nouvelle liste ECDHE-RSA-AES128-SHA256 refusé, ECDHE-RSA-AES256-GCM-SHA384 accepté, TLS 1.3 négocie TLS_AES_256_GCM_SHA384.
- L11 IMPRECISE corrigé : "FTPES pour le SSL" remplacé par TLS explicite via `AUTH TLS` sur le même port. Nuance : le finding dit que Pure-FTPd ne supporte pas le FTPS implicite, c'est faux, il le supporte en option de compilation (`--with-implicittls`, configure.ac@1.0.54:850-853), non mentionné dans l'article car hors défaut.
- L91 IMPRECISE corrigé : ajout de `ForcePassiveIP` (IP d'exemple 203.0.113.10) et de l'ouverture de la plage sur le pare-feu. Preuve : /usr/sbin/pure-ftpd-wrapper:74 (Debian 12) mappe `ForcePassiveIP` vers `-P %s`. Comportement derrière NAT non testé.
- L110 IMPRECISE corrigé : valeur 1 signalée comme laissant passer les mots de passe en clair, 2 recommandée, 0 marqué défaut, commande `echo 2 > .../TLS` ajoutée. Preuve : README.TLS@1.0.54:140-146 ; test Docker avec TLS=2 : session en clair refusée (421), AUTH TLS OK (226).
- L123 IMPRECISE corrigé : `chmod 600` ajouté, mention de Let's Encrypt (clé + fullchain concaténés dans le même pem). Preuve : README.TLS@1.0.54:126 (le certificat public doit être dans pure-ftpd.pem). Montage Let's Encrypt non testé.

## En plus

- L87-89 : l'article disait qu'il faut passer VIRTUALCHROOT à true pour activer les virtual users. Faux : c'est le choix du binaire avec support virtualchroot (liens symboliques hors chroot). Preuve : commentaire de /etc/default/pure-ftpd-common (Debian 12) "whether to use binary with virtualchroot support" ; test Docker : login d'un virtual user OK (226) avec VIRTUALCHROOT=false.
- L51 : `pureftpd.passwd` n'existe pas à l'installation, précisé qu'il est créé au premier `pure-pw useradd` (ls /etc/pure-ftpd sur Debian 12 juste après install).
- Titre de section "SSL" renommé "TLS", description front matter idem.

## Modernisation

- SFTP mentionné en une phrase dans l'intro : appliqué.
- TLS 2 au lieu de 1 : appliqué.
- Liste de ciphers inutile : appliqué (section réduite, liste gardée comme option).
- Let's Encrypt : mentionné, pas de procédure (non testé).

## Tests

- Docker debian:12.7, pure-ftpd 1.0.50-2.1+b2, OpenSSL 3.0 Debian, curl et `openssl s_client -starttls ftp`. Le conteneur a besoin de `--cap-add SYS_NICE --cap-add DAC_READ_SEARCH`, sinon pure-ftpd sort en "421 Unable to switch capabilities". `tested_with: "Pure-FTPd 1.0.50 (Debian 12)"` ajouté.

## À signaler

- Liste `*` existante conservée (MD004 impose un style cohérent dans le fichier).
