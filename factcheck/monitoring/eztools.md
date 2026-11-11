---
article: docs/monitoring/eztools.md
checked: '2026-11-10'
commit: 90593c9924ff3ab932edb148cee51e06b19e5012
sources: []
unpinned: 6
---

# docs/monitoring/eztools.md

## Findings

- L25 ERROR corrigé : `wget -O` écrit maintenant `ezservermonitor-sh_v2.3.zip`, le nom que vise l'`unzip`. Preuve : `curl -sI` sur l'URL renvoie `content-disposition: attachment; filename="ezservermonitor-sh_v2.3.zip"`, et `unzip -l` de l'archive téléchargée contient `eZServerMonitor.sh` à la racine.
- L50 ERROR corrigé : `mv ... && move ...` remplacé par `sudo mv eZServerMonitor.sh /usr/local/bin/monitor` (renommage en `monitor` comme le dit la phrase d'avant, `/usr/local/bin` plutôt que `/usr/bin` géré par le paquet). Preuve : `move` n'existe pas sous Linux.
- L119 ERROR corrigé : `listen 443 ssl spdy;` remplacé par `listen 443 ssl;` + `http2 on;`, et ajout de `ssl_certificate`/`ssl_certificate_key` (sans eux `nginx -t` échoue sur un listen ssl). Preuve : nginx:1.27.3-alpine `nginx -t` avec `spdy` : `[emerg] invalid parameter "spdy"`; le nouveau bloc passe `test is successful`.
- L143 ERROR corrigé : `deny all;` retiré du `location ^~ /monitor/`. Preuve : nginx:1.27.3-alpine, location avec auth_basic + deny all : 403 avec et sans identifiants; sans deny all : 401 sans identifiants, 200 avec.
- L153 IMPRECISE corrigé : le fichier est `conf/esm.config.json`. Preuve : ezservermonitor-web `libs/Utils/Config.php:12` (`__DIR__.'/../../conf/esm.config.json'`) @29c94ee.
- L160 IMPRECISE corrigé : `last_login` décrit avec `enable` et `max` (5 par défaut). Preuve : ezservermonitor-web `conf/esm.config.json` @29c94ee.

## En plus

- L159 (hosts) corrigé : la clé est `ping.hosts`, pas `hosts`; `show_tmpfs` nommé pour `disk`. Preuve : `conf/esm.config.json` @29c94ee.
- L18 corrigé : "Voici le rendu :" ne suivait aucune image, phrase coupée.

## Modernisation

- Appliquée : une phrase dans le préambule signale que les 2 projets ne bougent plus (dernier commit 2020-12-10 pour ezservermonitor-sh @ae692b3, 2023-07-18 pour ezservermonitor-web @29c94ee) et renvoie vers `lgtm/simple_monitoring_stack.md` (Netdata, Prometheus, Grafana).

## Tests

- nginx:1.27.3-alpine (Docker/OrbStack) : `nginx -t` et curl sur auth_basic.
- Téléchargement réel de l'archive v2.3 depuis ezservermonitor.com (dans le scratchpad).

## À signaler

- Aucune capture d'écran dans l'article alors que le texte en annonçait une.
- Le site ezservermonitor.com sert toujours la v2.3 du script; la version Web courante est 2.5.
