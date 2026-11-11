---
article: docs/linux/cli/git/rework_files.md
checked: '2026-11-10'
commit: fc4b2c32be5b4f2609da6b1af94f9d76ebc5f044
sources: []
unpinned: 6
---

# docs/linux/cli/git/rework_files.md

## Findings

- L86 ERROR corrigé : warning étendu (tout le monde doit reclone), `git push --force origin main` remplacé par `--force --all` puis `--force --tags`, phrase sur les refs PR/MR côté forge. Preuve : test local, clone `--no-local` avec 2 branches, après `filter-repo` les refs sont `refs/heads/main` et `refs/heads/other` (donc `--all` nécessaire pour toutes les pousser) ; `git remote -v` vide après filter-repo (origin bien supprimé).
- L115 ERROR corrigé : paragraphe avant le nettoyage qui rappelle que refs/original et le reflog sont la seule sauvegarde, vérifier puis `cp -a` avant ; intro des 2 méthodes rappelle de travailler sur un clone dédié. Preuve : test filter-branch local, `refs/original/refs/heads/{main,other}` créés puis disparus après rm/reflog expire/gc (size-pack 2.86 MiB -> 1.56 KiB).
- L70 IMPRECISE corrigé : filter-repo présenté comme outil tiers à installer, recommandé par la doc de filter-branch depuis 2.24, refus sur clone non frais. Preuve : git `Documentation/git-filter-branch.txt@v2.24.0:26,529` ; test local : "Aborting: Refusing to destructively overwrite repo history since this does not look like a fresh clone".
- L94 IMPRECISE corrigé : phrase ajoutée sur l'avertissement + 10 s et `FILTER_BRANCH_SQUELCH_WARNING=1`. Preuve : `git-filter-branch.sh@origin/master (fb255012a):86-97`.
- L112 IMPRECISE corrigé : la sortie capturée est gardée telle quelle, la phrase d'intro dit de lancer la commande par fichier ou de lister les 3 chemins dans le `git rm`. Preuve : article L46-48 vs L97-99.
- L118 IMPRECISE corrigé : `git gc --aggressive --prune=now` supprimé, phrase d'explication. Preuve : `Documentation/git-gc.adoc@fb255012a` section AGGRESSIVE, "Not using this at all is the right trade-off for most users and their repositories."

## En plus

- Phrase : filter-repo expire le reflog et repack lui-même, pas de gc à faire derrière. Preuve : sortie du test "New history written... now repacking/cleaning... Completely finished".

## Modernisation

- Clone frais `git clone --no-local` : appliqué (testé).
- `gc --aggressive` retiré : appliqué.
- `--strip-blobs-bigger-than` : appliqué avec 10M (testé avec 1M sur un blob de 3 Mo).

## Tests

- git 2.56.0 et git-filter-repo a40bce548d2c (Homebrew) sur des repos jetables dans le scratchpad.

## À signaler

- `rm -rf .git/refs/original/` gardé : fonctionne avec le backend `files` (testé, refs loose). Ne marcherait pas avec un repo en reftable ; la forme portable est `git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d` (testée aussi), à toi de voir.
