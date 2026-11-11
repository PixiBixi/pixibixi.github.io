---
article: docs/web/mail.md
checked: '2026-11-11'
commit: eafbae20ab51de09d4d8f32ef5fce66e0610b6db
sources: []
unpinned: 5
---

# docs/web/mail.md

## Findings

- L19 OUTDATED corrigé : admonition `danger` en tête : stack abandonnée, à ne plus déployer, renvoi vers docker-mailserver ; compose gardé "à titre historique". Preuve : `gh api repos/hardware/mailserver` archived=true, pushed_at 2020-01-01, description ":warning: UNMAINTAINED" ; docker-mailserver actif (release v17.0.0 du 2026-11-05).
- L67 OUTDATED corrigé : même admonition (hardware/rainloop et RainLoop archivés, SnappyMail ou Roundcube proposés). Preuve : hardware/rainloop archived=true, pushed_at 2019-08-15 ; RainLoop/rainloop-webmail archived=true, dernière release v1.17.0 2022-08-31 ; the-djmaze/snappymail actif (push 2026-11-08). Les CVE XSS citées par le fact-check ne sont pas vérifiées et ne sont pas mentionnées.
- L96 OUTDATED corrigé : signalé dans l'admonition ("pas de release depuis 2019") ; image laissée à `redis:4.0-alpine` dans le compose historique. Preuve : tag redis 4.0.14 daté du 2019-03-18 (dernier 4.x). Date officielle d'EOL non vérifiée.
- L8 IMPRECISE corrigé : titre -> "Serveur mail Postfix/Dovecot/rspamd/DKIM sous Docker" (Postgrey absent), première phrase ajustée. Preuve : contenu de l'article.
- L14 IMPRECISE corrigé : "permet" -> "permettait", paragraphe ajouté sur PTR/SPF/DKIM/DMARC avec exemple d'enregistrements TXT SPF et DMARC. Preuve : support.google.com/a/answer/81126 (WebFetch) : les expéditeurs de plus de 5 000 messages par jour doivent configurer SPF, DKIM et DMARC, à partir du 1er février 2024.

## En plus

- Typos "écris" et "collège" corrigées (phrase réécrite, "collègue").

## Modernisation

- docker-mailserver / SnappyMail / Roundcube : appliqué sous forme de recommandation dans l'admonition, pas de nouveau compose (non testé, ce serait une réécriture complète).
- SPF/DKIM/DMARC : appliqué.
- MariaDB/Redis maintenus : non appliqué dans le compose, le couple hardware/mailserver + Redis 7 n'est pas testé. Mentionné dans l'admonition. `webhippie/mariadb` : le dépôt GitHub du même nom renvoie 404 (non concluant pour l'image Docker Hub).
- Mail Yahoo : non mentionné (seule la page Google a été vérifiée).

## Tests

- Aucun container lancé. `gh api` pour l'état des dépôts, WebFetch sur la page d'aide Google.

## À signaler

- L'article n'a plus de valeur pratique en l'état : à réécrire autour de docker-mailserver (compose, DKIM 2048 bits, rspamd) ou à archiver. Décision à l'auteur.
- L'enregistrement SPF `v=spf1 mx -all` suppose que le MX est aussi l'émetteur : à adapter.
