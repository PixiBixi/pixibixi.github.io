# HAproxy : Mettre un node en maintenance

Dans le cadre de mise à jour ou autre, il est intéressant de mettre un
node en maintenance. L'opération est extrêmement simple avec l'API de
HAproxy.

Voici les quelques commandes à passer :

```bash
echo "set server backend_name/svc_name state drain" | socat stdio /var/run/haproxy/admin.sock
echo "set server backend_name/svc_name state ready" | socat stdio /var/run/haproxy/admin.sock
```

Le drain va graduellement supprimer le serveur en question de la liste
des backends. Vous pouvez utiliser maint pour tout stoper d'un coup.

Dans le cadre d'un drain, les healthcheck sont toujours envoyés, vous
pouvez les supprimer de la manière suivante :

```bash
echo "disable health backend_name/svc_name" | socat stdio /var/run/haproxy/admin.sock
echo "enable health backend_name/svc_name" | socat stdio /var/run/haproxy/admin.sock
```

On peut également taper ces commandes directement dans HAtop
