---
article: docs/ci-cd/hooks/lefthook.md
checked: '2026-11-11'
commit: 84633fda255f8e597b478c3394d983259c9d4ce4
sources:
  - repo: lefthook
    path: internal/config/loader.go
    lines: 537-600
    ref: v2.2.2
    commit: eb4e504b7c1d1ea6cb1fd29542431cb6d1a93a03
  - repo: lefthook
    path: internal/command/install.go
    lines: 159-266
    ref: v2.2.2
    commit: eb4e504b7c1d1ea6cb1fd29542431cb6d1a93a03
  - repo: lefthook
    path: internal/command/lefthook.go
    lines: 121-155
    ref: v2.2.2
    commit: eb4e504b7c1d1ea6cb1fd29542431cb6d1a93a03
  - repo: lefthook
    path: internal/git/remote.go
    lines: 58-83
    ref: v2.2.2
    commit: eb4e504b7c1d1ea6cb1fd29542431cb6d1a93a03
  - repo: lefthook
    path: internal/git/wrapper/clone.go
    lines: 1-25
    ref: v2.2.2
    commit: eb4e504b7c1d1ea6cb1fd29542431cb6d1a93a03
  - repo: lefthook
    path: docs/configuration/refetch_frequency.md
    lines: 1-30
    ref: v2.2.2
    commit: eb4e504b7c1d1ea6cb1fd29542431cb6d1a93a03
  - repo: gitleaks
    path: cmd/root.go
    lines: 35-42
    ref: v8.30.1
    commit: 83d9cd684c87d95d656c1458ef04895a7f1cbd8e
  - repo: gitleaks
    path: README.md
    lines: 382-414
    ref: v8.30.1
    commit: 83d9cd684c87d95d656c1458ef04895a7f1cbd8e
  - repo: gitleaks
    path: .pre-commit-hooks.yaml
    lines: 1-6
    ref: v8.30.1
    commit: 83d9cd684c87d95d656c1458ef04895a7f1cbd8e
  - repo: renovate
    path: lib/modules/manager
    lines: 1-1
    ref: 44.227.4
    commit: 83794a8993ff455b106ddf1e23ce4deca3f5277d
unpinned: 2
---

# docs/ci-cd/hooks/lefthook.md

## Findings

- L74 ERROR corrigé : une commande du repo qui porte le même nom qu'une commande du remote n'est pas remplacée, les 2 sont fusionnées champ par champ (`maps.Merge`). Le `run` du remote gagne, mais un `glob`, `exclude` ou `skip` défini côté repo survit et peut restreindre ou désactiver le contrôle du socle. Reproduit : remote avec `run: echo REMOTE-LINT {staged_files}`, repo avec `glob: "*.zzz"` et `run: echo LOCAL-LINT`, `lefthook dump` affiche le `run` du remote avec le `glob` du repo. Le fix : écrire "fusionnée, le remote écrase les champs qu'il définit" et noter qu'un champ local non redéfini reste actif. Preuve : internal/config/loader.go:537-600 @ v2.2.2
- L52 IMPRECISE corrigé : `lefthook install` ne laisse pas tourner 2 fois un hook pre-commit déjà posé, il le renomme en `.git/hooks/pre-commit.old` et ne l'exécute jamais. Le risque réel est l'inverse, `lefthook uninstall` restaure ce `.old` et réactive pre-commit, et un second `lefthook install` échoue si un `.old` existe déjà. Le fix : dire de lancer `pre-commit uninstall` avant `lefthook install` pour ne pas laisser de `.old` mort. Preuve : internal/command/lefthook.go:121-155 @ v2.2.2
- L69 IMPRECISE corrigé : le dossier est `<repo>-<ref>` seulement pour un `ref` simple, les `-` du ref sont doublés et les `/` deviennent `-` (`v1.4.0-rc1` donne `lefthook-configs-v1.4.0--rc1`), et sans `ref` c'est juste `<repo>`. Preuve : internal/git/remote.go:58-83 @ v2.2.2
- L87 IMPRECISE corrigé : "plus de fetch après le premier clone" est faux pour un remote sans `ref`. Le clone seul ne crée pas `.git/FETCH_HEAD`, donc la première exécution de `lefthook run` refetch (reproduit, le commit poussé après l'install est tiré). Avec un `ref` le fetch du clone crée `FETCH_HEAD` et la règle de l'article tient. De plus `refetch_frequency: never` court-circuite avant le test "jamais cloné". Un `lefthook install` relancé rafraîchit aussi le remote, ce n'est pas seulement le premier. Preuve : internal/command/install.go:234-266 @ v2.2.2 et internal/git/wrapper/clone.go:1-25 @ v2.2.2
- L89 IMPRECISE corrigé : "atteint tous les postes en 24h" n'est vrai que si `refetch_frequency: 24h` est configuré. Par défaut (non défini) un poste ne refetch pas, la doc dit "When set to `never` or not set, Lefthook will not fetch from remote". Le fix : préciser "si on a mis `refetch_frequency: 24h`". Preuve : docs/configuration/refetch_frequency.md:1-30 @ v2.2.2
- L123 IMPRECISE corrigé : "le runner clone le remote à chaque job" n'est vrai que sur un checkout neuf. Un runner qui garde le répertoire de build (stratégie fetch) garde `.git/info/lefthook-remotes` et ne refetch pas sans `refetch`/`refetch_frequency`, donc la CI peut tourner sur une version périmée du remote. Le fix : demander `refetch: true` en CI ou un checkout propre. Preuve : internal/command/install.go:234-266 @ v2.2.2

Vérifiés sans changement : table de correspondance pre-commit (`LEFTHOOK_EXCLUDE` fonctionne aussi avec `jobs` par nom, `LEFTHOOK=0`, `--all-files`), `core.hooksPath` qui bloque sans `--force` ou `--reset-hooks-path`, fetch qui échoue puis warning et job vert (reproduit, exit 0), `ref` SHA refusé par `git clone --branch` (reproduit : `Remote branch <sha> not found in upstream origin`), ordre `lefthook.yml` puis `remotes` puis `lefthook-local.yml`, `fail_on_changes: ci` sur la variable `CI`, `min_version`, commande gitleaks du `.pre-commit-hooks.yaml`, `targetRules` depuis 8.25.0, précédence des allowlists globales, ordre de lecture de la config gitleaks (`--config`, `GITLEAKS_CONFIG`, `GITLEAKS_CONFIG_TOML`, `.gitleaks.toml`), `gitleaks:allow` et `.gitleaksignore`, exemple TOML de l'allowlist (reproduit sur 8.30.1 : le chemin ancré est ignoré, l'autre fichier est détecté), absence de manager Renovate pour les remotes Lefthook.

## Unpinned

- L52 : comportement de `pre-commit install` quand un hook non pre-commit existe déjà (renommage en `.legacy`), non vérifié faute de clone du dépôt pre-commit.
- L102 : "Renovate n'a pas de manager pour les `remotes` Lefthook", absence constatée dans `lib/modules/manager` à la 44.227.4, une absence ne se pince pas sur des lignes.
