---
article: docs/hypervisor/proxmox/vm_as_cli.md
checked: '2026-11-11'
commit: 5546d13fb96fba24a03319562cda376f5ead66bd
sources:
- repo: qemu-server
  path: src/PVE/QemuServer.pm
  lines: 402-407
  ref: origin/master
  commit: afbc929c23ba002a648f4a9d322595fb7cea63a7
- repo: pve-docs
  path: qm-cloud-init.adoc
  lines: '91'
  ref: origin/master
  commit: e67813a5deae705d5869d613fa2c73be89b6cb0b
- repo: qemu-server
  path: src/PVE/CLI/qm.pm
  lines: '1430'
  ref: origin/master
  commit: afbc929c23ba002a648f4a9d322595fb7cea63a7
- repo: pve-storage
  path: src/PVE/Storage/Plugin.pm
  lines: 813-825
  ref: origin/master
  commit: cdeec1e65b9187cbd634e90e91d69b95dadc710f
unpinned: 2
---

# docs/hypervisor/proxmox/vm_as_cli.md

## Findings

- L28 OUTDATED corrigé : `--boot c --bootdisk scsi0` remplacé par `--boot order=scsi0`. Preuve : qemu-server src/PVE/QemuServer.pm:402-407 @origin/master (`bootdisk` : "Deprecated: Use 'boot: order=foo;bar' instead"), et :394-400 (`boot` sans `order=` déprécié aussi) ; pve-docs qm-cloud-init.adoc:91 @origin/master.
- L15 IMPRECISE rejeté : l'URL `daily/server/releases/24.04/release/` sert exactement le fichier de release, pas une daily. Preuve : curl le 2026-11-09, même ETag `25080c00-65e0f29cd93d4` et même SHA256SUMS (`04e8f246...`) que `releases/noble/release/`. URL laissée telle quelle.
- L24 IMPRECISE corrigé (autrement) : `qm importdisk` est bien un alias valide de `qm disk import` (qemu-server src/PVE/CLI/qm.pm:1430 @origin/master), mais le couple importdisk + nom de volume deviné est remplacé par `--scsi0 ${STORAGE_CLASS}:0,import-from=<img>`, la méthode de la doc officielle. Preuve : qemu-server src/PVE/QemuServer/Drive.pm:627-685 ; pve-docs qm-cloud-init.adoc:69.
- L25 IMPRECISE corrigé : le nom `${STORAGE_CLASS}:vm-${ID_VM}-disk-0.raw` était faux même sur un storage dir : le volid y est `local:102/vm-102-disk-0.raw` (le `parse_volname` du plugin dir exige le préfixe `<vmid>/`), et sans `.raw` sur LVM-thin. Résolu par `import-from`, phrase d'explication ajoutée. Preuve : pve-storage src/PVE/Storage/Plugin.pm:813-825 @origin/master (clone créé dans ~/Documents/work/src/pve-storage).
- L26 IMPRECISE corrigé : `-net0 e1000=${MAC_ADDR°}` remplacé par `--net0 virtio=${MAC_ADDR}` (cohérent avec le `qm create`), caractère `°` supprimé, `MAC_ADDR` défini en tête du bloc. Preuve : lecture du bloc.

## En plus

- `PUBLIC_IP` et `GATEWAY` n'étaient jamais définis : ajoutés en tête du bloc avec des valeurs de doc (203.0.113.0/24, RFC 5737).
- Phrase finale sur la MAC réécrite (pointe sur la ligne `--net0`, précise que Proxmox génère une MAC sinon) ; typo "créé" -> "crée" à l'étape 2.

## Modernisation

- Appliqué : `--boot order=scsi0`, `--serial0 socket --vga serial0` (pve-docs qm-cloud-init.adoc:94-99), `qm disk resize ${ID_VM} scsi0 +20G` (alias `resize => disk resize`, qm.pm:1434). Taille de 3.5G vérifiée en lisant l'en-tête qcow2 de l'image (curl range 0-31 : magic `QFI\xfb`, taille `0xe0000000` = 3.5 GiB).
- `qm disk import` : non appliqué, remplacé par `import-from` qui supprime l'étape.

## Tests

- Aucun Proxmox disponible : vérifications sur les sources qemu-server, pve-storage, pve-common (Getopt abréviation, `--sshkey` reste accepté comme abréviation de `--sshkeys`), pve-docs, et curl sur cloud-images.ubuntu.com.

## À signaler

- `import-from` avec un chemin absolu demande root@pam (cas normal en CLI sur l'hôte). Le `+20G` est une valeur d'exemple.
- Rien de testé sur un vrai nœud : un passage sur un PVE 8/9 confirmerait le bloc complet.
