# Créer sa VM en CLI avec cloud-init

Pas de blabla, quelques commandes ici et on en parle plus !

Au préalable, il faut telecharger l'img
```
cd /var/lib/vz/template/iso ; wget https://cloud-images.ubuntu.com/daily/server/releases/24.04/release/ubuntu-24.04-server-cloudimg-amd64.img
```

Puis hop on créé notre VM

```
ID_VM="102"
STORAGE_CLASS="local"
qm create ${ID_VM} --name "cloudron01-prod" --memory 3072 --cores 2 --net0 virtio,bridge=vmbr0
qm importdisk ${ID_VM} /var/lib/vz/template/iso/ubuntu-24.04-server-cloudimg-amd64.img ${STORAGE_CLASS}
qm set ${ID_VM} --scsihw virtio-scsi-pci --scsi0 ${STORAGE_CLASS}:vm-${ID_VM}-disk-0.raw
qm set ${ID_VM} -net0 e1000=${MAC_ADDR°},bridge=vmbr0,firewall=1
qm set ${ID_VM} --ipconfig0 ip=${PUBLIC_IP}/32,gw=${GATEWAY}
qm set ${ID_VM} --boot c --bootdisk scsi0
qm set ${ID_VM} --ide2 ${STORAGE_CLASS}:cloudinit
qm set ${ID_VM} --ciuser ubuntu --cipassword 'yourpassword'
qm set ${ID_VM} --sshkey ~/.ssh/customers.pub
```

`local` est ici le nom de notre stockage que nous utilisons

On peut également passer sa VM en DHCP à la place :

```
qm set ${ID_VM} --ipconfig0 ip=dhcp
```

Enfin, on start sa VM

```
qm start ${ID_VM}
```

Votre VM sera accessible en SSH avec la clé définie

A noter que l'étape où l'on definie l'adresse mac n'est pas obligée si nous n'avons pas à utiliser une MAC prédéfinie
