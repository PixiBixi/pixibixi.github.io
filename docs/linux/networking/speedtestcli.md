---
description: "Mesurer le débit d'un serveur Linux en ligne de commande : CLI officiel Ookla, speedtest-cli Python archivé, librespeed-cli, mesure au curl et iperf3, avec sortie JSON exploitable en supervision."
tags:
  - speedtest
  - Cloudflare
  - Networking
---

# speedtest-cli : mesurer le débit d'un serveur Linux en CLI

Le réflexe, c'est `apt install speedtest-cli`. Sauf que ce paquet-là est le client Python de sivel, **archivé sur GitHub** depuis 2024, dernière release en avril 2021. Il fonctionne encore la plupart du temps, mais quand il tombe en panne personne ne le réparera. 4 outils se partagent le terrain aujourd'hui et ils ne mesurent pas la même chose.

## Quel client installer

| Outil | Ce qu'il vaut |
|---|---|
| `speedtest` (Ookla officiel) | Le successeur légitime, multi-connexions, mesure la latence en charge. Binaire propriétaire, dépôt à ajouter |
| `speedtest-cli` (Python, sivel) | Archivé. Mono-connexion, donc sous-estime les liens rapides. Présent dans tous les dépôts distro, d'où sa survie |
| `librespeed-cli` | Open source et activement maintenu, serveurs communautaires ou les siens. Le choix si on veut auto-héberger la cible |
| `speed-cloudflare-cli` | Mesure vers le PoP Cloudflare le plus proche, donne latence et jitter. Utile comme second avis |

Le point qui compte vraiment : le client Python ouvre **une seule connexion TCP**. Sur un lien à 1 Gbit/s ou plus, une seule session ne sature pas le tuyau et le résultat sort 2 à 3 fois sous la réalité. C'est la première chose à vérifier avant de conclure qu'un serveur a un problème de débit.

## Installer le client officiel Ookla

Sur Debian et Ubuntu, il faut passer par le dépôt packagecloud d'Ookla :

```bash
curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | sudo bash
apt install speedtest
```

Sur RHEL, Rocky et AlmaLinux, c'est le même principe avec le script `.rpm.sh` :

```bash
curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.rpm.sh | sudo bash
dnf install speedtest
```

Le paquet s'appelle `speedtest`, sans tiret, ce qui évite le conflit avec le paquet Python `speedtest-cli`. Si les deux sont installés, vérifier lequel répond avec `command -v speedtest`.

Au premier lancement, le binaire réclame l'acceptation de la licence et du GDPR de façon interactive, ce qui fait échouer tout appel non interactif. En cron ou dans un script, on les accepte explicitement :

```bash
speedtest --accept-license --accept-gdpr
```

## Utilisation

Sans argument, le client sélectionne le serveur au meilleur ping :

```bash
speedtest
```

```text
   Speedtest by Ookla

      Server: Orange France - Paris (id: 24215)
         ISP: Scaleway
Idle Latency:     3.21 ms   (jitter: 0.15ms, low: 3.10ms, high: 3.44ms)
    Download:   934.12 Mbps (data used: 1.1 GB)
                 12.44 ms   (jitter: 1.02ms, low: 3.89ms, high: 89.12ms)
      Upload:   912.77 Mbps (data used: 1.0 GB)
```

Les deux lignes de latence sous le download et l'upload sont ce que le client Python ne sait pas faire : c'est la latence **en charge**, celle qui révèle le bufferbloat. Un lien qui passe de 3 ms au repos à 90 ms en download a un problème de bufferisation que le débit brut ne montre pas.

Pour choisir un serveur précis, on liste d'abord les plus proches :

```bash
speedtest --servers
speedtest --server-id=24215
```

Sur une machine multi-homée, on force l'interface ou l'IP source, ce qui permet de tester un lien de secours sans toucher au routage :

```bash
speedtest --interface=eth1
speedtest --ip=10.0.0.42
```

## Sortie machine et supervision

Le format JSON est stable et documenté, c'est celui à utiliser dès qu'un script consomme le résultat :

```bash
speedtest --format=json --accept-license --accept-gdpr
```

Les débits y sont en **octets par seconde**, pas en bits, alors que l'affichage humain est en Mbps. L'oubli du facteur 8 est l'erreur classique quand un dashboard sort des chiffres 8 fois trop bas :

```bash
speedtest -f json | jq '{
  down_mbps: (.download.bandwidth * 8 / 1000000),
  up_mbps:   (.upload.bandwidth * 8 / 1000000),
  ping_ms:   .ping.latency
}'
```

Pour brancher ça sur Prometheus sans exporter dédié, le textfile collector de `node_exporter` suffit. Un script en cron écrit le fichier, node_exporter le sert :

```bash title="/usr/local/bin/speedtest-prom.sh"
#!/usr/bin/env bash
set -euo pipefail

OUT=/var/lib/node_exporter/textfile_collector/speedtest.prom
JSON=$(speedtest -f json --accept-license --accept-gdpr)

# Écriture atomique : node_exporter peut lire pendant qu'on écrit.
{
  echo "# TYPE speedtest_download_bits_per_second gauge"
  echo "speedtest_download_bits_per_second $(jq '.download.bandwidth * 8' <<<"$JSON")"
  echo "# TYPE speedtest_upload_bits_per_second gauge"
  echo "speedtest_upload_bits_per_second $(jq '.upload.bandwidth * 8' <<<"$JSON")"
  echo "# TYPE speedtest_ping_seconds gauge"
  echo "speedtest_ping_seconds $(jq '.ping.latency / 1000' <<<"$JSON")"
} > "${OUT}.tmp"
mv "${OUT}.tmp" "$OUT"
```

Un test consomme 1 à 2 Go de trafic sur un lien rapide. À 4 mesures par heure ça fait plusieurs centaines de Go par mois, facturés sur la plupart des clouds. Une mesure toutes les 6h est un compromis raisonnable et on met le cron à une minute aléatoire pour ne pas taper le même serveur que tout le monde à l'heure pile.

## Mesurer sans rien installer

Sur une machine où l'on ne veut ou ne peut rien poser, `curl` donne un ordre de grandeur en download :

```bash
curl -o /dev/null -w 'debit: %{speed_download} o/s  temps: %{time_total}s\n' \
  https://speed.hetzner.de/100MB.bin
```

Une seule connexion là aussi, donc sous-estimation sur les liens rapides et le résultat dépend entièrement de la qualité du lien vers ce serveur précis. C'est bon pour répondre à « est-ce que ça télécharge à 50 Ko/s ou à 50 Mo/s », pas pour qualifier un lien.

## Débit entre 2 de ses serveurs

Un speedtest mesure le lien vers Internet, pas le lien entre 2 machines. Pour ça, `iperf3` est l'outil correct et il faut le lancer des deux côtés :

```bash
# Côté serveur
iperf3 -s

# Côté client, 4 flux parallèles pour saturer un lien 10G
iperf3 -c 10.0.0.1 -P 4 -t 30
```

Sans `-P`, un flux unique plafonne sur les liens à forte latence à cause de la fenêtre TCP et on mesure le RTT plutôt que le débit.

## Le client Python, si on y tient

Il reste installable partout et sa sortie CSV est pratique pour du log brut :

```bash
apt install speedtest-cli
speedtest-cli --simple
speedtest-cli --csv
```

| Option | Effet |
| ---- | ----- |
| `--no-download` | Teste uniquement l'upload |
| `--no-upload` | Teste uniquement le download |
| `--bytes` | Affiche en octets au lieu de bits |
| `--simple` | Sortie condensée (ping, download, upload) |
| `--secure` | Force HTTPS pour le test |
| `--list` / `--server ID` | Liste les serveurs, en impose un |

L'erreur qu'on rencontre le plus avec lui est `Cannot retrieve speedtest configuration`, quand speedtest.net renvoie un 403 sur l'API historique. `--secure` la contourne parfois, sinon il n'y a rien à réparer côté client puisque le projet est archivé et c'est le moment de passer au binaire Ookla.

## Alternative : speed-cloudflare-cli

[speed-cloudflare-cli](https://github.com/KNawm/speed-cloudflare-cli) utilise l'infrastructure Cloudflare au lieu de Speedtest.net, ce qui donne une mesure indépendante et teste la latence vers les PoP Cloudflare.

```bash
npx speed-cloudflare-cli
```

```text
Test server: Paris, FR (CDG)
Latency:      3.45 ms
Jitter:       0.21 ms
Download:   312.45 Mbps
Upload:     289.12 Mbps
```

Comme il tape le réseau Cloudflare, il mesure surtout la qualité du peering vers Cloudflare, ce qui est une information en soi quand un site derrière leur CDN rame alors que le reste va bien.
