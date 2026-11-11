---
article: docs/hypervisor/proxmox/insert_iso_from_url.md
checked: '2026-11-11'
commit: 5acb3f2038dda9aeb40d85a60aeb559b316903fa
sources: []
unpinned: 2
---

# docs/hypervisor/proxmox/insert_iso_from_url.md

## Findings

- L24 ERROR corrigé : l'URL Debian 9.9.0 est remplacée par `current/.../<iso>` avec `variables:` (`iso` = debian-13.7.0-amd64-netinst.iso), plus une phrase expliquant de prendre le nom dans `SHA256SUMS`. Preuve : `curl -sI` le 2026-11-09 : 404 sur debian-9.9.0-amd64-netinst.iso, 302 (OK) sur debian-13.7.0-amd64-netinst.iso ; nom et sha256 lus dans current/amd64/iso-cd/SHA256SUMS.
- L10 OUTDATED corrigé : l'intro dit désormais que la WebUI propose "Download from URL" (storage > ISO Images) depuis PVE 7.0, avec checksum optionnel. Preuve : endpoint API `/nodes/{node}/storage/{storage}/download-url` présent dans pve-docs api-viewer/apidata.js dès le commit 34f3e48 (2021-07-02, période de la sortie de PVE 7.0), paramètres checksum / checksum-algorithm (md5 à sha512) / content / filename / url @origin/master. Le libellé exact du bouton dans la WebUI n'est pas vérifié dans le code (pve-manager pas cloné), c'est le libellé connu et celui du fact-check.

## En plus

- Ajout de la méthode CLI officielle `pvesh create /nodes/<node>/storage/local/download-url ...` avec vérification sha256 (le fact-check proposait `pvesm download-url`, qui n'existe pas : absent de pve-docs pvesm.1-synopsis.adoc @origin/master).
- Description mise à jour (WebUI, pvesh ou wget), "ISO souhaité" -> "souhaitée", "proxmox" -> "Proxmox".

## Modernisation

- Appliquée en partie : WebUI + pvesh. `pvesm download-url` écarté (n'existe pas).

## Tests

- curl -sI sur cdimage.debian.org. Aucune commande Proxmox exécutée (pas de node PVE dispo) : la commande pvesh est construite depuis le schéma API, non testée.

## À signaler

- Le default `sha256` de la variable vieillira à chaque point release Debian, comme le nom de l'ISO.
