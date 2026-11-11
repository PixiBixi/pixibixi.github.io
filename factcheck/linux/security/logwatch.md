---
article: docs/linux/security/logwatch.md
checked: '2026-11-11'
commit: 3868f220de0c4ab0392899133c94f5f31116a82b
sources: []
unpinned: 2
---

# docs/linux/security/logwatch.md

## Findings

- L21 IMPRECISE corrigé : « analyser les logiciels installés » remplacé par `Service = All` (tous les services dont les logs sont trouvés), plus un paragraphe : logwatch ne lit pas journald, sur Debian 12+ sans rsyslog `/var/log/syslog` n'existe plus, installer `rsyslog`. Preuve : debian:13.1, logwatch 7.12-3, `/usr/share/logwatch/default.conf/logwatch.conf:121 Service = All`, `ls /var/log/syslog` -> No such file, `grep -r journal /usr/share/logwatch/default.conf` -> vide.
- L26 IMPRECISE corrigé : le rapport quotidien vient de `/etc/cron.daily/00logwatch` (`logwatch --output mail`), défauts `Range = yesterday`, `MailTo = root`, et lancé à la main la sortie est stdout. Preuve : même conteneur, `cat /etc/cron.daily/00logwatch` et logwatch.conf L63 `# Output = stdout`, L75 `# MailTo = root`, L109 `# Range = yesterday`; `logwatch --range today` affiche « Type of Output/Format: stdout / text ».

## En plus

- L10-13 corrigé : « il sera nécessaire d'installer un MTA » remplacé par : le paquet dépend de `default-mta | mail-transport-agent`, APT installe exim4 si aucun MTA n'est présent (typo « Etant donner » supprimée au passage). Preuve : `apt-cache show logwatch` -> `Depends: default-mta | mail-transport-agent, ...`; exim4-daemon-light installé même avec `--no-install-recommends`.
- Front matter : `tested_with: "Logwatch 7.12 (Debian 13)"` ajouté (testé dans ce pass).

## Modernisation

- Aucune suggestion.

## Tests

- Docker `debian:13.1`, logwatch 7.12-3.

## À signaler

- Rien.
