---
description: Mesurer la vitesse de connexion d'un serveur Linux avec speedtest-cli ou speed-cloudflare-cli depuis la ligne de commande
tags:
  - speedtest
  - Cloudflare
  - Networking
---

# Effectuer un Speedtest depuis son serveur

`speedtest-cli` est l'outil de référence pour tester la bande passante d'un serveur depuis le terminal.

```bash
apt install speedtest-cli
```

## Utilisation basique

```bash
speedtest-cli
Retrieving speedtest.net configuration...
Testing from LeaseWeb Netherlands B.V. (212.32.243.25)...
Retrieving speedtest.net server list...
Selecting best server based on ping...
Hosted by XS4ALL Internet BV (Amsterdam) [1.39 km]: 2.168 ms
Testing download speed................................................................................
Download: 154.49 Mbit/s
Testing upload speed......................................................................................................
Upload: 4.17 Mbit/s
```

## Choisir un serveur précis

Par défaut, speedtest-cli sélectionne le serveur le plus proche. Pour choisir manuellement :

```bash
# Lister les serveurs disponibles (filtrés par mot-clé)
speedtest-cli --list | grep Paris

# Lancer le test sur un serveur spécifique (par ID)
speedtest-cli --server 1234
```

## Sortie machine

Utile pour logger les résultats ou les injecter dans un monitoring :

```bash
# CSV — pratique pour Grafana/InfluxDB
speedtest-cli --csv

# JSON
speedtest-cli --json
```

Exemple d'usage avec InfluxDB :

```bash
speedtest-cli --json | jq '{download: .download, upload: .upload, ping: .ping}' \
  >> /var/log/speedtest.json
```

## Options utiles

| Option | Effet |
| ---- | ----- |
| `--no-download` | Teste uniquement l'upload |
| `--no-upload` | Teste uniquement le download |
| `--bytes` | Affiche en octets au lieu de bits |
| `--simple` | Sortie condensée (ping, download, upload) |
| `--secure` | Force HTTPS pour le test |

## Alternative : speed-cloudflare-cli

[speed-cloudflare-cli](https://github.com/KNawm/speed-cloudflare-cli) utilise l'infrastructure Cloudflare au lieu de Speedtest.net — utile pour avoir une mesure indépendante ou tester la latence vers les PoP Cloudflare.

```bash
npx speed-cloudflare-cli
```

Ou en installation globale :

```bash
npm install -g speed-cloudflare-cli
speed-cloudflare-cli
```

Exemple de sortie :

```text
Test server: Paris, FR (CDG)
Latency:      3.45 ms
Jitter:       0.21 ms
Download:   312.45 Mbps
Upload:     289.12 Mbps
```

La mesure inclut latence et jitter, ce que `speedtest-cli` n'affiche pas par défaut.
