---
article: docs/linux/security/ssh_log_commands.md
checked: '2026-11-10'
commit: 9e26912f2f04743b95bdfd3b00f5049e42ef7eb7
sources: []
unpinned: 6
---

# docs/linux/security/ssh_log_commands.md

## Findings

- L8 ERROR corrigé : paragraphe ajouté sous l'intro : ce n'est pas de l'audit (unset PROMPT_COMMAND, bash --norc, autre shell, ssh host 'cmd'/scp/sftp sans prompt, logger forgeable), renvoi vers auditd (execve) ou le session recording de sudo. Description front matter changée ("pour l'audit" retiré). Preuve : test Docker debian:12.7, après `unset PROMPT_COMMAND` la commande `echo secret` n'apparaît pas dans /var/log/commands.log.
- L27 ERROR corrigé : valeur de PROMPT_COMMAND entre simples quotes + phrase d'explication. Preuve : test Docker, la ligne de l'article ne produit qu'une seule entrée de log (la ligne export elle-même, `[]` en code retour), puis rien pour `ls /nonexistent` ni `cd /tmp` ; la version corrigée logge `ls /nonexistent [2]` et `cd /tmp [0]`.
- L27 ERROR corrigé : regex `[0-9]'+` remplacée par `[0-9]\+`. Preuve : même test, avec l'ancienne regex la sortie garde le numéro d'historique ("    1  export ..."), avec la nouvelle il est retiré.
- L16 IMPRECISE corrigé : `/etc/bash.bashrc` (Debian/Ubuntu, sourcé par /etc/profile pour les shells de login) ou `/etc/bashrc` (RHEL). Preuve : debian:12.7 `/etc/bash.rc` absent, `/etc/bash.bashrc` présent, /etc/profile:15-16 le source ; rockylinux:9.3 `/etc/bashrc` présent, sourcé par /etc/skel/.bashrc:4-5.
- L47 IMPRECISE corrigé : ajout de "rsyslog n'est plus installé par défaut depuis Debian 12" + `apt install rsyslog`, règle placée dans `/etc/rsyslog.d/commands.conf`. Preuve : notes de version bookworm 5.1.7 "From bookworm, rsyslog is no longer installed by default." ; test Docker avec la règle dans rsyslog.d, fichier alimenté.
- L66 IMPRECISE corrigé : bloc logrotate remplacé par un fichier dédié `/etc/logrotate.d/commands` (plus d'astérisques markdown dans le code), postrotate via `/usr/lib/rsyslog/rsyslog-rotate`. Preuve : `logrotate -d /etc/logrotate.d/commands` sans erreur, script rsyslog-rotate présent dans rsyslog 8.2302.0-1+deb12u1.

## En plus

- Liste `*` de la section "2 moyens" réécrite en `-` (liste modifiée).

## Modernisation

- auditd / sudo session recording : mentionné comme vraie solution d'audit, sans en faire un tuto (non testé).
- "auditd est le standard" : pas de réécriture autour de Snoopy, lien conservé.

## Tests

- Docker debian:12.7 : bash 5.2.15-2+b7, rsyslog 8.2302.0-1+deb12u1, logrotate 3.21.0-1, shell interactif `bash --norc -i` alimenté par stdin. rockylinux:9.3 pour le chemin /etc/bashrc. `tested_with` ajouté : Bash 5.2 (Debian 12), rsyslog 8.2302.

## À signaler

- La ligne d'exemple de résultat (format journalctl `nov. 04 ...`) est laissée telle quelle.
