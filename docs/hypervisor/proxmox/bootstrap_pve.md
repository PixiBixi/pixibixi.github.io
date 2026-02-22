---
description: Installer et configurer un Proxmox propre — suppression des dépôts payants, certificats et paramètres système
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

## Bloatware Proxmox

Personne ne veut la pop-up qui nous indique que nous n'avons pas un abonnement valide pour PVE, c'est pour ça qu'il existe un petit trick nous permettant de la supprimer

```bash
sed -Ezi.bak "s/(function\(orig_cmd\) \{)/\1\n\torig_cmd\(\);\n\treturn;/g" /usr/share/javascript/proxmox-widget-toolkit/proxmoxlib.js
systemctl restart pveproxy.service
```

## Performance CPU

Pour ça, on souhaite utiliser le driver performance de notre CPU nous assurant que le CPU sera a sa fréquence maximum le plus souvent possible

```bash
apt install cpufrequtils
cat << 'EOF' > /etc/default/cpufrequtils
GOVERNOR="performance"
EOF
```

## Certificat Lets Encrypt

Un beau petit cadenas vert, c'est quand même pas mal non ? :)

Pour ça, c'est quelques lignes de commande

```bash
MAIL="contact+letsencrypt@mydomain.fr"
DOMAIN="virtu01-prod.my.domain.tld
root@virtu01-prod:~# pvenode acme account register default ${MAIL}
Directory endpoints:
0) Let's Encrypt V2 (https://acme-v02.api.letsencrypt.org/directory)
1) Let's Encrypt V2 Staging (https://acme-staging-v02.api.letsencrypt.org/directory)
2) Custom
Enter selection: 1

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
