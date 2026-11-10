---
description: Installer une version spécifique de PHP sur Debian/Ubuntu avec le dépôt Sury
tags:
  - nginx
  - PHP
---

# Installer une version custom de PHP

!!! warning "Article déprécié"
    Aujourd'hui, nous sommes en PHP 8.x, la méthode reste toujours valable, mais renseignez-vous sur la [version de PHP](https://www.php.net/supported-versions.php)

Ajout du repo, comme le fait le [README du dépôt](https://packages.sury.org/php/README.txt) : la clé vient du paquet `debsuryorg-archive-keyring` (elle se met à jour avec `apt`) et la source la cite en `signed-by`. `curl` n'est pas forcément présent sur une Debian minimale, on l'installe avec le reste :

```bash
apt-get update
apt-get install -y lsb-release ca-certificates curl
curl -sSLo /tmp/debsuryorg-archive-keyring.deb https://packages.sury.org/debsuryorg-archive-keyring.deb
dpkg -i /tmp/debsuryorg-archive-keyring.deb
echo "deb [signed-by=/usr/share/keyrings/debsuryorg-archive-keyring.gpg] https://packages.sury.org/php/ $(lsb_release -sc) main" > /etc/apt/sources.list.d/php.list
```

Le dépôt publie aussi les suites Ubuntu (`noble`, `jammy`), mais sur Ubuntu Sury documente plutôt son PPA : `add-apt-repository ppa:ondrej/php`.

Puis un petit update/install php8.x et le tour est joué. Voir [Installer son Serveur Web : nginx, PHP-FPM et MariaDB](installation.md) pour l'intégration avec nginx et la configuration PHP-FPM.

```bash
apt update && apt install -y php8.4-fpm
```

On vise une branche encore supportée : 8.2 ne reçoit plus que des correctifs de sécurité jusqu'au 31 décembre 2026, 8.4 est couverte jusqu'à fin 2028 et 8.5 jusqu'à fin 2029.

## Voir aussi

* [Installer son Serveur Web : nginx, PHP-FPM et MariaDB](installation.md) - Configuration complète de PHP-FPM avec nginx
* [PHP avec Sury sur Debian](../php/sury.md) - clé du dépôt, pinning et patch de CVE avec Ansible
