---
article: docs/linux/advanced/move_process_to_tmux.md
checked: '2026-11-11'
commit: a4bfca6ebaf597f9a397dd2e0cb12ea5675095ab
sources: []
unpinned: 2
---

# docs/linux/advanced/move_process_to_tmux.md

## Findings

- L16 IMPRECISE corrigé : le paragraphe décrit maintenant CTRL-Z, puis `bg`, puis `jobs -l`, puis `disown`, et la transcription commence par `bg`. Preuve : reptyr `README.md` (origin/HEAD, tag reptyr-0.10.0) "Resume the process in the background: `bg`", puis `jobs -l` qui montre quand même `Stopped (signal)`, puis `disown`.
- L31 IMPRECISE corrigé : ajout en fin d'article de la restriction `ptrace` sur Ubuntu, avec `echo 0 > /proc/sys/kernel/yama/ptrace_scope` en root et `/etc/sysctl.d/10-ptrace.conf` pour le permanent. Preuve : reptyr `README.md` section "ptrace_scope on Ubuntu Maverick and up".

## En plus

- L13 : "rattacher un processus a" corrigé en "à".
- L21 : "Signal darrêt" corrigé en "Signal d'arrêt" (apostrophe manquante dans la sortie bash FR).

## Modernisation

- Non appliqué : la version reptyr 0.10.0 (confirmée, dernier tag `reptyr-0.10.0`) n'apporte rien à l'article, aucun flag spécifique n'y est utilisé.

## Tests

- Aucun test exécuté (ptrace_scope dépend du kernel hôte, un conteneur ne le prouve pas).

## À signaler

- Rien.
