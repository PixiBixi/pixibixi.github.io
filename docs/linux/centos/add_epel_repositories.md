---
description: "Installer le dépôt EPEL sur RHEL, CentOS Stream, Rocky et AlmaLinux 8, 9 et 10 : paquet epel-release, activation de CRB/PowerTools indispensable, epel-next, installation hors ligne et dépannage."
tags:
  - EPEL
  - CentOS
  - rpm
---

# Ajouter le dépôt EPEL sur RHEL, Rocky et AlmaLinux

EPEL (Extra Packages for Enterprise Linux) est le dépôt maintenu par le projet Fedora qui apporte sur la famille RHEL les paquets que Red Hat ne fournit pas : `htop`, `tmux`, `nginx`, `fail2ban`, `ansible` et quelques milliers d'autres. L'installation tient en une commande, mais elle est incomplète sans une seconde que la moitié des tutos oublient.

## Rocky, AlmaLinux et CentOS Stream

Le paquet est dans les dépôts de base, donc rien à télécharger :

```bash
dnf install epel-release
```

Puis on active `CRB` (CodeReady Builder), qui contient les bibliothèques de développement dont beaucoup de paquets EPEL dépendent. Sans lui, l'installation échoue plus tard sur des dépendances introuvables et l'erreur ne mentionne jamais CRB :

```bash
# EL9 et EL10
dnf config-manager --set-enabled crb

# EL8, le dépôt s'appelait PowerTools
dnf config-manager --set-enabled powertools
```

Si `dnf config-manager` n'existe pas, c'est que le plugin manque :

```bash
dnf install dnf-plugins-core
```

## RHEL

Sur un RHEL enregistré, CRB s'active par `subscription-manager` et le nom du dépôt dépend de la version et de l'architecture :

```bash
subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms
dnf install https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm
```

Pour RHEL 8 ou 10, remplacer le `9` aux deux endroits. L'URL `epel-release-latest-N` suit toujours la dernière version du paquet, elle ne se périme pas.

## Vérifier que c'est en place

```bash
dnf repolist enabled | grep -iE 'epel|crb|powertools'
rpm -qi epel-release
```

Un `dnf repolist` qui affiche `epel` sans `crb` est exactement la configuration qui marche pour les paquets simples et casse sur les autres, plusieurs jours plus tard.

## epel-next et quand en avoir besoin

Sur CentOS Stream uniquement, `epel-next` complète EPEL pour les paquets qui doivent être recompilés en avance de phase, parce que Stream est en amont de RHEL. Sur Rocky, Alma ou RHEL, il n'a pas lieu d'être :

```bash
dnf install epel-next-release
```

## Installer sans accès Internet

Sur une machine isolée, on récupère le RPM depuis un poste connecté et on l'installe à la main. Le paquet ne fait que déposer des fichiers `.repo` et la clé GPG, il faudra ensuite pointer les `baseurl` vers un miroir interne :

```bash
curl -O https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm
rpm -ivh epel-release-latest-9.noarch.rpm
```

## Limiter EPEL à quelques paquets

EPEL est vaste et remplace parfois un paquet de base par une version plus récente, ce qui n'est jamais souhaitable en production. Deux garde-fous, à choisir selon le besoin.

Garder le dépôt désactivé et l'activer à la demande :

```bash
dnf config-manager --set-disabled epel
dnf --enablerepo=epel install htop
```

Ou l'autoriser en permanence sur une liste blanche de paquets :

```ini title="/etc/yum.repos.d/epel.repo"
[epel]
...
includepkgs=htop,tmux,fail2ban
```

## Les erreurs classiques

`Error: Failed to download metadata for repo 'epel'` sur un CentOS 7 vient de la fin de vie : CentOS 7 et EPEL 7 sont EOL depuis juin 2024, les miroirs ne servent plus ces dépôts et il faut basculer vers les archives ou, mieux, migrer.

`GPG check FAILED` signale que la clé n'est pas importée, ce qui arrive quand le RPM a été posé avec `--nogpgcheck` ou copié à la main :

```bash
rpm --import /etc/pki/rpm-gpg/RPM-GPG-KEY-EPEL-9
```

`Depsolve Error: nothing provides ...` sur un paquet EPEL, c'est CRB qui n'est pas activé 9 fois sur 10. On y revient toujours.
