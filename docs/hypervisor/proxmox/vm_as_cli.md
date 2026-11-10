---
description: Créer et configurer une machine virtuelle Proxmox en ligne de commande avec cloud-init
tags:
  - Proxmox
  - CLI
---

# Créer sa VM en CLI avec cloud-init

Pas de blabla, quelques commandes ici et on en parle plus !

<div class="steps" markdown>

1. Au préalable, il faut telecharger l'img

    ```bash
    cd /var/lib/vz/template/iso ; wget https://cloud-images.ubuntu.com/daily/server/releases/24.04/release/ubuntu-24.04-server-cloudimg-amd64.img
    ```

2. Puis hop on crée notre VM

    ```bash
    ID_VM="102"
    STORAGE_CLASS="local"
    MAC_ADDR="BC:24:11:00:00:01"
    PUBLIC_IP="203.0.113.10"
    GATEWAY="203.0.113.1"
    qm create ${ID_VM} --name "cloudron01-prod" --memory 3072 --cores 2 --net0 virtio,bridge=vmbr0
    qm set ${ID_VM} --scsihw virtio-scsi-pci --scsi0 ${STORAGE_CLASS}:0,import-from=/var/lib/vz/template/iso/ubuntu-24.04-server-cloudimg-amd64.img
    qm disk resize ${ID_VM} scsi0 +20G
    qm set ${ID_VM} --net0 virtio=${MAC_ADDR},bridge=vmbr0,firewall=1
    qm set ${ID_VM} --ipconfig0 ip=${PUBLIC_IP}/32,gw=${GATEWAY}
    qm set ${ID_VM} --boot order=scsi0
    qm set ${ID_VM} --serial0 socket --vga serial0
    qm set ${ID_VM} --ide2 ${STORAGE_CLASS}:cloudinit
    qm set ${ID_VM} --ciuser ubuntu --cipassword 'yourpassword'
    qm set ${ID_VM} --sshkey ~/.ssh/customers.pub
    ```

    `local` est ici le nom de notre stockage que nous utilisons

    `import-from` importe l'image et l'attache en `scsi0` d'un coup : plus besoin de deviner le nom du volume, qui change selon le storage (`local:102/vm-102-disk-0.raw` sur un storage dir, `local-lvm:vm-102-disk-0` sur LVM-thin). L'image cloud ne fait que 3.5G, d'où le `qm disk resize`. Le `--serial0 socket --vga serial0` donne une console série, dont la plupart des images cloud ont besoin.

    On peut également passer sa VM en DHCP à la place :

    ```bash
    qm set ${ID_VM} --ipconfig0 ip=dhcp
    ```

3. Enfin, on start sa VM

    ```bash
    qm start ${ID_VM}
    ```

    Votre VM sera accessible en SSH avec la clé définie

</div>

A noter que la ligne `--net0 virtio=${MAC_ADDR}` n'est utile que si on doit utiliser une MAC prédéfinie : sans elle, Proxmox en génère une.
