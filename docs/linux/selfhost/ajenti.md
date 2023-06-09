# Gérer son serveur en ligne via Ajenti

![](/ajenti.jpg)

A l'instar de Webmin ou encore Vesta, Ajenti est un panel
d'administration de serveur. Simple et efficace, il vous permettra
d'effectuer la grande majorité des actions courantes (Reboot du
serveur, edition des configurations, du firewall...)

## Installation

Pour l'installer, il vaut mieux utiliser la source officielle. Les
packages Debian étant assez vieux.

```bash
$ echo "deb http://repo.ajenti.org/ng/debian main main" >> /etc/apt/sources.list
$ wget http://repo.ajenti.org/debian/key -O- | apt-key add -
```

Puis on installe le package

```bash
$ apt-get update && apt-get install ajenti
```

Si l'installation est bonne, vous pourrez accéder à ajenti via le port
8000, les identifiants par défaut sont **root** et **admin**
