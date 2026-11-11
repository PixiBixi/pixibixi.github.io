---
article: docs/linux/cli/replace_base_commands.md
checked: '2026-11-11'
commit: 97e1e76d9a2f8ba4192fbb923fa37977ec41e062
sources: []
unpinned: 9
---

# docs/linux/cli/replace_base_commands.md

## Findings

- L232 ERROR corrigé : `tar -I pigz -czf` remplacé par `tar --use-compress-program=pigz -cf archive.tar.gz dir/`, avec une phrase sur le piège `-I` + `-z`. Preuve : debian:bookworm-20241016, GNU tar 1.34 + pigz 2.6 : `tar -I pigz -czf` -> `tar: Conflicting compression options` rc=2, `tar -I pigz -cf` et `--use-compress-program=pigz -cf` rc=0 ; macOS bsdtar 3.5.3 : `-I pigz` -> `Couldn't open pigz`, `--use-compress-program=pigz -cf` rc=0 (gzip valide)
- L16 IMPRECISE corrigé : note d'installation, `rip` s'installe via `brew install rm-improved`. Preuve : `brew info rip` -> No available formula ; `brew info rm-improved` -> stable 0.13.1. Tous les autres outils de l'article ont une formule à leur nom (vérifié un par un avec `brew info --json=v2`, delta résout vers git-delta)
- L36 IMPRECISE corrigé : "archivé depuis 2022" devient "abandonné (dernière release en 2021, dépôt pas archivé faute de mainteneur joignable)". Preuve : clone ogham/exa README.md L1-3 @3d1edbb ; dernier tag v0.10.1 ; `gh api repos/ogham/exa --jq .archived` -> false
- L110 IMPRECISE corrigé : graveyard `/tmp/graveyard-$USER` précisé, avertissement sur le reboot, mention que rip n'a plus de commit depuis 2021 et que le fork rip2 est maintenu. Preuve : `rip --help` (0.13.1) "Send files to the graveyard (/tmp/graveyard-$USER by default)" ; clone nivekuil/rip dernier commit 2021-01-04 @11f0b8d ; `brew info rip2` stable 0.9.7, homepage MilesCranmer/rip2
- L115 IMPRECISE corrigé : `--seance` liste les fichiers supprimés depuis le répertoire courant ; ajout de `rip --unbury` seul (annule la dernière suppression). Preuve : `rip --help` "-s, --seance Prints files that were sent under the current directory", "-u, --unbury &lt;target&gt; Undo the last removal by the current user, or specify some file(s) in the graveyard"
- L127 IMPRECISE corrigé : "en moyenne 2x" remplacé par l'explication (parcours parallèle, .gitignore) et la fourchette des benchmarks face à GNU grep. Preuve : ripgrep README.md @91f5d22, lignes GNU grep : 10.69x, 6.31x, 5.92x, 2.08x, 2.19x ; L206 "lock-free parallel recursive directory iterator"
- L181 IMPRECISE corrigé : section dog remplacée par doggo (maintenu, formule Homebrew, supporte le reverse) ; l'avertissement "pas de dig -x" supprimé car faux pour doggo ; une ligne sur l'abandon de dog. Preuve : clone ogham/dog dernier commit 2021-10-07 @721440b ; `brew info dog` -> No available formula ; doggo 1.4.0 `--help` "-x, --reverse", `doggo -x 8.8.8.8 --short` -> dns.google. ; syntaxe `doggo <host> MX @<ns>` dans l'aide ; écrit en Go (`brew info doggo` build_dependencies go)
- L227 IMPRECISE corrigé : "x3" remplacé par "gain qui croît avec le nombre de cœurs à la compression, décompression mono-thread". Preuve : `man pigz` (2.8) L46-48 "Decompression can't be parallelized ... pigz uses a single thread (the main thread) for decompression"
- L242 IMPRECISE corrigé : side-by-side présenté comme option, ajout de `[delta] side-by-side = true` au snippet. Preuve : `delta --help` (0.20.1) "-s, --side-by-side Display diffs in side-by-side layout"

## En plus

- Description front matter et tableau récapitulatif : dog -> doggo, langage Rust -> Go, alias `dig='doggo'` (cohérent avec le dépôt dotfiles config/.zsh_alias:5)

## Modernisation

- rip2 : mentionné comme fork maintenu, mais `rip` (rm-improved) gardé comme choix principal car c'est ce que le dépôt dotfiles installe (packages/Brewfile:212). Syntaxe rip2 non testée, donc pas d'exemples rip2
- dog -> doggo : appliqué
- tar via --use-compress-program : appliqué
- eza/lsd maintenus : la note exa est corrigée, eza reste cité comme fork qui continue ; pas de changement de choix par défaut

## Tests

- debian:bookworm-20241016 (GNU tar 1.34, pigz 2.6), container supprimé (--rm)
- macOS : bsdtar 3.5.3, rip 0.13.1, doggo 1.4.0, delta 0.20.1, pigz 2.8 ; vérif des flags trip, btm, glow, lsd, procs, http, bat via --help
- markdownlint-cli2 0.23.0, check_code_blocks.py : OK

## À signaler

- Clone ajouté : ~/Documents/work/src/exa (ogham/exa, --filter=blob:none)
- Si l'auteur préfère basculer sur rip2 (alias rm, Brewfile), l'article et confrc.md sont à mettre à jour ensemble
