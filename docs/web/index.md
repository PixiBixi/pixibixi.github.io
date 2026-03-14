---
description: nginx, HAProxy, Varnish, DNS, mail et WordPress — tout ce qui tourne devant le code applicatif.
tags:
  - nginx
  - HAProxy
  - Varnish
  - DNS
  - WordPress
---

# Web

La couche entre internet et les applications. nginx pour servir, HAProxy pour load balancer, Varnish pour cacher, le DNS pour résoudre et Exim pour envoyer des mails correctement signés.

## Contenus

- [nginx — Installation](nginx/installation.md) — installer et configurer nginx
- [nginx — SSL](nginx/nginx_ssl.md) — TLS et certificats
- [nginx — IPv6](nginx/ipv6_nginx.md) — activer l'écoute IPv6
- [nginx — PHP version custom](nginx/php_custom_version.md) — pointer vers une version PHP spécifique
- [nginx — IP réelles](nginx/fetch_good_ips.md) — récupérer l'IP client derrière un proxy
- [nginx — Custom server header](nginx/custom_server_header.md) — masquer ou personnaliser le header Server
- [HAProxy — Overview](haproxy/overview.md) — guide complet, ACLs et load balancing
- [HAProxy — API](haproxy/api.md) — API de stats et d'administration
- [HAProxy — Cloudflare](haproxy/cloudflare.md) — intégration et IP réelles Cloudflare
- [HAProxy — IP réelle client](haproxy/keep_real_ip.md) — propager l'IP source
- [HAProxy — Page de maintenance](haproxy/maintenance.md) — basculer en maintenance sans redémarrage
- [HAProxy — Limite mémoire](haproxy/memory_limit.md) — configurer maxconn et buffers
- [Varnish](varnish/config.md) — configuration VCL et cache HTTP
- [DNS](dns.md) — zones, enregistrements et outils de diagnostic
- [Mail](mail.md) — configuration serveur mail
- [Exim — Gérer DKIM](mail/exim_manage_dkim.md) — générer et déployer les clés DKIM avec Exim
- [FTP](ftp.md) — configuration vsftpd
- [WordPress — Migrer la BDD](wordpress/migrate_wordpress_sql.md) — changer de domaine via SQL
- [WordPress — Tips SQL](wordpress/tips_sql.md) — requêtes utiles pour administrer WordPress
- [Ruby — Installation](ruby/install.md) — installer Ruby avec rbenv
- [Benchmark — Query string aléatoire](benchmark/benchmark_random_querystring.md) — contourner le cache pour bencher
- [Troubleshooting](troubleshooting.md) — debug HTTP, certificats et problèmes courants
