---
description: Installer une version spécifique de PHP sur Debian/Ubuntu avec le dépôt Sury
tags:
  - nginx
  - PHP
---

# Installer une version custom de PHP

!!! warning Article déprécié
    Aujourd'hui, nous sommes en PHP 8.x, la méthode reste toujours valable, mais renseignez-vous sur la [version de PHP](https://www.php.net/supported-versions.php)

Ajout du repo :

```bash
apt-get install apt-transport-https lsb-release ca-certificates
wget -O /etc/apt/trusted.gpg.d/php.gpg https://packages.sury.org/php/apt.gpg
echo "deb https://packages.sury.org/php/ $(lsb_release -sc) main" > /etc/apt/sources.list.d/php.list
```

Puis un petit update/install php8.x, et le tour est joué. Voir [Installer son Serveur Web : NGINX, PHP-FPM et MariaDB](installation.md) pour l'intégration avec nginx et la configuration PHP-FPM.

```bash
apt update && apt install -y php8.2-fpm
```

## Voir aussi

* [Installer son Serveur Web : NGINX, PHP-FPM et MariaDB](installation.md) — Configuration complète de PHP-FPM avec nginx
