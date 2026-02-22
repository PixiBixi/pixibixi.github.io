---
description: Installer et configurer les dépôts EPEL pour CentOS et Red Hat Enterprise Linux
---

# Ajouter les repositories EPEL

Les repositories EPEL (Extra Packages for Enterprise Linux) sont
extrêmements importants pour les utilisateurs de CentOS. Sous forme de
package, celui-ci ajoute simplement une liste de repository.
Initialement, l'EPEL est un groupe au sein du Projet Fedora. Les
repositories EPEL peuvent être utilisés dans les projets suivants :

* Red Hat Enterprise Linux
* CentOS
* Scientific Linux
* Oracle Linux

## Installation

Pour installer le package, rien de plus simple :

```bash
yum install epel-release
```

La liste des packages disponible dans EPEL est disponible
[ici](https://dl.fedoraproject.org/pub/epel/7/x86_64/Packages/). Nous
voyons par exemple que les paquets *htop* ou encore *tmux* sont fournis
par ces repositories.
