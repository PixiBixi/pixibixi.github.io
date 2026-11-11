---
article: docs/misc/github_template.md
checked: '2026-11-11'
commit: 5626455c8a206123d09b89960fa6a4851e488e77
sources: []
unpinned: 2
---

# docs/misc/github_template.md

## Findings

- L28 OUTDATED corrigé : section "Créer ses templates" réécrite. Issues : dossier `.github/ISSUE_TEMPLATE/` (template Markdown avec front matter `name`/`about`, issue forms `.yml`, `config.yml` du sélecteur), le fichier unique `ISSUE_TEMPLATE.md` signalé comme legacy. Preuve : docs.github.com "About issue and pull request templates" (issue forms `.yml` et `config.yml` dans `.github/ISSUE_TEMPLATE`, filenames non sensibles à la casse) ; la page "Manually creating a single issue template" n'existe plus que dans les docs GHES où elle est marquée "legacy workflow".
- L24 IMPRECISE corrigé : le PR template peut être à la racine, dans `docs/` ou `.github/`, plusieurs templates via `.github/PULL_REQUEST_TEMPLATE/` + paramètre `?template=`, templates à merger sur la branche par défaut, et défauts d'organisation via un repo public `.github` (les templates d'issue du repo remplacent alors tous les défauts). Preuve : docs.github.com "Creating a pull request template for your repository", "About issue and pull request templates", "Creating a default community health file".

## En plus

- L9-10 : "à fort influence" -> "à forte influence", "vous avez comme" -> "vous savez comme", "un issue" -> "une issue". L20 "Pour se faire" -> "Pour ce faire".
- Le 2e bloc de code n'avait pas de phrase d'introduction : chaque bloc a maintenant la sienne.

## Modernisation

- Appliqué : issue form YAML d'exemple (reprend les champs du template aframe) et `config.yml` (`blank_issues_enabled: false`, `contact_links`), plusieurs PR templates avec `?template=`.

## Tests

- Aucun test GitHub réel. YAML des deux blocs validé par `check_code_blocks.py`. Le schéma issue forms (`type: input/textarea`, `attributes.label`, `validations.required`) est écrit de mémoire, non relu contre la doc "Syntax for GitHub's form schema".

## À signaler

- "Il n'y a pas de sélecteur dans l'UI" pour les PR templates multiples : la doc ne documente que le paramètre `template`, absence de sélecteur non confirmée par une source officielle.
- Le reste de l'intro garde le "vous" de l'auteur, seule la nouvelle prose est en "on".
