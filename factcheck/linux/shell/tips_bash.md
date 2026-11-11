---
article: docs/linux/shell/tips_bash.md
checked: '2026-11-11'
commit: a09923782453d6ade3fa4ffef227783c89f61511
sources: []
unpinned: 4
---

# docs/linux/shell/tips_bash.md

## Findings

- L21 ERROR corrigé : `HISTFILE=~/.bash_history` sans espaces, avec la note que c'est déjà la valeur par défaut. Preuve : `printf 'HISTFILE = ~/.bash_history\n' | bash` : `bash: line 1: HISTFILE: command not found`.
- L29 IMPRECISE corrigé : motif `ls` ajouté à HISTIGNORE et explication que chaque motif matche la ligne entière (un `ls` seul n'est pas couvert par `ls *`, un `export GCP_KEY=...` reste). Preuve : bash 5.3 interactif avec `HISTIGNORE="ls *"` : `ls` reste dans `history` ; avec le motif d'origine, `export GCP_KEY=x` reste, `GCP_KEY=y true` et `ls -l` sont ignorés.
- L41 IMPRECISE corrigé : "éditeur par défaut" précisé en `$FCEDIT`, sinon `$EDITOR`, sinon `vi`. Preuve : bash(1) section fc (citée par le fact-check, non relue de mon côté).
- L47 IMPRECISE corrigé : `sleep $(( RANDOM % 10 + 1 ))`, suffixe `s` retiré. Preuve : bash 5.3, 3 tirages 6, 8, 5.

## En plus

- Typos dans le paragraphe TMOUT : "Comme dis" et "deconnecteur" corrigés en "Comme dit" et "déconnecter".

## Modernisation

- Appliquée : `$(( ))` au lieu de `$[ ]`.

## Tests

- GNU bash 5.3.20 local (macOS).

## À signaler

- Les blocs de code suivent directement un titre ou un séparateur `---` sans phrase d'intro (structure de l'auteur, non modifiée).
