---
description: "yt-dlp : sélection de format, templates de sortie, download-archive, cookies du navigateur, SponsorBlock et automatisation par systemd timer. Migration depuis youtube-dl."
tags:
  - yt-dlp
  - Selfhost
---

# yt-dlp : télécharger et archiver ses vidéos en CLI

youtube-dl n'a plus sorti de release depuis décembre 2021. Le fork actif est **yt-dlp**, qui publie toutes les quelques semaines et suit les changements des sites au fur et à mesure qu'ils cassent. Si un `youtube-dl` traîne encore quelque part, il ne télécharge probablement plus rien.

## Installer sans passer par les dépôts

La version packagée dans `apt` a systématiquement plusieurs mois de retard, ce qui sur cet outil veut dire « ne fonctionne plus ». On installe depuis la source ou en binaire autonome.

```bash
# Binaire autonome, celui qui sait se mettre à jour tout seul
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
chmod a+rx /usr/local/bin/yt-dlp
yt-dlp -U

# Ou via pipx, si on préfère gérer ça en Python
pipx install yt-dlp
pipx upgrade yt-dlp
```

`ffmpeg` est une dépendance de fait : sans lui, pas de fusion vidéo + audio, donc pas de 1080p et plus sur YouTube, qui sert les deux flux séparément.

## Choisir ce qu'on télécharge

C'est la partie qui déroute au début, parce que `-f` sélectionne un format précis alors que `-S` trie les candidats. Dans la vraie vie, `-S` est plus robuste : il exprime une préférence et retombe sur le meilleur disponible au lieu d'échouer.

```bash
# La meilleure vidéo jusqu'à 1080p, en préférant AV1 puis VP9
yt-dlp -S "res:1080,vcodec:av01,vcodec:vp9" "$URL"

# Forcer un conteneur mp4, pratique pour les lecteurs capricieux
yt-dlp -S "res:1080" --merge-output-format mp4 "$URL"

# Audio seul, réencodé en opus
yt-dlp -x --audio-format opus --audio-quality 0 "$URL"

# Voir ce qui est réellement disponible avant de choisir
yt-dlp -F "$URL"
```

## Nommer les fichiers proprement

Le template de sortie évite le dossier fourre-tout avec 400 fichiers dont on ne sait plus rien. Les champs se combinent et on peut reformater une date à la volée.

```bash
yt-dlp -o "%(uploader)s/%(upload_date>%Y-%m-%d)s - %(title)s [%(id)s].%(ext)s" "$URL"
```

Le `[%(id)s]` dans le nom n'est pas décoratif : c'est ce qui permet de retrouver la source d'un fichier des mois plus tard et ce sur quoi certains scanners de médiathèque s'appuient. Sur un système de fichiers qui n'aime pas l'unicode, `--restrict-filenames` remplace tout ce qui n'est pas ASCII.

## Ne pas retélécharger deux fois

C'est l'option qui transforme un script jetable en archivage. `--download-archive` tient un fichier d'IDs déjà récupérés et saute tout ce qui y figure.

```bash
yt-dlp --download-archive /srv/media/.archive.txt \
       -o "/srv/media/%(uploader)s/%(title)s [%(id)s].%(ext)s" \
       "https://www.youtube.com/@unechaine/videos"
```

Relancer la même commande une semaine plus tard ne récupère que les nouveautés. C'est la base de l'automatisation plus bas.

## Les options qui changent la vie

```bash
# Couper les segments sponsorisés et l'autopromo
yt-dlp --sponsorblock-remove sponsor,selfpromo,interaction "$URL"

# Métadonnées, miniature et sous-titres embarqués dans le fichier
yt-dlp --embed-metadata --embed-thumbnail --embed-subs \
       --sub-langs "fr,en" --write-auto-subs "$URL"

# Réutiliser la session du navigateur pour les vidéos qui exigent un compte
yt-dlp --cookies-from-browser firefox "$URL"

# Paralléliser les fragments sur les flux HLS/DASH lents
yt-dlp --concurrent-fragments 4 "$URL"
```

`--cookies-from-browser` est celle qui débloque le plus de situations et c'est aussi celle à manier avec précaution : elle envoie une session authentifiée. On ne la met pas dans un script qui tourne sur une machine partagée.

## Mettre ses options dans un fichier de conf

Réécrire 6 flags à chaque appel n'a aucun intérêt. yt-dlp lit un fichier de configuration au démarrage.

```text title="~/.config/yt-dlp/config"
-S res:1080,vcodec:av01,vcodec:vp9
--merge-output-format mp4
--embed-metadata
--embed-thumbnail
--sponsorblock-remove sponsor,selfpromo
-o ~/Videos/%(uploader)s/%(upload_date>%Y-%m-%d)s - %(title)s [%(id)s].%(ext)s
```

Un `--ignore-config` sur la ligne de commande court-circuite le fichier quand on veut un one-shot différent.

## Automatiser avec un timer systemd

Un cron marche, mais un timer donne les logs dans `journalctl` et un état visible, ce qui est plus pratique quand un téléchargement casse en silence.

```ini title="/etc/systemd/system/ytdlp-archive.service"
[Unit]
Description=Archive les nouvelles videos des chaines suivies
After=network-online.target

[Service]
Type=oneshot
User=media
ExecStart=/usr/local/bin/yt-dlp --download-archive /srv/media/.archive.txt \
    --batch-file /etc/ytdlp/channels.txt \
    -o "/srv/media/%%(uploader)s/%%(title)s [%%(id)s].%%(ext)s"
```

```ini title="/etc/systemd/system/ytdlp-archive.timer"
[Unit]
Description=Archivage yt-dlp quotidien

[Timer]
OnCalendar=daily
Persistent=true
RandomizedDelaySec=1h

[Install]
WantedBy=timers.target
```

Les `%` doivent être doublés en `%%` dans une unit systemd, sinon systemd interprète `%(title)s` comme l'un de ses propres specifiers et l'unit refuse de démarrer. C'est l'erreur qui fait perdre une demi-heure.

`--batch-file` prend un fichier avec une URL par ligne, ce qui évite de modifier l'unit à chaque chaîne ajoutée. Le `Persistent=true` rattrape l'exécution manquée si la machine était éteinte.

## Une interface web par-dessus

L'article portait à l'origine sur Youtube-DL-WebUI, une interface PHP dont le fork PixiBixi n'a pas reçu de commit depuis novembre 2017. Elle fonctionne encore si on lui donne un `yt-dlp` à jour derrière, mais ce n'est plus ce qu'on installerait aujourd'hui. Les projets actifs sur ce créneau sont [MeTube](https://github.com/alexta69/metube) pour du téléchargement à la demande et [Tube Archivist](https://www.tubearchivist.com/) pour de l'archivage de chaînes avec index et recherche.

??? note "L'installation historique de Youtube-DL-WebUI, pour archive"
    On clone le fork dans la racine web, puis on lui donne les droits du serveur. Le mot de passe par défaut est `root`, on le change en remplaçant le sha256 dans `config.php`.

```bash
cd /var/www
git clone https://github.com/PixiBixi/Youtube-dl-WebUI youtube
chown -R www-data:www-data youtube
```

Le vhost qui va avec, en réutilisant les includes de l'[installation nginx + PHP-FPM](../web/nginx/installation.md) :

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name youtube.x.eu;

    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    listen [::]:443 ssl;
    server_name youtube.x.eu;

    error_log /var/log/nginx/youtube.error.log;
    access_log /var/log/nginx/youtube.access.log;

    ssl_certificate /etc/letsencrypt/live/youtube.x.eu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/youtube.x.eu/privkey.pem;

    include /etc/nginx/conf.d/ssl.conf;
    include /etc/nginx/conf.d/letsencrypt.conf;
    include /etc/nginx/conf.d/cache.conf;
    include /etc/nginx/conf.d/php.conf;

    root /var/www/youtube/;

    autoindex on;
    index index.php;
}
```

Le `listen 443 ssl http2` d'origine est déprécié depuis nginx 1.25, d'où le `http2 on;` sur sa propre ligne ci-dessus.

## Voir aussi

- [Installer son serveur web nginx, PHP-FPM et MariaDB](../web/nginx/installation.md) - le socle du vhost ci-dessus
- [Créer son service systemd](../linux/systemd/create_unit.md) - la syntaxe des units et des specifiers `%`
- [Télécharger ses sous-titres en ligne de commande](../linux/misc/subs.md) - quand la vidéo est déjà là mais pas les sous-titres
