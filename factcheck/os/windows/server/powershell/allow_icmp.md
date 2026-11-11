---
article: docs/os/windows/server/powershell/allow_icmp.md
checked: '2026-11-11'
commit: 5fe771dcc86263d728a53522986e049369a165a7
sources: []
unpinned: 2
---

# docs/os/windows/server/powershell/allow_icmp.md

## Findings

- L10 IMPRECISE corrigé : seul l'Echo Request entrant est bloqué (règles « Partage de fichiers et d'imprimantes » désactivées), les messages ICMP réseau (Destination Unreachable, Packet Too Big, Neighbor Discovery) restent autorisés par « Core Networking ». Preuve : connaissance du jeu de règles Windows par défaut; non testé (pas de Windows disponible).
- L16 IMPRECISE corrigé : `-Profile Any` remplacé par `-Profile Domain,Private`, ajout d'une seconde règle ICMPv6 `-IcmpType 128`, mention de `-RemoteAddress`. Preuve : paramètres documentés de New-NetFirewallRule (MicrosoftDocs windows-powershell-docs, netsecurity); ICMPv6 Echo Request = type 128 (RFC 4443). Non exécuté.

## En plus

- Guillemets typographiques “ ” remplacés par des guillemets droits dans la commande PowerShell.

## Modernisation

- Appliqué : alternative `Enable-NetFirewallRule -Name FPS-ICMP4-ERQ-In,FPS-ICMP6-ERQ-In`, précédée d'un `Get-NetFirewallRule -Name "FPS-ICMP*-ERQ-In*"` pour vérifier les noms. Les noms internes ne figurent pas sur une page Microsoft Learn trouvée (seulement Q&A Learn et gists), d'où la commande de vérification.
- Appliqué : restriction de profil et `-RemoteAddress`.

## Tests

- Aucun (pas de Windows).

## À signaler

- Le titre cible Windows 2012R2; les commandes valent aussi pour les versions suivantes, le titre pourrait être généralisé.
