# Liste de commandes utiles assez avancées

* Permet de tcpdump uniquement les IPv6 RA

```bash
tcpdump -vvvv -tttt -i ethX icmp6 and ip6[40] = 134
```

* Pour pinguer une adresse du link-local, ne pas oublier le **%ethX**

```bash
ping6 fe80::2%eth0
```

* Permet de faire un SMART sur un HDD en RAID (DELL)

```bash
smartctl -T permissive -a /dev/sgX
```

* Permet d'enregistrer les trames en format pcap puis de les décoder

```bash
tshark -w data.pcap
tshark -nr data.pcap -V
```

* Si un volume ne peut pas s'unmount (Comme un NFS par exemple)

```bash
umount -f -l /mnt/
```

* Permet de supprimer un LV quand on a un problème

```bash
lvchange -an -v /dev/mapper/grp-jojo
lvremove -vf /dev/mapper/grp-jojo
```

* Rename lvold en lvnew dans le VG vg02

```bash
lvrename vg02 lvold lvnew
```

* Lancer une tâche de fond avec la priorité CPU et disque minimale
    (afin qu'elle ralentisse le moins possible les autres programmes)

```bash
alias ni=nice -n 19 ionice -c3 >> ~/.zshrc
ni tar cvfz monarchive.tgz monrepertoire/
```

* Copie les fichiers localement en ignorant les symlink et en
    précisant un port **(A faire sur le serveur où les données sont
    situées de base)**

```bash
rsync --progress -avhe ssh -p 1998 . jeremy@$IP:$PATH
```

* Installe tous les packages 7.2 existants par les 7.3

```bash
dpkg -l|grep php7.2|awk {print $2}|sed s/7.2/7.3/g|xargs apt install -y
```

* N'utilise pas l'alias de ls

```bash
\ls
```

* Génère un fichier de 10G rapidement

```bash
fallocate -l 10G test.img
```

* Récuperer le modèle de serveur

```bash
dmidecode | grep -A3 ^System Information
```

* Test le nouveau nom de l'interface

```bash
udevadm test-builtin net_id /sys/class/net/eth0
```

* Créer un RAID5 en assumant que le RAID est fonctionnel. (Utile si le
    RAID n'est pas du tout détecté)

```bash
mdadm --create /dev/md0 --level=5 --raid-devices=3 /dev/mapper/sdb1 /dev/mapper/sdc1 /dev/mapper/sdd1 --assume-clean
```

!!! Warning
    La reconstruction du raid est "bridé" par des paramètres sysctl, `dev.raid.speed_limit_min` et `dev.raid.speed_limit_max`

* Se reendre dans le BIOS directement au reboot

```bash
systemctl reboot --firmware-setup
```

* Lister les crontabs des utilisateurs

```bash
cat /var/spool/cron/crontabs/
```

* Backup & Restore des ACL (Fortement utile pour une modification de
    masse)

```bash
getfacl -R . >permissions.facl
setfacl --restore=permissions.facl
```

* Extract la pubkey SSH de la privkey

```bash
ssh-keygen -y -f privatekey > pubkey
```

* Check IO détaillé

```bash
iostat -N 10 -kx -h
```

* Top 10 des commandes qu'on utilise le plus

```bash
history | awk {CMD[$2]++;count++;}END { for (a in CMD)print CMD[a] " " CMD[a]/count*100 "% " a;} | grep -v "./" | column -c3 -s " " -t | sort -nr | nl |  head -n10
```

* Test compression des fichiers selon différents algos

```bash
for NB in 4 16 64 256 1024 4096 ; do echo "::: $NB" ; head -n $NB mysql-slow.log > foo.$NB ; cat foo.$NB | zstd -c > foo.$NB.zstd ; done
for NB in 4 16 64 256 1024 4096 ; do head -n $NB mysql-slow.log > foo.$NB ; cat foo.$NB | lzop -c > foo.$NB.lzo ; done
```

* Avoir les droits effectifs pour chaque folder d'un path

```bash
root@prod g262:/home/pierre/home/http/www/shop/modules/appagebuilder/translations$ namei -o -m  /home/pierre/home/http/www/shop/modules/appagebuilder/translations/fr.php
f: /home/pierre/home/http/www/shop/modules/appagebuilder/translations/fr.php
 drwxr-xr-x root      root          /
 drwxr-x--x root      adm           home
 drwxr-xr-x root      root          pierre
 drwxr-x--x pierre pierre     home
 drwxr-x--- pierre www-pierre http
 drwxr-xr-x pierre pierre     www
 drwxrwxr-x pierre pierre     shop
 drwxrwxr-x pierre pierre     modules
 drwxrwxr-x pierre pierre     appagebuilder
 drwxrwxr-x pierre pierre     translations
 -rwxrwxr-x pierre pierre     fr.php
```

* Lister les ciphers proposés par un site web

```bash
nmap --script ssl-enum-ciphers -p 443 clubic.com
```

* Remove PCS node

```bash
crm_node --force -R $node
```

* varnishlog des requêtes non cachées

```bash
varnishlog -i Begin,ReqUrl,Link,BereqURL
```

* Remove un LV inexistant (PV ou VG mort)

```bash
dmsetup remove vgname-lvname
```

* Trouver depuis quel paquet provient un binaire

```bash
[17:41] ✔ X@hostname.tld:~
└─$ dpkg-query -S "*/dig"
dnsutils: /usr/bin/dig
```

* Analyser le fichier mysql-slow

```bash
mysqldumpslow -s c -r
```

* Timestamp compréhensible dans dmesg

```bash
dmesg -T
```

* Clean la queue exim

```bash
exim -bp | exiqgrep -i | xargs exim -Mrm
```

* Check le 0-RTT

```bash
sslyze --early_data cloudflare.com
```

* Upgrade Debian full non-interactive

```bash
export DEBIAN_FRONTEND=noninteractive
export DEBIAN_PRIORITY=critical
sudo -E apt-get -qy update
sudo -E apt-get -qy -o "Dpkg::Options::=--force-confold" -o "Dpkg::Options::=--force-confdef"  upgrade
```

* Check l'historique des resize & co LVM

```bash
[20:27] ✔ x-y@hostname.fdn:~
└─$ sudo bash -c "cat /etc/lvm/archive/*" | '
   awk -F= $0 ~ /^creation_time =|^description =/ { print $2 } | '
   awk NR%2==1 {sub(/Created '*before'* /,"",$0);line1=$0;state=1}
        NR%2==0 {line2=$0;state=0}
        {if(state==0) {print line2 " -" line1}} | '
   sort -n -k 1 | '
   grep -v "lvs'|vgs'|vgdisplay'|vgscan"
 1633118488 # Fri Oct  1 20:01:28 2021 - "executing lvcreate -L 2G -n home vg --wipesignatures
 1633118488 # Fri Oct  1 20:01:28 2021 - "executing lvcreate -L 2G -n var vg --wipesignatures
 1633118501 # Fri Oct  1 20:01:41 2021 - "executing lvcreate -L 2G -n mysql vg --wipesignatures
 1633118502 # Fri Oct  1 20:01:42 2021 - "executing lvcreate -L 2G -n mysqlinnodb vg --wipesignatures
 1633161982 # Sat Oct  2 10:06:22 2021 - "executing vgcreate vg-x /dev/sdc"
 1633161987 # Sat Oct  2 10:06:27 2021 - "executing lvcreate -L 2G -n mysql vg-x --wipesignatures
```

* Lire les infos TLS rapidement sur un serveur HTTPS, 2 méthodes pour ça

```bash
➜  ~ gnutls-cli -p 443 google.com
Processed 147 CA certificate(s).
Resolving 'google.com:443'...
Connecting to '2a00:1450:4007:818::200e:443'...
- Certificate type: X.509
- Got a certificate list of 3 certificates.
- Certificate[0] info:
 - subject `CN=*.google.com', issuer `CN=WR2,O=Google Trust Services,C=US', serial 0x463e05b5a27190c90aeb46472b6cdeca, EC/ECDSA key 256 bits, signed using RSA-SHA256, activated `2024-08-12 06:33:49 UTC', expires `2024-11-04 06:33:48 UTC', pin-sha256="9gRz00N3xKCUAn/eI9TvsZ3roKNhAdbD7Xo+MU3MoUI="
        Public Key ID:
                sha1:cf70ac9e7993aaaf88a36e35383de1fb0170e4e4
                sha256:f60473d34377c4a094027fde23d4efb19deba0a36101d6c3ed7a3e314dcca142
        Public Key PIN:
                pin-sha256:9gRz00N3xKCUAn/eI9TvsZ3roKNhAdbD7Xo+MU3MoUI=

- Certificate[1] info:
 - subject `CN=WR2,O=Google Trust Services,C=US', issuer `CN=GTS Root R1,O=Google Trust Services LLC,C=US', serial 0x7ff005a07c4cded100ad9d66a5107b98, RSA key 2048 bits, signed using RSA-SHA256, activated `2023-12-13 09:00:00 UTC', expires `2029-02-20 14:00:00 UTC', pin-sha256="YPtHaftLw6/0vnc2BnNKGF54xiCA28WFcccjkA4ypCM="
- Certificate[2] info:
 - subject `CN=GTS Root R1,O=Google Trust Services LLC,C=US', issuer `CN=GlobalSign Root CA,OU=Root CA,O=GlobalSign nv-sa,C=BE', serial 0x77bd0d6cdb36f91aea210fc4f058d30d, RSA key 4096 bits, signed using RSA-SHA256, activated `2020-06-19 00:00:42 UTC', expires `2028-01-28 00:00:42 UTC', pin-sha256="hxqRlPTu1bMS/0DITB1SSu0vd4u/8l8TjPgfaAp63Gc="
- Status: The certificate is trusted.
- Description: (TLS1.3-X.509)-(ECDHE-X25519)-(ECDSA-SECP256R1-SHA256)-(AES-256-GCM)
- Session ID: A2:5D:01:EC:9D:5D:2D:80:24:F9:3A:35:5C:E5:4F:65:72:39:04:62:08:59:43:36:12:DB:D7:C2:63:CC:6D:2A
- Options:
- Handshake was completed

- Simple Client Mode:

➜  linux git:(master) ✗ openssl s_client -connect google.com:443
Connecting to 2a00:1450:4007:818::200e
CONNECTED(00000006)
depth=2 C=US, O=Google Trust Services LLC, CN=GTS Root R1
verify return:1
depth=1 C=US, O=Google Trust Services, CN=WR2
verify return:1
depth=0 CN=*.google.com
verify return:1
---
Certificate chain
 0 s:CN=*.google.com
   i:C=US, O=Google Trust Services, CN=WR2
   a:PKEY: id-ecPublicKey, 256 (bit); sigalg: RSA-SHA256
   v:NotBefore: Aug 12 06:33:49 2024 GMT; NotAfter: Nov  4 06:33:48 2024 GMT
 1 s:C=US, O=Google Trust Services, CN=WR2
   i:C=US, O=Google Trust Services LLC, CN=GTS Root R1
   a:PKEY: rsaEncryption, 2048 (bit); sigalg: RSA-SHA256
   v:NotBefore: Dec 13 09:00:00 2023 GMT; NotAfter: Feb 20 14:00:00 2029 GMT
 2 s:C=US, O=Google Trust Services LLC, CN=GTS Root R1
   i:C=BE, O=GlobalSign nv-sa, OU=Root CA, CN=GlobalSign Root CA
   a:PKEY: rsaEncryption, 4096 (bit); sigalg: RSA-SHA256
   v:NotBefore: Jun 19 00:00:42 2020 GMT; NotAfter: Jan 28 00:00:42 2028 GMT
---
Server certificate
-----BEGIN CERTIFICATE-----
-----END CERTIFICATE-----
subject=CN=*.google.com
issuer=C=US, O=Google Trust Services, CN=WR2
---
No client certificate CA names sent
Peer signing digest: SHA256
Peer signature type: ECDSA
Server Temp Key: X25519, 253 bits
---
SSL handshake has read 6589 bytes and written 398 bytes
Verification: OK
---
New, TLSv1.3, Cipher is TLS_AES_256_GCM_SHA384
Server public key is 256 bit
This TLS version forbids renegotiation.
Compression: NONE
Expansion: NONE
No ALPN negotiated
Early data was not sent
Verify return code: 0 (ok)
---
```
