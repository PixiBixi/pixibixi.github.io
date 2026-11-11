---
article: docs/linux/networking/speedtestcli.md
checked: '2026-11-10'
commit: 581276fb89d76d8ade9123b6a19de430fc50a6a3
sources: []
unpinned: 6
---

# docs/linux/networking/speedtestcli.md

## Findings

- L18 ERROR corrigé : le client Python est décrit comme multi-connexions par défaut (une seule avec `--single`), le défaut retenu est l'absence de latence en charge. Preuve : speedtest.py:1732-1733 et 1952/1967 (`threads=(None, 1)[args.single]`) @v2.1.3-1-g22210ca, clone ~/Documents/work/src/speedtest-cli.
- L22 ERROR corrigé : le paragraphe parle désormais des tests mono-connexion en général (`--single`, curl, iperf3 sans `-P`), le "2 à 3 fois sous la réalité" non sourcé est retiré. Preuve : même source.
- L130 ERROR corrigé : `speed.hetzner.de` -> `fsn1-speed.hetzner.com`. Preuve : `dig +short speed.hetzner.de` vide, `fsn1-speed.hetzner.com` -> 78.46.170.2, `curl -r 0-1048575` -> HTTP 206, 1048576 octets.
- L11 IMPRECISE rejeté : la phrase de l'article est exacte (le finding le confirme lui-même). Preuve : `gh api repos/sivel/speedtest-cli` archived=true, pushed_at 2024-07-20 ; release v2.1.3 du 2021-04-08.
- L122 IMPRECISE corrigé : "plusieurs centaines de Go" -> "3 à 6 To par mois". Preuve : 4 x 24 x 30 = 2880 tests x 1 à 2 Go.
- L147 IMPRECISE corrigé : on mesure le plafond fenêtre / RTT, pas le RTT. Preuve : comportement TCP (débit max d'un flux = fenêtre / RTT), pas de source primaire.

## En plus

- L133 "Une seule connexion là aussi" renvoyait au client Python supposé mono-connexion : "là aussi" retiré.

## Modernisation

- iperf3 3.16+ multi-thread : appliqué (une phrase). Preuve : notes de release esnet/iperf 3.16 (2023-11-30), "Multiple test streams started with -P/--parallel will now be serviced by different threads".
- Tarball Ookla : appliqué, nouveau bloc après l'install RPM. Preuve : test container debian:12.7-slim amd64, tarball 1.2.0 extrait, `speedtest --version` -> 1.2.0.84, flags `--servers`, `--server-id`, `--interface`, `--ip`, `--format` présents dans `--help`.

## Tests

- OrbStack debian:12.7-slim (linux/amd64) : Ookla CLI 1.2.0.84 depuis le tarball.
- dig/curl depuis le Mac sur les hôtes Hetzner.
- Clone créé : ~/Documents/work/src/speedtest-cli.

## À signaler

- `--accept-license` / `--accept-gdpr` n'apparaissent pas dans le `--help` filtré du binaire 1.2.0 (grep sans résultat) : non vérifié s'ils sont simplement non listés. Ils sont largement documentés, laissés tels quels.
- Le tarball pinne la version 1.2.0 (dernière publiée, juillet 2022) : à bumper si Ookla en sort une nouvelle.
