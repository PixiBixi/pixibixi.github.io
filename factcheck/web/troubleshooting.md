---
article: docs/web/troubleshooting.md
checked: '2026-11-11'
commit: 1a305b2e6607925c99b0c34d21ed6459663d26ba
sources: []
unpinned: 5
---

# docs/web/troubleshooting.md

## Findings

- L40 ERROR corrigé : "un reload ne suffira pas, il faudra un restart" remplacé par "un `nginx -s reload` suffit". Preuve : nginx origin/HEAD src/http/modules/ngx_http_ssl_module.c:1407 appelle `ngx_ssl_stapling_resolver(cf, ...)` au chargement de la config ; test nginx:1.27.3 : après ajout de `resolver` et `nginx -s reload`, le nouveau worker interroge le resolver (`recv() failed ... while resolving, resolver: 127.0.0.11:53`) au lieu du warning `no resolver defined`.
- L14 OUTDATED corrigé : admonition "Let's Encrypt n'a plus d'OCSP" (Must-Staple refusé depuis le 7 mai 2025, répondeurs coupés le 6 août 2025, renouveler sans `--must-staple`). Preuve : <https://letsencrypt.org/2024/12/05/ending-ocsp/> "all requests including the OCSP Must Staple extension will fail" (May 7, 2025), "On this date we will turn off our OCSP responders" (August 6, 2025).
- L16 IMPRECISE corrigé : la cause est réécrite. Sans `resolver`, nginx agrafe quand même avec les IPs résolues au chargement (warning) ; le vrai problème est l'absence d'agrafe à la première connexion par worker et l'échec des requêtes OCSP quand les IPs changent ; si le nom ne résout pas au chargement, `ssl_stapling` est ignoré. Preuve : src/event/ngx_event_openssl_stapling.c:1422-1434 (`NGX_NO_RESOLVER` : error seulement si `naddrs == 0`, sinon warn puis `goto connect`) ; test nginx:1.27.3 + répondeur `openssl ocsp` local, sans resolver : 1re connexion `no response sent`, suivantes `Cert Status: good`, log `[warn] no resolver defined to resolve localhost` ; avec un responder non résolvable : `"ssl_stapling" ignored, host not found in OCSP responder`.
- L33 IMPRECISE corrigé : `server_name coucou.fr;` avec point-virgule, `listen 443 ssl;` ajouté, `valid=300s` sur le resolver. Le message cité par le fact-check est faux : `nginx -t` passe, mais avale `ssl_certificate` et le chemin dans `server_name`. Preuve : test nginx:1.27.3 du bloc d'origine : `[warn] server name "/c/fullchain.pem" has suspicious symbols`, `syntax is ok`. `ipv6=off` non ajouté (dépend de l'environnement).
- L44 IMPRECISE corrigé : `ssl_trusted_certificate` inutile seulement tant que `ssl_stapling_verify` est à off ; avec `on`, il faut émetteur, racine et intermédiaires. Preuve : nginx.org ngx_http_ssl_module (citation du fact-check, non relue en entier) ; cohérent avec le test (stapling OK sans `ssl_trusted_certificate`, verify off par défaut).

## En plus

- Explication de l'erreur Firefox (extension Must-Staple sans agrafe) ajoutée en tête, et commande `openssl s_client -status` pour vérifier. Preuve : la même commande a servi aux tests.
- Un resolver injoignable casse le stapling (pire que pas de resolver). Preuve : test avec `resolver 127.0.0.11` injoignable, `no response sent` à chaque connexion.

## Modernisation

- Retirer `--must-staple` / renouveler sans : appliqué dans l'admonition.

## Tests

- nginx:1.27.3 (Docker), CA et certificat de test avec AIA OCSP, répondeur `openssl ocsp -ndays 1` dans le conteneur, client `openssl s_client -status`. `tested_with: "nginx 1.27"` ajouté.

## À signaler

- Le tag `HAProxy` ne correspond à rien dans l'article, laissé tel quel.
- Avec la fin de l'OCSP chez Let's Encrypt, l'article pourrait être archivé ou fusionné ; décision laissée à l'auteur.
