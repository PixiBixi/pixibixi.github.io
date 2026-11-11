---
article: docs/networking/cisco/ssh.md
checked: '2026-11-10'
commit: ec09b764687b80d72f8dc781f62239801f9c464b
sources: []
unpinned: 4
---

# docs/networking/cisco/ssh.md

## Findings

- L21 ERROR corrigé : `crypto key generate rsa modulus 2048`, texte "2048 minimum, 4096 si supporté", rappel que sans `modulus` la question interactive part sur 512. Preuve : Cisco "Secure Shell Version 2 Support" (15-E) : "For SSH Version 2, the modulus size must be at least 768 bits" ; Cisco "Using SSH" (support/docs 4145-ssh) : "A 2048-bit modulus or higher is recommended when supported", syntaxe `crypto key generate rsa modulus 4096`. Le défaut 512 du prompt n'a pas été relu dans une doc officielle (connaissance IOS classique, non vérifié).
- L52 ERROR corrigé : `ip ssh version 2` déplacé en étape 3 des étapes principales, retiré de la section Sécurisation (et la justification "comme nous sommes avec des keys de 1024b" supprimée). Preuve : Cisco "Secure Shell Version 2 Support" (15-E) : "If you do not configure this command, SSH by default runs in compatibility mode" (v1 et v2 acceptés).
- L31 IMPRECISE corrigé : `username xxxx algorithm-type scrypt secret xxxx`, avec mention IOS 15.3(3)+. Preuve : sources secondaires uniquement (benchmark CIS Cisco IOS 1.4.3 via Tenable, Cisco Trust Center "Protecting Secrets on Cisco Network Devices" pour type 9 = scrypt). Release exacte d'introduction pour `username` non confirmée sur la command reference officielle.
- L56 IMPRECISE non vérifié : valeurs 2 et 15 laissées. Les défauts 3 / 120 s cités par le fact-check ne figurent pas dans la page Cisco relue (seulement dans ses exemples), donc non ajoutés au texte.

## En plus

- L45 "nous pouvons donc le telnet" : verbe manquant, devient "nous pouvons donc le désactiver".

## Modernisation

- modulus 2048 et `ip ssh version 2` dès l'activation : appliqués.
- `ip ssh server algorithm ...` : non appliqué, syntaxe et algos dépendants de la version IOS/IOS XE, rien de testé.
- Ed25519 : non appliqué, version IOS XE minimale non confirmée.

## Tests

- Aucun équipement Cisco disponible : uniquement docs Cisco via WebFetch/WebSearch.

## À signaler

- L'article ne précise pas la version d'IOS visée ; une phrase sur IOS classique vs IOS XE serait utile si tu as un équipement de référence.
