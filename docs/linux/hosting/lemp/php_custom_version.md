# Installer une version custom de PHP

!!! warning Article déprécié
    Aujourd'hui, nous sommes en PHP 8.x, la méthode reste toujours valable, mais renseignez-vous sur la [version de PHP](https://www.php.net/supported-versions.php)

Ajout du repo :

```bash
apt-get install apt-transport-https lsb-release ca-certificates
wget -O /etc/apt/trusted.gpg.d/php.gpg https://packages.sury.org/php/apt.gpg
echo "deb https://packages.sury.org/php/ $(lsb_release -sc) main" > /etc/apt/sources.list.d/php.list
```

Puis un petit update/install php7.x, et le tour est joué

```bash
apt update && apt install -y php7.4-fpm
```
