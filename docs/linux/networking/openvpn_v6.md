# Configurer son serveur OpenVPN pour de l'IPv6

OpenVPN est un VPN dual-stack. Dans ce tutoriel, nous allons voir
comment apporter une connectivité v6 à vos clients, ce qui peut être
particulièrement utile afin d'accéder à des sites IPv6 uniquement.

Pour faire ce tutoriel, il faut déjà avoir un serveur avec une IPv6 en
/64 sur son interface WAN ainsi qu'un serveur OpenVPN déjà configuré.

## Configuration de l'OS

Tout d'abord, comme pour IPv4, il faut activer l'ip_forwarding

```bash
sed -i 0,/ipv6.conf.all/s/^#//g /etc/sysctl.conf
sysctl -p
```

Pour être sur que la modification soit appliquée, nous pouvons aller
voir ce fichier (Qui doit retourner 1)

```bash
cat /proc/sys/net/ipv6/conf/all/forwarding
```

Mais pour l'IPv6, nous avons un paramètre en plus à modifier,
**accept_ra** (Si vous acceptez votre IPv6 via RA)

L'accept_ra nous permet de configurer automatiquement IPv6, il existe 3
modes :

* **0** : Ne pas accepter de RA
* **1** : Accepter les RA
* **2** : Accepter les RA même si nous avons l'IPv6 forwarding
    d'activé

Vous l'avez donc comprit, il nous faut donc un accept_ra à 2

```bash
    echo "net.ipv6.conf.all.accept_ra=2" >> /etc/sysctl.conf
    sysctl -p
```

Et une nouvelle fois, nous vérifions que la valeur ait bien été
appliquée :

```bash
cat /proc/sys/net/ipv6/conf/all/accept_ra
```

## Configuration du serveur

Prenons en exemple ce range IPv6 : 2001:bc8:31d7:6e00:/56

Nous avons donc configuré 2001:bc8:31d7:6e00::/64 sur l'interface
publique de notre serveur. OpenVPN utilisera le prochain range
disponible, soit 2001:bc8:31d7:6e01:/64

Voici les modifications à appliquer à notre serveur pour qu'il soit
dual-stack :

* proto udp en proto udp6
* server-ipv6 2001:bc8:31d7:6e01:/64
* push '"route-ipv6 2000::/3'"

Une fois cette configuration faite, un restart de openvpn, et vous
devriez avoir une connectivité v6 sur votre hôte :

```bash
systemctl restart openvpn@server.service
```

Si votre fichier de configuration s'appelle server.conf (A adapter
sinon)
