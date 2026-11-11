---
article: docs/linux/security/sftp.md
checked: '2026-11-11'
commit: abc7c522520839aa807472b39ea7735624506d01
sources:
- repo: openssh-portable
  path: scp.1
  lines: '145'
  ref: V_9_0_P1
  commit: 94eb6858efecc1b4f02d8a6bd35e149f55c814c8
- repo: openssh-portable
  path: sshd_config.5
  lines: '518'
  ref: V_10_6_P1
  commit: a8c72b842423f0774f542d3c2197247c3dd28d74
- repo: openssh-portable
  path: session.c
  lines: 1298-1301
  ref: V_10_6_P1
  commit: a8c72b842423f0774f542d3c2197247c3dd28d74
unpinned: 3
---

# docs/linux/security/sftp.md

## Findings

- L96 OUTDATED corrigé : scp passe par SFTP par défaut depuis OpenSSH 9.0, le binaire scp dans le jail ne sert qu'à `scp -O` et aux vieux clients ; rsync reste un vrai binaire. Le binaire scp est laissé dans la boucle ldd (utile pour -O). Preuve : scp.1:145 @V_9_0_P1 (option -O "legacy SCP protocol"), scp.c:452 `mode = MODE_SFTP` ; test Debian 13 (OpenSSH 10.0p2) : jail sans binaire scp, `scp` OK, `scp -O` -> `scp: command not found`.
- L16 IMPRECISE corrigé : puce reformulée (transfert de fichiers seulement), et ajout d'un sous-répertoire `upload` appartenant à l'utilisateur, avec explication. Preuve : sshd_config.5:518 @V_10_6_P1 ; test : `put` à la racine du chroot -> `dest open "/f": Permission denied`, dans /upload -> OK.
- L24 IMPRECISE corrigé : ajout de `ForceCommand internal-sftp` et `DisableForwarding yes` dans le Match. Preuve : test : `ssh jeremy@localhost id` -> `This service allows sftp connections only.`, `ssh -L` -> `administratively prohibited`, log `refused local port forward`.
- L143 IMPRECISE corrigé : commentaire `-u sshd sur RHEL et dérivés` ; le `systemctl try-restart sshd` reste valide partout (alias Debian). Preuve : /usr/lib/systemd/system/ssh.service:22 `Alias=sshd.service` (Debian 13).
- L148 IMPRECISE corrigé : exigence réelle (propriétaire root, pas writable groupe/autres, 750 accepté) et suffixe `component` pour un parent. Preuve : session.c:1298-1301 @V_10_6_P1 ; test : /srv en 775 -> log `bad ownership or modes for chroot directory component "/srv/"`, jail en root:bob 750 -> connexion OK.
- L150 IMPRECISE corrigé : l'affirmation était fausse. Sans aucun device dans le jail, le prompt arrive quand même (le pty est alloué hors chroot) ; le symptôme est `bash: line 1: /dev/null: Permission denied` sur une redirection. Puce réécrite. Preuve : test `ssh -tt bob@localhost` sur jail sans /dev peuplé -> prompt `-bash-5.2$` OK.

## En plus

- Ajout de `sshd -t &&` avant le restart (modernize, voir ci-dessous).

## Modernisation

- ForceCommand internal-sftp + DisableForwarding yes : appliqué (testé).
- scp via SFTP depuis 9.0 : appliqué (testé).
- sshd -t avant restart : appliqué.

## Tests

- Conteneur debian:13.1, openssh-server 1:10.0p2-7+deb13u4, rsync 3.5.0 ; chroot SFTP %h + jail SSH manuel construit avec les commandes de l'article. Clone openssh-portable aux tags V_9_0_P1 et V_10_6_P1.

## À signaler

- Rien.
