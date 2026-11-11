---
article: docs/linux/systemd/create_unit.md
checked: '2026-11-10'
commit: 0b367a9c63818a399159d2f1ac73bdd87915d938
sources:
- repo: systemd-systemd
  path: man/systemd.service.xml
  lines: 203-211
  ref: origin/main
  commit: 3fe693dd946e5ae21e33d0b6ade91ed67ca9489a
- repo: null
  path: service.in
  lines: '14'
  ref: openvpn
  commit: null
- repo: systemd-systemd
  path: man/systemd.exec.xml
  lines: 1092-1097
  ref: origin/main
  commit: 3fe693dd946e5ae21e33d0b6ade91ed67ca9489a
- repo: openvpn-openvpn
  path: src/openvpn/options.c
  lines: '7050'
  ref: origin/master
  commit: ebc370a5a232aff244c9d2d1f8497c665e6bd853
unpinned: 5
---

# docs/linux/systemd/create_unit.md

## Findings

- L85 ERROR corrigé : Oneshot réécrit (systemd attend la fin du process avant de lancer les units suivantes, sans `RemainAfterExit=yes` l'unit retombe en dead). Preuve : systemd `man/systemd.service.xml:203-211 @origin/main`.
- L148 ERROR corrigé : ligne orpheline `=CAP_...` remise en `CapabilityBoundingSet=CAP_...`. Preuve : `systemd-analyze verify` (systemd 257, debian:trixie) sur l'unit d'origine : "<orig@toto.service>:14: Missing key name before '=', ignoring line." ; l'unit corrigée passe sans message. Forme confirmée par l'unit upstream `distro/systemd/openvpn-server@.service.in:14 @openvpn origin/master`.
- L184 ERROR corrigé : `LimitNPROC=10` remplacé par `TasksMax=20` dans l'unit, puce réécrite (TasksMax borne le service, LimitNPROC = par UID réel, ignoré en root). Preuve : `man/systemd.exec.xml:1092-1097 @origin/main` ; upstream OpenVPN utilise `TasksMax=20` (`distro/systemd/openvpn-client@.service.in`).
- L147 OUTDATED corrigé : `--cipher ... --ncp-ciphers ...:BF-CBC` remplacé par `--data-ciphers AES-256-GCM:AES-128-GCM:CHACHA20-POLY1305`, puce explicative ajoutée ; lien doc Openvpn24ManPage remplacé par le reference manual 2.6. Preuve : openvpn `src/openvpn/options.c:7050 @origin/master` ("Treating option '--ncp-ciphers' as..."), `doc/man-sections/cipher-negotiation.rst:17-22`, `doc/man-sections/protocol-options.rst:57-65` (`--cipher` "should not be used any longer in TLS mode"). URL du manuel 2.6 déduite du modèle upstream `reference-manual-for-openvpn-@MAJOR@-@MINOR@/`, non ouverte.
- L39 IMPRECISE corrigé : `Wants=network-online.target` ajouté à l'unit Prometheus, phrase dans la prose. Preuve : `man/systemd.special.xml:573-575`.
- L75 IMPRECISE corrigé : puce Simple réécrite (démarré dès le fork, erreurs de lancement non remontées, les suivantes n'attendent pas), puce `exec` ajoutée (recommandé, systemd 240+). Preuve : `man/systemd.service.xml:289` ; NEWS "CHANGES WITH 240" L14668.
- L78 IMPRECISE corrigé : idle = sortie console, pas un outil d'ordonnancement, timeout 5 s. Preuve : `man/systemd.service.xml:284-286`.
- L125 IMPRECISE corrigé : WantedBy rattache l'unit au `systemctl enable`, `enable --now` pour démarrer, runlevels "à peu près". Preuve : reformulation, pas de citation exacte (comportement standard d'enable).
- L168 IMPRECISE corrigé : PrivateTmp = /tmp et /var/tmp privés, nettoyés à l'arrêt. Preuve : `man/systemd.exec.xml:1946-1948`.

## En plus

- Puce Forking : PIDFile sert à identifier le processus enfant (processus principal), pas "le processus père". Preuve : `man/systemd.service.xml:198-200` ("so that systemd can reliably identify the main process of the service").

## Modernisation

- Type=exec : ajouté comme puce, l'exemple garde `Type=simple` pour ne pas casser la prose qui l'explique.
- TasksMax : appliqué.
- `--data-ciphers` : appliqué.
- Wants=network-online.target : appliqué.
- Drop-in `systemctl edit` : non appliqué, l'article porte sur la création d'une unit, pas la surcharge (pourrait faire une section à part).

## Tests

- OrbStack `debian:trixie-20251020`, systemd 257.13 : `systemd-analyze verify` sur prometheus.service, <openvpn@toto.service> (versions corrigées, aucune sortie) et sur l'unit OpenVPN d'origine (erreur ligne 14).

## À signaler

- L'unit OpenVPN mélange client et server (WorkingDirectory client, `--status %t/openvpn-server/...`, `CAP_NET_BIND_SERVICE` de l'unit server). Laissé tel quel, à aligner sur l'une des 2 units upstream si tu veux.
- `After=syslog.target` est obsolète (syslog est socket-activé) mais inoffensif (non vérifié dans la source), non modifié.
