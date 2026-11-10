---
description: Résoudre l'erreur MOZILLA_PKIX_ERROR_REQUIRED_TLS_FEATURE_MISSING dans nginx - OCSP Stapling et resolver
tags:
  - nginx
  - HAProxy
tested_with:
  - "nginx 1.27"
---

# Troubleshooting TLS : MOZILLA_PKIX_ERROR

Une erreur courante avec Mozilla Firefox est l'erreur
MOZILLA_PKIX_ERROR_REQUIRED_TLS_FEATURE_MISSING.

Firefox la lève quand le certificat porte l'extension OCSP Must-Staple et que le serveur n'agrafe pas de réponse OCSP au handshake. Personnellement, j'ai souvent rencontré cette erreur avec des certificats Let's Encrypt créés avec l'argument **--must-staple**.

!!! warning "Let's Encrypt n'a plus d'OCSP"
    Let's Encrypt refuse toute demande Must-Staple depuis le 7 mai 2025 et a coupé ses répondeurs OCSP le 6 août 2025. Un vieux certificat Must-Staple ne peut donc plus être agrafé : on le renouvelle sans `--must-staple`, et `ssl_stapling` ne sert plus à rien pour ces certificats. La suite ne vaut que pour une autre CA qui fait encore de l'OCSP.

nginx ne va chercher la réponse OCSP qu'à la première connexion TLS, par worker : juste après un start ou un reload, le premier client n'a pas d'agrafe, et avec Must-Staple Firefox refuse la connexion. Même chose si la requête vers le répondeur OCSP échoue.

Le resolver joue là-dessus. Sans directive `resolver`, nginx n'est pas aveugle : il réutilise les IPs du répondeur résolues au chargement de la config (warning `no resolver defined to resolve ...` dans les logs). Si ces IPs changent (répondeur derrière un CDN), les requêtes OCSP échouent et l'agrafe disparaît. Si le nom ne résolvait pas au chargement, nginx ignore carrément `ssl_stapling` (`"ssl_stapling" ignored, host not found in OCSP responder`).

Au niveau du nginx, on déclare donc un resolver :

```nginx
http {
    ...
    resolver 1.1.1.1 valid=300s;
    ...
}
```

Et au niveau de notre server-block (par ex: sites-enabled/coucou.fr) :

```nginx
server {
    listen 443 ssl;
    server_name coucou.fr;
    ssl_certificate /etc/letsencrypt/live/coucou.fr-0002/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/coucou.fr-0002/privkey.pem; # managed by Certbot
    ssl_stapling on;
}
```

Il faut vérifier que vous ayez la variable **ssl_stapling** à **on**. Un `nginx -s reload` suffit à prendre en compte le resolver, pas besoin de restart. Un resolver injoignable est pire que pas de resolver du tout : les requêtes OCSP échouent toutes.

On vérifie que l'agrafe est bien servie (lancer 2 fois, la première connexion peut ne pas en avoir) :

```bash
echo | openssl s_client -connect coucou.fr:443 -servername coucou.fr -status 2>/dev/null | grep -A2 'OCSP response:'
```

Étant donné que nous donnons la chaîne complète en tant que **ssl_certificate** à nginx, nous n'avons pas besoin de spécifier **ssl_trusted_certificate** tant que **ssl_stapling_verify** reste à `off` (le défaut). Avec `ssl_stapling_verify on`, il faut un **ssl_trusted_certificate** contenant le certificat de l'émetteur, la racine et les intermédiaires.
