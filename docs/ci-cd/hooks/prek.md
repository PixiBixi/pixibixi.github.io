---
description: "Remplacer pre-commit par prek sans toucher au .pre-commit-config.yaml : équivalences des commandes, gain mesuré sur des repos réels, part du fast path, cache des environnements et vérification du binaire dans prek-action."
tags:
  - prek
  - pre-commit
  - Supply chain
tested_with:
  - "prek 0.5.10"
  - "pre-commit 4.6.2"
  - "prek-action 3.1.0"
---

# prek : migrer de pre-commit, gain mesuré et CI vérifiée

Sur un repo qui empile une quinzaine de hooks, `pre-commit run --all-files` prend plusieurs secondes à chaque commit et la CI doit installer Python et pre-commit avant de lancer le moindre contrôle. [prek](https://github.com/j178/prek) est un binaire Rust qui lit le même `.pre-commit-config.yaml` et exécute les mêmes hooks. La migration tient en une commande par repo et se défait aussi vite. La suite couvre la bascule, le gain mesuré sur 2 repos, le cache des environnements et le piège de `prek-action` qui télécharge le binaire sans le vérifier.

## Remplacer pre-commit sans toucher à la config

On installe prek puis on remplace le hook git posé par pre-commit, repo par repo.

```bash
brew install prek
prek install --force
```

Sans `--force`, prek renomme le hook de pre-commit en `.git/hooks/pre-commit.legacy` et l'exécute après le sien : chaque commit passe alors par les 2 outils. Le `--force` supprime ce hook legacy. Les commandes se transposent une à une :

| pre-commit | prek |
|---|---|
| `pre-commit install` | `prek install` |
| `pre-commit run --all-files` | `prek run --all-files` |
| `pre-commit autoupdate` | `prek update` |
| `pre-commit init-templatedir ~/.git-template` | `prek util init-template-dir ~/.git-template` |
| `~/.cache/pre-commit` | `~/.cache/prek` (`PREK_HOME`) |

La commande `prek install` ne pose que le hook `pre-commit`, comme pre-commit. Un hook déclaré avec `stages: [commit-msg]` (conventional-pre-commit, cocogitto) ne tourne donc plus après la bascule si on oublie de le demander. On le passe à l'install avec `-t`, ou mieux on le déclare dans la config pour qu'un simple `prek install` suffise et que pre-commit le lise aussi.

```yaml title=".pre-commit-config.yaml"
default_install_hook_types: [pre-commit, commit-msg]
```

La config reste lisible par pre-commit tant qu'on n'y met pas de clé propre à prek. Une clé `priority`, qui fait tourner en parallèle les hooks de même valeur, est ignorée sans erreur par pre-commit. Le `repo: builtin`, qui appelle les hooks Rust embarqués sans repo distant, casse la config pour pre-commit (`Missing required key: rev`). On le garde de côté tant qu'un poste ou une CI tourne encore pre-commit.

## Le gain mesuré sur 2 repos

Les 2 repos mesurés sont `dotfiles` et `claude-skills`, avec la même config de 18 hooks : 11 hooks de `pre-commit-hooks`, puis gitleaks, shellcheck, shfmt, yamllint, prettier, markdownlint et un hook `commit-msg` qui ne tourne pas sur `run`. On mesure avec hyperfine, environnements déjà construits et config inchangée. Les temps bougent d'environ 20 % d'une série à l'autre selon la charge de la machine, les ratios restent du même ordre.

```bash
hyperfine -N -w 2 -r 10 'pre-commit run --all-files' 'prek run --all-files'
```

| Repo | pre-commit | prek | Gain |
|---|---|---|---|
| `dotfiles` | 4,16 s | 1,59 s | 2,6x |
| `claude-skills` | 2,90 s | 0,73 s | 4,0x |

Le [benchmark officiel](https://prek.j178.dev/benchmark/) annonce bien plus sur 13 hooks de `pre-commit-hooks` : 1 942 ms pour pre-commit contre 105 ms pour prek, soit environ 18x à config inchangée. Ce gain vient surtout du fast path, qui reconnaît les hooks de `pre-commit-hooks` et les remplace par leur réimplémentation Rust. La doc prévient que leur comportement peut différer de l'original, `PREK_NO_FAST_PATH=1` repasse sur la version épinglée. Les 80 ms (24x) mis en avant demandent en plus `priority` et 2 projets lancés en parallèle. Nos 11 hooks de `pre-commit-hooks` sont tous dans la [liste du fast path](https://prek.j178.dev/reference/built-in-hooks/#automatic-fast-path), mais gitleaks, shellcheck, prettier et les autres gardent leur propre coût et prek ne peut pas les accélérer.

La variable `PREK_NO_FAST_PATH=1` coupe le fast path et sépare les 2 effets. Sur `dotfiles`, prek sans fast path reste 1,6 à 2,1x plus rapide que pre-commit selon les séries. Le fast path ajoute encore 1,3 à 1,4x. Un repo qui n'a que des hooks Node, Go ou `local` ne gagne donc que la part du runner.

```bash
PREK_NO_FAST_PATH=1 prek run --all-files
```

## Le premier run reconstruit tout

prek ne réutilise pas `~/.cache/pre-commit`. Le premier `prek run` clone chaque repo de hooks et reconstruit les environnements (Python via uv, Node, Go), ce qui a pris 24,6 s sur `dotfiles` contre quelques secondes pour un pre-commit déjà chaud. Le run suivant sur `claude-skills` a pris 1,1 s. Les 2 configs épinglent les mêmes `rev` et prek indexe ses environnements par repo et version, pas par projet.

Le coût se paye une fois par poste, puis à chaque bump de `rev`. En CI, `prek-action` restaure `~/.cache/prek` par défaut, sans quoi il reviendrait à chaque run.

## Vérifier le binaire prek en CI

[`j178/prek-action`](https://github.com/j178/prek-action) remplace setup-python, `pip install pre-commit` et le cache maison en un seul step.

```yaml title=".github/workflows/pre-commit.yml"
- name: Run hooks on all files
  uses: j178/prek-action@44924fe9ef4a6f88253c4b6b1bf11c689d3ce53d # v3.1.0
  with:
    prek-version: '0.5.10'
    # The action skips verification for versions missing from its bundled checksums: bump with prek-version.
    sha256: '5c832a9ccd0855b7c054320d8921d90165a37459d3ac175923bdf121ff1aa9b1'
```

Épingler l'action par SHA ne suffit pas à épingler ce qu'elle exécute. Sur un runner qui n'a pas encore le binaire en cache, l'URL de téléchargement vient d'un `version-manifest.json` lu sur la branche `main` du repo de l'action. Les checksums embarqués, eux, ne couvrent que les versions connues à la release de l'action (jusqu'à 0.5.6 pour la v3.1.0). Pour une version plus récente, `verifyDownloadChecksum` ne trouve rien et se contente d'un log `info` sans faire échouer le job.

```text
No SHA-256 checksum available for prek-x86_64-unknown-linux-gnu.tar.gz; skipping verification
```

L'input `sha256` passe avant le checksum embarqué et rend la vérification obligatoire. On le récupère depuis la release, qui publie un `.sha256` par archive. On recalcule aussi le hash de l'archive pour ne pas se fier au seul fichier publié.

```console
$ gh release download v0.5.10 -R j178/prek -p 'prek-x86_64-unknown-linux-gnu.tar.gz*'
$ cat prek-x86_64-unknown-linux-gnu.tar.gz.sha256
5c832a9ccd0855b7c054320d8921d90165a37459d3ac175923bdf121ff1aa9b1  prek-x86_64-unknown-linux-gnu.tar.gz
$ shasum -a 256 prek-x86_64-unknown-linux-gnu.tar.gz
5c832a9ccd0855b7c054320d8921d90165a37459d3ac175923bdf121ff1aa9b1  prek-x86_64-unknown-linux-gnu.tar.gz
```

Le log du job affiche ensuite `Verifying SHA-256 checksum for prek-x86_64-unknown-linux-gnu.tar.gz (input)`. Le hash ne vaut que pour une version et une archive. Un bump de `prek-version` qui oublie le hash fait échouer le job au lieu de télécharger un binaire non vérifié. Sur un runner self-hosted dont le tool cache contient déjà cette version, l'action reprend le binaire en cache sans rien télécharger ni vérifier, `sha256` compris.

## Voir aussi

- [Lefthook](lefthook.md), l'autre sortie de pre-commit : un binaire Go qui exécute les outils déjà installés, mais demande de réécrire la config
- [Compatibilité avec pre-commit](https://prek.j178.dev/compatibility/), la liste des commandes et des clés propres à prek
