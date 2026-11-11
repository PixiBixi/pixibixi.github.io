---
article: docs/linux/cli/git/git.md
checked: '2026-11-10'
commit: 8751f53db30b59804faf669071c4ccf94b2608f2
sources: []
unpinned: 4
---

# docs/linux/cli/git/git.md

## Findings

- L44 ERROR corrigé : boucle remplacée par `git fetch --prune`, `git for-each-ref --merged "origin/$DEFAULT" refs/remotes/origin` (exclusion exacte de HEAD et de la branche par défaut avec `grep -vx`), écriture dans `merged-branches.txt` à relire, puis `xargs -r git push origin --delete`. Preuve : repo jetable avec remote bare : l'ancienne boucle depuis `wip` (non mergée) liste `*`, `wip`, `wip`, donc supprimerait `wip` sur le remote ; depuis master elle liste la branche locale `localonly` et exclut `master-old` (non mergée, mais filtrée par sous-chaîne). La nouvelle liste `done1` et `feat/done2` depuis n'importe quelle branche, et la suppression laisse `master`, `master-old`, `wip` sur le remote (xargs BSD de macOS accepte `-r`).
- L94 ERROR corrigé : avertissement ajouté (réécriture de toute la branche, branche perso uniquement) et `git push --force-with-lease` dans le bloc. Preuve : comportement de `rebase --exec ... --amend` (réécrit chaque commit) ; git-rebase "RECOVERING FROM UPSTREAM REBASE" cité par le finding, non relu dans le clone.
- L39 IMPRECISE corrigé : `-x` supprime les ignorés **et** les autres non trackés, `-d` les dossiers, dry-run `git clean -ndx .` ajouté avant. Preuve : clone git origin/HEAD `Documentation/git-clean.adoc` L67-71 ("This allows removing all untracked files, including build products"). Pas de test : `git clean` est bloqué par les permissions de la session.
- L99 IMPRECISE corrigé : git devine `user@hostname`, ne bloque que si le hostname n'a pas de domaine, et `user.useConfigOnly true` rend le blocage systématique. Preuve : alpine/git:v2.49.1, `--hostname warrior` -> `fatal: unable to auto-detect email address (got 'root@warrior.(none)')` ; `--hostname warrior.toto.fr` -> commit créé avec `author=root@warrior.toto.fr` ; avec `-c user.useConfigOnly=true` -> `fatal: no email was given and auto-detection is disabled`.

## En plus

- L55 : lien `.gitconfig` des dotfiles cassé, corrigé en `config/.gitconfig`. Preuve : clone dotfiles origin/master, seul `config/.gitconfig` existe.

## Modernisation

- Appliqué : `git fetch --prune` puis liste des branches distantes mergées dans `origin/<défaut>`, relue avant suppression. `gh`/`glab` non ajoutés (dépend de la forge).

## Tests

- git 2.56.0 local sur repo jetable + remote bare dans le scratchpad ; conteneur alpine/git:v2.49.1.

## À signaler

- Le finding attribuait le cas "hostname sans domaine" à macOS ; un hostname macOS en `.local` contient un point, git pourrait donc deviner une adresse sans bloquer. Non testé sur macOS, l'article ne parle plus de macOS.
- `merged-branches.txt` est écrit dans le dossier courant (donc dans le repo, non tracké) : à supprimer après usage ou à déplacer dans `$TMPDIR` si l'auteur préfère.
