---
description: Configuration VCL de Varnish et Vinyl Cache - cache des fichiers statiques, cookies, purge par ACL, en-têtes et config WordPress
tags:
  - Varnish
  - WordPress
  - Vinyl Cache
tested_with:
  - "Varnish 8.0"
  - "Vinyl Cache 9.0"
---

# Config varnish

2 configs VCL, adaptées de 2 gists ([générique](https://gist.github.com/davidthingsaker/6b0997b641fdd370a395), [WordPress](https://gist.github.com/dz0ny/1570859/05fa3a96b45ceb6a78e424be420bafdb9f072a7e)) qui datent de Varnish 3 et 4 : la seconde ne compilait plus du tout, la première mettait en cache les pages avec cookie de session.

Depuis la 9.0 (mars 2026), le projet open source s'appelle [Vinyl Cache](https://vinyl-cache.org/) : `varnishd` devient `vinyld` (`vinyllog`, `vinylstat`...), la config passe dans `/etc/vinyl-cache/`, le service s'appelle `vinyl-cache` et l'en-tête `X-Varnish` devient `X-Vinyl`. Le nom Varnish reste à une distribution aval de Varnish Software. Les 2 VCL compilent sur les 2, sans changement.

Le principe des 2 : on ne termine **pas** `vcl_recv` ni `vcl_backend_response` par un `return`. Varnish enchaîne alors sur son `builtin.vcl`, qui fait déjà le travail dangereux à refaire à la main :

- `vcl_recv` : `pass` sur tout ce qui n'est pas GET/HEAD, sur `Authorization` et sur `Cookie`
- `vcl_backend_response` : rien en cache si le backend envoie `Set-Cookie`, `Cache-Control: private`/`no-store`/`no-cache`, un TTL à 0 ou `Vary: *`

Un `return (hash)` ou `return (deliver)` en fin de sub court-circuite tout ça, et une page avec cookie de session finit servie à tout le monde.

On ne touche pas non plus à `Accept-Encoding` : avec `http_gzip_support` (actif par défaut), Varnish demande du gzip au backend, stocke une seule version compressée et la décompresse pour les clients qui ne savent pas la lire. `deflate` n'est pas géré, le normaliser ne fait que multiplier les variantes en cache.

## Config générique

Les fichiers statiques perdent leurs cookies dans les 2 sens et restent 5 jours en cache, `/blog` n'est jamais caché, et le reste suit les en-têtes du backend (1 jour s'il n'en envoie aucun).

```vcl title="/etc/vinyl-cache/default.vcl"
vcl 4.1;

backend default {
    .host = "127.0.0.1";
    .port = "8080";
}

sub vcl_recv {
    # Static files: drop cookies so the builtin can cache them
    if (req.url ~ "\.(js|css|jpe?g|png|gif|ico|svg|webp|woff2?|mp3|ogg|gz|tgz|bz2|zip)(\?.*)?$") {
        unset req.http.Cookie;
    }

    # Never cache the blog
    if (req.url ~ "^/blog") {
        return (pass);
    }

    # Laravel session-monster sets X-No-Session when the session cookie is not needed
    if (req.http.X-No-Session ~ "yeah" && req.method != "POST") {
        unset req.http.Cookie;
    }

    # No return: the builtin passes POST, Authorization and Cookie
}

sub vcl_backend_response {
    if (bereq.url ~ "\.(js|css|jpe?g|png|gif|ico|svg|webp|woff2?|mp3|ogg|gz|tgz|bz2|zip)(\?.*)?$") {
        unset beresp.http.Set-Cookie;
        set beresp.ttl = 5d;
    } elsif (!beresp.http.Cache-Control && !beresp.http.Expires) {
        set beresp.ttl = 1d;
    }

    unset beresp.http.Server;
    unset beresp.http.X-Powered-By;

    # No return: the builtin refuses Set-Cookie, private and no-store responses
}

sub vcl_deliver {
    # Browsers keep static files for a week
    if (req.url ~ "\.(js|css|jpe?g|png|gif|ico|svg|webp|woff2?)(\?.*)?$") {
        set resp.http.Cache-Control = "public, max-age=604800";
    }

    unset resp.http.Via;
    unset resp.http.X-Varnish;
    unset resp.http.X-Vinyl;
}
```

Le `Cache-Control` envoyé au navigateur est posé dans `vcl_deliver`, pas dans `vcl_backend_response` : écrasé avant le builtin, il masquerait un `private` du backend et la page partirait en cache. Pareil, on garde l'`ETag`, sinon le navigateur ne peut plus revalider et retélécharge tout.

## Config WordPress

En plus : purge par ACL, pas de cache sur l'admin, le login, les flux et les uploads, nettoyage des cookies de tracking (sinon chaque visiteur qui en a un passe en `pass`), et un cache séparé pour les mobiles. Nginx écoute sur 8080, Varnish devant.

```vcl title="/etc/vinyl-cache/default.vcl"
vcl 4.1;

backend default {
    .host = "127.0.0.1";
    .port = "8080";
    .first_byte_timeout = 300s;
}

acl purge {
    "127.0.0.1";
}

sub vcl_recv {
    call detect_device;
    set req.http.Host = regsub(req.http.Host, ":[0-9]+", "");

    if (req.method == "PURGE") {
        if (client.ip !~ purge) {
            return (synth(405, "This IP is not allowed to send PURGE requests."));
        }
        return (purge);
    }

    # Feeds, admin, login, uploads and xmlrpc
    if (req.url ~ "/feed" ||
        req.url ~ "/wp-(login|admin)" ||
        req.url ~ "(media-upload|async-upload|file|xmlrpc)\.php") {
        return (pass);
    }

    # Tracking cookies: has_js, Google Analytics, Quantcast, wp-settings, test cookie
    set req.http.Cookie = regsuball(req.http.Cookie, "(has_js|__utm.|_ga[^=]*|_gid|__qc.|wp-settings-1|wp-settings-time-1|wordpress_test_cookie)=[^;]+(; )?", "");
    if (req.http.Cookie ~ "^ *$") {
        unset req.http.Cookie;
    }

    # Theme assets
    if (req.url ~ "\.(css|js|png|gif|jpe?g|webp|svg|woff2?)(\?.*)?$") {
        unset req.http.Cookie;
    }

    # Logged-in users and commenters
    if (req.http.Cookie ~ "wordpress_|comment_") {
        return (pass);
    }

    # No return: the builtin passes POST, Authorization and remaining cookies
}

sub vcl_hash {
    # Separate cache for mobile clients (WPtouch)
    if (req.http.X-Device ~ "smart|other") {
        hash_data(req.http.X-Device);
    }
    # No return: the builtin adds the URL and the Host
}

sub detect_device {
    set req.http.X-Device = "desktop";

    if (req.http.User-Agent ~ "iP(hone|od)|Android") {
        set req.http.X-Device = "smart";
    } elsif (req.http.User-Agent ~ "SymbianOS|^BlackBerry|^SonyEricsson|^Nokia|^SAMSUNG|^LG") {
        set req.http.X-Device = "other";
    }
}

sub vcl_backend_response {
    if (bereq.url ~ "\.(css|js|png|gif|jpe?g|webp|svg|woff2?)(\?.*)?$") {
        unset beresp.http.Set-Cookie;
    }

    # 30 minutes when WordPress sends no caching header
    if (!beresp.http.Cache-Control && !beresp.http.Expires) {
        set beresp.ttl = 30m;
    }
}

sub vcl_deliver {
    set resp.http.X-Served-By = server.hostname;
    if (obj.hits > 0) {
        set resp.http.X-Cache = "HIT";
        set resp.http.X-Cache-Hits = obj.hits;
    } else {
        set resp.http.X-Cache = "MISS";
    }

    unset resp.http.Via;
    unset resp.http.X-Varnish;
    unset resp.http.X-Vinyl;
    unset resp.http.X-Powered-By;
}
```

Quelques différences avec le gist d'origine :

- Plus de `set req.http.X-Forwarded-For = client.ip` : Varnish ajoute déjà `client.ip` à `X-Forwarded-For`, et l'écraser perd l'IP réelle derrière un load balancer
- La purge se fait directement dans `vcl_recv` avec `return (purge)`, plus besoin de `vcl_hit`/`vcl_miss`. Sans ce bloc, le builtin répond 501 à toute méthode `PURGE`
- `vcl_pipe`, `vcl_pass`, `vcl_init` et `vcl_fini` faisaient ce que fait déjà le builtin, on les retire

On teste la purge depuis le serveur :

```bash
curl -X PURGE -H 'Host: blog.example.com' http://127.0.0.1/mon-article/
```

Avant de recharger, on vérifie que la VCL compile :

```bash
# Vinyl Cache 9.0+
vinyld -C -f /etc/vinyl-cache/default.vcl > /dev/null && systemctl reload vinyl-cache
# Varnish
varnishd -C -f /etc/varnish/default.vcl > /dev/null && systemctl reload varnish
```
