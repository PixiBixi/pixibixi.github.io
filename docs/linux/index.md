---
description: Linux de fond en comble — CLI, shell, sécurité, réseau, stockage, systemd et dépannage avancé.
tags:
  - Linux
  - Shell
  - Security
  - Systemd
---

# Linux

La section la plus dense du wiki. On y trouve les fondamentaux, les outils CLI, la sécurité SSH, le shell scripting, le réseau, le stockage et le debug système. Rien de théorique — que du pratique.

## Contenus

- [Fondamentaux — Commandes de base](fundamentals/base_commands.md) — fichiers, processus, permissions
- [Fondamentaux — curl](fundamentals/curl.md) — options utiles et cas d'usage
- [Fondamentaux — vim](fundamentals/vim.md) — survie dans vim
- [Fondamentaux — cron](fundamentals/cron.md) — syntaxe et exemples
- [CLI — Remplacer les commandes de base](cli/replace_base_commands.md) — fd, bat, eza et autres remplaçants modernes
- [CLI — sed](cli/sed.md) — édition de flux en ligne de commande
- [CLI — find](cli/find.md) — recherche de fichiers
- [CLI — tmux](cli/tmux.md) — sessions persistantes et multiplexeur de terminal
- [CLI — ip](cli/ip.md) — remplacement de ifconfig et route
- [CLI — ss](cli/ss.md) — sockets et connexions réseau
- [CLI — git](cli/git/git.md) — commandes git du quotidien
- [CLI — Réécrire l'historique git](cli/git/rework_files.md) — filter-branch et rebase
- [Sécurité — Hardening sshd](security/hardening_sshd.md) — durcir OpenSSH
- [Sécurité — ipset](security/ipset.md) — gestion des sets d'IPs pour iptables
- [Sécurité — Certificats](security/issued_crt.md) — générer et inspecter des certificats
- [Sécurité — Notifications SSH Slack](security/slack_notifications_ssh.md) — alerter sur les connexions SSH
- [Sécurité — Notifications SSH Telegram](security/telegram_notifications_ssh.md) — variante Telegram
- [Sécurité — SFTP](security/sftp.md) — configuration chroot SFTP
- [Sécurité — PAM passwords](security/password_pam.md) — politique de mots de passe PAM
- [Shell — Template bash script](shell/template_bash_script.md) — squelette de script robuste
- [Shell — Écrire des scripts bash](shell/write_bash_scripts.md) — bonnes pratiques
- [Shell — Tips bash](shell/tips_bash.md) — astuces et patterns
- [Shell — Tips zsh](shell/tips_zsh.md) — spécificités zsh
- [Réseau — Buffer NIC](networking/buffer_nic.md) — tuning des buffers réseau
- [Réseau — OpenVPN](networking/openvpn.md) — monter un tunnel VPN
- [Stockage — Créer un RAID](storage/create_raid.md) — mdadm et RAID logiciel
- [Stockage — Étendre une partition](storage/extend_partition.md) — LVM et redimensionnement à chaud
- [Systemd — Créer une unit](systemd/create_unit.md) — service, timer et socket
- [Avancé — strace](advanced/strace.md) — tracer les appels système
- [Avancé — Troubleshooting GRUB](advanced/troubleshooting_grub.md) — réparer un boot cassé
- [Avancé — Lock DDoS](advanced/lock_ddos.md) — mitiger une attaque en temps réel
- [Misc — Auto-upgrade](misc/autoupgrade.md) — mises à jour automatiques Debian/Ubuntu
- [Misc — Mot de passe root oublié](misc/forgot_root_password.md) — récupération sans réinstall
