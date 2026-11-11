---
article: docs/linux/security/pubkey_rfc4716.md
checked: '2026-11-11'
commit: ce1d3588529b59691943379a47b61a710b07773d
sources: []
unpinned: 2
---

# docs/linux/security/pubkey_rfc4716.md

## Findings

- L13 IMPRECISE corrigé : "OpenMediaVault n'accepte que ce type de clé" devient "n'acceptait que ce format avant la 5.6, depuis il prend aussi une clé OpenSSH et la convertit en RFC 4716". Preuve : openmediavault commit b0694aeee (2021-01-24) "Now allows pubkey in OpenSSH format beside RFC4716", entrée de `deb/openmediavault/debian/changelog:2347` sous `openmediavault (5.6.0-1)`; aujourd'hui `datamodels/rpc.usermgmt.json:107` accepte `sshpubkey-rfc4716` ou `sshpubkey-openssh` et `engined/rpc/usermgmt.inc:502` appelle `toRfc4716()` @19f7d9b87.
- L21 IMPRECISE corrigé : l'avertissement `chmod 400` supprimé. Preuve : openssh-portable `authfile.c:164-173` `sshkey_load_pubkey_from_private` fait un `open()` sans `sshkey_perm_ok` (qui n'est appelé qu'à `authfile.c:123`, chemin de chargement de la privée) @5dba72ad. Test : clé ed25519 en 0644 sans `.pub` à côté, `ssh-keygen -e -f t` sort la clé RFC 4716, rc=0; même résultat sur une clé chiffrée par passphrase avec stdin fermé.

## En plus

- L10-11 : "il peut-être utile" corrigé en "peut être", "clé public" en "clé publique".

## Modernisation

- Appliqué : commande principale sur la clé publique avec `-m RFC4716` explicite (défaut de `-e`, `ssh-keygen.c:146` `convert_format = FMT_RFC4716`), la variante sur la clé privée reste en second avec l'explication de ce que lit `ssh-keygen`.

## Tests

- OpenSSH_10.6p1 local (macOS) : `ssh-keygen -e` sur clé privée 0644, sur clé privée chiffrée, sur `.pub` avec `-m RFC4716`.

## À signaler

- La lecture sans passphrase vaut pour le format `-----BEGIN OPENSSH PRIVATE KEY-----` (testé). Une vieille clé au format PEM n'a pas été testée, l'article le borne explicitement au format OpenSSH.
