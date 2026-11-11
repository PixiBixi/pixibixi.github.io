---
article: docs/misc/optimization.md
checked: '2026-11-11'
commit: 691d111aa2c50524616091e71fdce8599f115851
sources: []
unpinned: 3
---

# docs/misc/optimization.md

## Findings

- L13 OUTDATED corrigé : lien Buzut nginx passé de buzut.fr à buzut.net (le blog a changé de domaine, même slug). Preuve : `curl -L https://buzut.fr/optimiser-nginx/` 404, `https://buzut.net/optimiser-nginx/` 200 titre "Optimisez Nginx pour de meilleurs performances", la Wayback de l'ancienne URL redirige vers buzut.net.
- L14 OUTDATED corrigé : lien Linode remplacé par sa cible actuelle `https://www.linode.com/docs/guides/getting-started-with-nginx-part-2-advanced-configuration/` et libellé mis à jour. Preuve : snapshot Wayback 2025-10-02 de l'ancienne URL = 301 vers ce guide, guide archivé en 200 le 2026-01-04. L'étape suivante (redirection vers akamai.com) n'a pas pu être confirmée : linode.com et akamai.com répondent 403 à curl (protection anti-bot).
- L28 OUTDATED corrigé : lien Buzut MySQL passé sur buzut.net, "(Buzut)" ajouté au libellé comme pour nginx. Preuve : `https://buzut.net/optimiser-performances-de-mysql/` 200, titre "Optimisez les performances de MySQL (InnoDB)".

## En plus

- L15-16 : liens mnot.net et serversforhackers.com mis à jour vers leur URL finale (`https://mnot.net/cache_docs/`, `https://serversforhackers.com/c/nginx-caching`). Preuve : `curl -L -w %{url_effective}`.

## Modernisation

- Aucune suggestion fournie.

## Tests

- curl (liens), API Wayback Machine.

## À signaler

- Le lien Medium (L20) répond 403 à curl, probablement anti-bot, non vérifié dans un navigateur.
- Le contenu des guides Buzut est ancien (archives 2019-2021), à juger par l'auteur.
