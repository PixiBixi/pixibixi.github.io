---
description: Installer et configurer un Proxmox propre - suppression des dépôts payants, certificats et paramètres système
tags:
  - Proxmox
---

# Avoir un Proxmox clean

Avoir un serveur Proxmox c'est bien, avoir un proxmox clean c'est mieux :)

Quelques étapes à faire pour son Proxmox. Rien de bien folichon ici, mais à garder en tête

## Admin local

On commence par la creation d'un admin local. On évite la connection root et à tout prix les comptes non nominatif

```bash
pveum group add admin -comment "System Administrators"
pveum acl modify / -group admin -role Administrator
pveum useradd jdelgado@pve
pveum usermod jdelgado@pve -group admin
pveum passwd jdelgado@pve
```

Dans le même temps, on peut creer un compte qui nous servira pour le [PVE Exporter](https://github.com/prometheus-pve/prometheus-pve-exporter)

```bash
pveum groupadd monitoring -comment 'Monitoring group'
pveum aclmod / -group monitoring -role PVEAuditor
pveum useradd pve_exporter@pve
pveum usermod pve_exporter@pve -group monitoring
pveum passwd pve_exporter@pve
```

Il peut être intéressant de mettre le même password de partout afin de n'avoir qu'une instance du PVE exporter

## Dépôts sans abonnement

Sans abonnement, le dépôt `pve-enterprise` activé par défaut fait échouer `apt update` (401). Sur PVE 9 (Debian 13 Trixie), les dépôts sont au format deb822 : on désactive l'entreprise avec une ligne `Enabled: no` et on ajoute le dépôt `pve-no-subscription` :

```bash
sed -i '/^Types:/a Enabled: no' /etc/apt/sources.list.d/pve-enterprise.sources
cat << 'EOF' > /etc/apt/sources.list.d/proxmox.sources
Types: deb
URIs: http://download.proxmox.com/debian/pve
Suites: trixie
Components: pve-no-subscription
Signed-By: /usr/share/keyrings/proxmox-archive-keyring.gpg
EOF
apt update
```

Même traitement pour `/etc/apt/sources.list.d/ceph.sources` s'il pointe sur `enterprise.proxmox.com`.

## Bloatware Proxmox

Personne ne veut la pop-up qui nous indique que nous n'avons pas un abonnement valide pour PVE, c'est pour ça qu'il existe un petit trick nous permettant de la supprimer. Depuis proxmox-widget-toolkit 5 (PVE 9), la source s'écrit `function (orig_cmd)` avec un espace, d'où l'espace optionnel (`function ?`) dans le motif :

```bash
sed -Ezi.bak "s/(function ?\(orig_cmd\) \{)/\1\n\torig_cmd\(\);\n\treturn;/g" /usr/share/javascript/proxmox-widget-toolkit/proxmoxlib.js
cmp -s /usr/share/javascript/proxmox-widget-toolkit/proxmoxlib.js{,.bak} && echo "rien modifié"
systemctl restart pveproxy.service
```

Si le motif ne matche pas, `sed` ne dit rien : le `cmp` est là pour le voir. Le fichier appartient au paquet `proxmox-widget-toolkit`, la pop-up revient donc à chaque mise à jour de ce paquet et il faut rejouer la commande.

## Performance CPU

Pour ça, on souhaite utiliser le governor `performance`, qui garde le CPU à sa fréquence maximum le plus souvent possible. `cpufrequtils` n'existe plus dans Debian 13 (PVE 9) : on passe par `cpupower` et un service oneshot pour que ça tienne au reboot :

```bash
apt install linux-cpupower
cat << 'EOF' > /etc/systemd/system/cpupower-performance.service
[Unit]
Description=Set CPU governor to performance

[Service]
Type=oneshot
ExecStart=/usr/bin/cpupower frequency-set -g performance

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now cpupower-performance.service
```

## Certificat Lets Encrypt

Un beau petit cadenas vert, c'est quand même pas mal non ? :)

Pour ça, c'est quelques lignes de commande. La validation par défaut (`http-01`) lance un serveur web sur le port 80 du node : il doit être joignable depuis Internet et libre. Sinon, on passe par un plugin DNS (`pvenode acme plugin add`).

```bash
MAIL="contact+letsencrypt@mydomain.fr"
DOMAIN="virtu01-prod.my.domain.tld"
root@virtu01-prod:~# pvenode acme account register default ${MAIL}
Directory endpoints:
0) Let's Encrypt V2 (https://acme-v02.api.letsencrypt.org/directory)
1) Let's Encrypt V2 Staging (https://acme-staging-v02.api.letsencrypt.org/directory)
2) Custom
Enter selection: 0

Terms of Service: https://letsencrypt.org/documents/LE-SA-v1.2-November-15-2017.pdf
Do you agree to the above terms? [y|N]y
...
Task OK
root@virtu01-prod:~# pvenode config set --acme domains=${DOMAIN}
root@virtu01-prod:~# pvenode acme cert order
Loading ACME account details
Placing ACME order
...
Status is 'valid'!

All domains validated!
...
Downloading certificate
Setting pveproxy certificate and key
Restarting pveproxy
Task OK
```

## Divers

Si on utilise pas NFS, on desactive RPCbind  (Ce n'est pas grand chose, mais on ne veut pas de service inutile sur notre machine)

```bash
systemctl disable --now rpcbind.service rpcbind.socket
```
