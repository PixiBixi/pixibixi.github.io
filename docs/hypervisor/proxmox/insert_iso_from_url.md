---
description: Télécharger une image ISO dans Proxmox depuis une URL, via la WebUI, pvesh ou wget
tags:
  - Proxmox
  - ISO
variables:
  - name: node
    default: pve
  - name: iso
    default: debian-13.7.0-amd64-netinst.iso
  - name: sha256
    default: a7ef94ac2fb9a7fec454552abd629b7cc9d5155c886165a45649f5ce6167e355
---

# Ajouter une ISO depuis une URL

Depuis Proxmox VE 7.0, la WebUI sait télécharger une ISO depuis une URL : on sélectionne le storage (`local` par exemple), onglet **ISO Images**, bouton **Download from URL**, avec vérification de checksum en option.

Sans passer par la WebUI, on le fait en ligne de commande, 2 solutions s'offrent à nous.

La première passe par l'API (le même endpoint que la WebUI), avec `pvesh` directement sur le node :

```bash
pvesh create /nodes/<node>/storage/local/download-url \
  --content iso \
  --filename <iso> \
  --url https://cdimage.debian.org/debian-cd/current/amd64/iso-cd/<iso> \
  --checksum-algorithm sha256 \
  --checksum <sha256>
```

Le nom exact de l'ISO courante et son checksum sont dans le fichier `SHA256SUMS` du même dossier : `current/` pointe toujours sur la dernière version de Debian, une ISO versionnée finit en 404 à la release suivante.

La seconde, à l'ancienne : on se rend dans le dossier où sont situés les ISOs du storage `local` :

```bash
cd /var/lib/vz/template/iso
```

Et on télécharge l'ISO souhaitée :

```bash
wget https://cdimage.debian.org/debian-cd/current/amd64/iso-cd/<iso>
```

Nous disposons désormais de notre ISO accessible depuis Proxmox
