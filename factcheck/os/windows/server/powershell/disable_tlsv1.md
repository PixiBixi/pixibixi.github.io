---
article: docs/os/windows/server/powershell/disable_tlsv1.md
checked: '2026-11-11'
commit: 5587b4ca86b27383279b3ad4b1af4f3ad4928c39
sources: []
unpinned: 2
---

# docs/os/windows/server/powershell/disable_tlsv1.md

## Findings

- L146 IMPRECISE corrigé : le script est nommé (`Set-SchannelProtocol.ps1`) et les exemples ajoutés (SSL3 côté client, puis TLS 1.0 et 1.1 client et serveur). Preuve : script parsé par pwsh 7.4 (mcr.microsoft.com/powershell:7.4-ubuntu-22.04) sans erreur, paramètres Proto/Target/Action confirmés ; exécution réelle impossible (pas de registre Windows).
- L148 IMPRECISE corrigé : paragraphe ajouté : la doc Microsoft ne documente plus que `Enabled`, `DisabledByDefault` est un reste des anciennes versions ; un redémarrage de l'application ou du service peut suffire, le reboot reste le plus sûr. Preuve : learn.microsoft.com/en-us/windows-server/security/tls/tls-registry-settings (maj 2026-02-16), "an application, or service restart might be required", seule la valeur `Enabled` décrite.

## En plus

- L136 corrigé : "Le premier protocole concerne le protocole" en "Le premier paramètre concerne le protocole".

## Modernisation

- Non appliqué : "TLS 1.0/1.1 désactivés par défaut sur les Windows récents", non vérifié (la page Microsoft ci-dessus n'en parle pas).
- Non appliqué : GPO plutôt que registre. La doc Microsoft le recommande pour les cipher suites, l'article entier repose sur le script, à l'auteur de décider.

## Tests

- pwsh 7.4 en conteneur, parse seul.

## À signaler

- Le script n'a pas été exécuté sur un Windows.
