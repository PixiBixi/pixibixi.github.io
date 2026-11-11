---
article: docs/os/windows/desktop/tips/hosts_file.md
checked: '2026-11-10'
commit: 1e09cc0ad659444d1184b95848cf6e1568bd8453
sources: []
unpinned: 5
---

# docs/os/windows/desktop/tips/hosts_file.md

## Findings

- L13 ERROR corrigé : "Bloquage des Serveurs Microsoft" et "Bloque des MatchWare (MindView..)" préfixés par `#`. Preuve : test glibc (debian:12.7, `--network none`), une ligne de texte libre qui ne commence pas par une IP est ignorée (getent ne résout ni "des" ni "Serveurs"), donc inoffensive mais invalide. Comportement du resolver Windows non testé.
- L17 ERROR corrigé : admonition warning ajoutée sur Windows Update, activation, Defender (MAPS/spynet) et la détection `SettingsModifier:Win32/HostsFileHijack`. Preuve : couverture presse 2020 (betanews.com/2020/08/04/windows-10-telemetry-hosts-file-hijack-warning, winhelponline.com/blog/windows-defender-hostsfilehijack-alert-telemetry-block/) ; pas de doc Microsoft officielle trouvée. Le rôle exact de chaque domaine (sls, sa.windows.com) non vérifié, formulation volontairement générale.
- L58 ERROR corrigé : les 3 lignes `0.0.0.0 http://...` supprimées (aucun effet). Preuve : test glibc, `0.0.0.0 http://www.example.org` ne matche que la chaîne littérale `http://www.example.org`, `getent hosts www.example.org` ne renvoie rien. Testé sur glibc, pas sur Windows.
- L7 IMPRECISE corrigé : chemin `C:\Windows\System32\drivers\etc\hosts`, édition en administrateur, format d'une ligne ; fences `bash` passées en `text`. Preuve : chemin standard Windows (non vérifié sur une machine Windows dans cette passe).
- L33 IMPRECISE non vérifié : domaines IDM/Adobe/TuneUp non revérifiés (pas de résolution DNS faite) ; laissé tel quel, voir À signaler.

## En plus

- Aucun.

## Modernisation

- DNS filtrant (Pi-hole, AdGuard Home, NextDNS) : appliqué en une phrase.

## Tests

- Docker debian:12.7 `--network none`, `getent hosts` sur un /etc/hosts modifié (glibc 2.36).

## À signaler

- Les blocs Adobe, TuneUp, IDM (tonec/registeridm) et MatchWare servent à bloquer la vérification de licence de logiciels commerciaux, donc à faire tourner des copies crackées. Sur un wiki public signé, je propose de les supprimer (je ne l'ai pas fait : décision de contenu).
- L'article reste un fichier hosts de ~2015 ; une alternative serait de ne garder que la partie méthode (chemin, format, DNS filtrant) et le lien Spotify.
