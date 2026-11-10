---
description: Configurer Logwatch pour générer et envoyer des rapports d'analyse de logs système par e-mail
tags:
  - Logwatch
  - Logs
tested_with:
  - "Logwatch 7.12 (Debian 13)"
---

# Installer et configurer Logwatch

Logwatch est un petit utilitaire qui permet d'envoyer un rapport sur
diverses informations tel que les tentatives d'accès infructueuses,
erreurs kernel... Il envoie les rapports par mail, il faut donc un MTA : le paquet Debian dépend de `default-mta | mail-transport-agent`, APT installe exim4 si aucun MTA n'est déjà présent.

Simple installation via APT :

```bash
apt install logwatch
```

Par défaut (`Service = All`), sans configuration, logwatch passe sur tous les services dont il trouve les logs pour générer son rapport. Pour mon cas par exemple, il contient les drop d'iptables et diverses informations sur apache2.

Logwatch ne lit que des fichiers de logs, pas le journal systemd. Sur Debian 12+ sans rsyslog, `/var/log/syslog` n'existe plus et le rapport est bien maigre : on installe `rsyslog` si on veut retrouver les sections kernel, sshd, iptables...

Sur Debian, un rapport par jour (`Range = yesterday`) est envoyé à root (`MailTo = root`) par `/etc/cron.daily/00logwatch`, qui lance `logwatch --output mail`. Lancé à la main, logwatch affiche le rapport sur la sortie standard (`Output = stdout`).

Il est possible de modifier le comportement en modifiant
**/etc/logwatch/conf/logwatch.conf**. Il n'est pas recommandé
d'overwrite les valeurs par défaut fourni dans
**/usr/share/logwatch/default.conf/logwatch.conf**

```bash
echo "MailTo=bla@bla.fr" > /etc/logwatch/conf/logwatch.conf
```

On peut également forcer la destination avec l'argument **--mailto**.

Vous pouvez customiser le rapport en copiant les différents fichiers de
configuration fournis par défaut par logwatch depuis
/usr/share/logwatch/default.conf dans les différents répertoires
adéquates /etc/logwatch/conf
