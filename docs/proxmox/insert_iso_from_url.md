# Ajouter une ISO depuis une URL

Depuis la WebUI de Proxmox, il n'est pas possible d'ajouter une ISO
depuis une URL.

Cependant, nous pouvons le faire en ligne de commande.

Pour cela, on se rend dans le dossier où sont situés les ISOs :

```
cd /var/lib/vz/template/iso
```

Et on télécharge l'ISO souhaité :

```
wget https://cdimage.debian.org/debian-cd/current/amd64/iso-cd/debian-9.9.0-amd64-netinst.iso
```

Nous disposons désormais de notre ISO accessible depuis proxmox
