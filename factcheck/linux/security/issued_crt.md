---
article: docs/linux/security/issued_crt.md
checked: '2026-11-11'
commit: 805c60265f8947b7d31d02f369f86ba310561494
sources: []
unpinned: 3
---

# docs/linux/security/issued_crt.md

## Findings

- L26 IMPRECISE corrigé : `docker run -it --rm postgres psql` -> `docker run --rm postgres psql`, avec une phrase expliquant pourquoi. Preuve : `docker run -it --rm postgres:17.6 true </dev/null` -> « cannot attach stdin to a TTY-enabled container because stdin is not a terminal »; le script sans `-it` renvoie bien la liste (testé sans TTY).
- L33 IMPRECISE corrigé en partie : ajout d'une validation de `$1` (`^[A-Za-z0-9.-]+$`) avant interpolation SQL, et mention que le domaine apex n'est pas renvoyé. Rejeté pour la partie wildcards : `*.jdelgado.fr` est bien renvoyé par `LIKE '%.domaine'`. Preuve : exécution du script sur jdelgado.fr -> ligne `*.jdelgado.fr` présente, pas de `jdelgado.fr` seul; `./script "x');drop"` -> « Invalid domain name ».
- L34 IMPRECISE corrigé : mention que la base publique est best-effort (connexion parfois refusée, requêtes longues annulées). Constat du jour : la connexion marche (`select 1` OK, requête complète en ~30 s); le premier essai avec `timeout 40` n'a rien renvoyé, cohérent avec l'instabilité signalée.

## En plus

- Rien d'autre.

## Modernisation

- Appliqué : alternative `curl 'https://crt.sh/?q=%25.mydomain.eu&output=json' | jq -r '.[].name_value' | tr 'A-Z' 'a-z' | sort -u` (testée : HTTP 200, liste cohérente avec psql).
- Ignoré : Cert Spotter / certstream (alerte, hors sujet d'un article de listing).

## Tests

- Docker `postgres:17.6` (psql) contre crt.sh:5432, curl + jq sur l'endpoint JSON, le 2026-11-09.

## À signaler

- Rien.
