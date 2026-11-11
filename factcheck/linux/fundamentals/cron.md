---
article: docs/linux/fundamentals/cron.md
checked: '2026-11-11'
commit: f92e365b9bfeca0902617445b3a001b40992e40f
sources: []
unpinned: 4
---

# docs/linux/fundamentals/cron.md

## Findings

- L60 ERROR corrigé : paragraphe réécrit : cron.hourly/daily/weekly/monthly prennent des scripts exécutés par run-parts, avertissement "pas de point dans le nom sur Debian/Ubuntu", cron.d expliqué comme fichiers au format crontab avec champ utilisateur (exemple ajouté), même règle de nommage. Preuve : debian:bookworm-20241016, debianutils 5.7 : `run-parts --test /t` avec backup.sh et backup exécutables -> seul `/t/backup` listé ; cron 3.0pl1-162 cron.8 L238-248 ("any file containing dots will be ignored") et L266-274 (cron.d, "cannot contain any dots"), L93-97 (cron.d "include the user field") ; rockylinux:9.3 cronie 1.5.7 : `run-parts /t` exécute bien backup.sh (contrainte propre à Debian)
- L43 IMPRECISE corrigé : spool `/var/spool/cron/crontabs/<user>` sur Debian/Ubuntu, `/var/spool/cron/<user>` sur RHEL/Rocky/Alma, plus "on passe par crontab -e". Preuve : Debian bookworm + cron : `/var/spool/cron/crontabs` présent ; rockylinux:9.3 + cronie 1.5.7 : `crontab -u u -` crée `/var/spool/cron/u`
- L66 IMPRECISE corrigé : défaut = propriétaire de la crontab, `MAILTO=""` coupe l'envoi, MTA local nécessaire, exemple ajouté. Preuve : cron 3.0pl1-162 crontab.5 L71-73 "If MAILTO is defined (and non-empty), mail is sent to the user so named. If MAILTO is defined but empty (MAILTO=""), no mail will be sent. Otherwise mail is sent to the owner of the crontab." ; MTA : cron.8 L124-126 (sortie envoyée par mail), le besoin d'un MTA local n'est pas cité mot pour mot
- L75 IMPRECISE corrigé : phrase remplacée par la liste des endroits où chercher (spool selon distribution, /etc/crontab, /etc/cron.d/, dossiers cron.*). Preuve : mêmes tests que L43 et L60

## En plus

- L9 : admonition `!!! warning Systemd Equivalent` sans guillemets : MkDocs lit "Systemd" et "Equivalent" comme classes CSS et affiche le titre par défaut "Warning". Titre mis entre guillemets. Preuve : syntaxe Python-Markdown admonition `!!! type "title"` (non testé au rendu)
- L66 : coquille "l'envoie de mail" -> "l'envoi par mail"

## Modernisation

- Appliqué : `OnCalendar=` et `systemd-analyze calendar "*-*-* 03:30:00"` dans l'admonition systemd. Preuve : debian:bookworm-20241016 + systemd 252.39 : `systemd-analyze calendar "*-*-* 03:30:00" --iterations=2` affiche Normalized form et les 2 prochains déclenchements

## Tests

- debian:bookworm-20241016 (debianutils 5.7, cron 3.0pl1-162, systemd 252.39), rockylinux:9.3 (cronie 1.5.7), tous en --rm
- markdownlint-cli2 0.23.0, check_code_blocks.py : OK

## À signaler

- Le wiki n'a pas d'article sur les timers systemd (docs/linux/systemd/ ne contient que create_unit.md) : un lien depuis l'admonition serait utile si l'auteur en écrit un
- Article en "nous/vous" : non converti en "on" hors des phrases réécrites
