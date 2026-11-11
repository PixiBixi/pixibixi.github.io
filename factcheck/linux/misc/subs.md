---
article: docs/linux/misc/subs.md
checked: '2026-11-11'
commit: cb643353ccbfcd8bd0c62d9deca85e75d747c22b
sources: []
unpinned: 2
---

# docs/linux/misc/subs.md

## Findings

- L19 OUTDATED corrigé : `pip install` remplacé par `pipx install addic7ed-cli` + `pipx inject addic7ed-cli "setuptools<81"`, avec la mention du projet figé en 2019 (1.4.6) mais fonctionnel. Preuve : clone addic7ed-cli, `git log -1 origin/HEAD` -> 12005ed 2019-08-26, setup.py `version='1.4.6'`; test python:3.12.7-slim : sans setuptools -> `ModuleNotFoundError: No module named 'pkg_resources'` (addic7ed_cli/__init__.py:156); avec `setuptools<81` -> `addic7ed -bb -l english Breaking.Bad.S01E01.mkv` télécharge un .srt de 43 Ko; pipx 1.18.16 + inject -> `addic7ed --help` OK.
- L32 IMPRECISE corrigé : le nommage est confirmé dans le code (`file_to_query` dans addic7ed_cli/util.py extrait série, `SxxEyy`/`NxM` et release), ajout de `search -q` pour forcer la requête, des flags `-b`/`-bb` et de la limite 15/24 h anonyme, 40 connecté. Preuve : util.py `file_to_query` @12005ed, __init__.py L236 (`-q/--query`), L268-280 (`-b`, `-bb`), README.rst L60-63.

## En plus

- Tag `Subscriptions` remplacé par `Subtitles` (l'article parle de sous-titres; tag déjà utilisé par misc/download/netflix_subs.md).
- Front matter : `tested_with: addic7ed-cli 1.4.6, Python 3.12`.

## Modernisation

- Appliqué : pipx (PEP 668), avec l'inject setuptools nécessaire.

## Tests

- Docker `python:3.12.7-slim`, addic7ed-cli 1.4.6, setuptools<81, pipx 1.18.16. Le site addic7ed répond encore (recherche et téléchargement OK le 2026-11-09).

## À signaler

- La dépendance à `pkg_resources` cassera définitivement quand plus aucun setuptools <81 ne s'installera sur la version de Python courante.
