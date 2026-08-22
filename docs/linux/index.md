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
- [CLI — Dotfiles](cli/confrc.md) — zsh, aliases, git, SSH, tmux et Wezterm
- [CLI — Hostname](cli/define_hostname.md) — /etc/hostname et /etc/hosts sans se tromper
- [CLI — dfc](cli/dfc.md) — df en version lisible et colorée
- [CLI — Simuler des conditions réseau](cli/limit_bandwidth.md) — latence, perte de paquets et bande passante
- [CLI — motd](cli/motd.md) — infos système à la connexion
- [Sécurité — Hardening sshd](security/hardening_sshd.md) — durcir OpenSSH
- [Sécurité — ipset](security/ipset.md) — gestion des sets d'IPs pour iptables
- [Sécurité — Certificats](security/issued_crt.md) — générer et inspecter des certificats
- [Sécurité — Notifications SSH Slack](security/slack_notifications_ssh.md) — alerter sur les connexions SSH
- [Sécurité — Notifications SSH Telegram](security/telegram_notifications_ssh.md) — variante Telegram
- [Sécurité — SFTP](security/sftp.md) — configuration chroot SFTP
- [Sécurité — PAM passwords](security/password_pam.md) — politique de mots de passe PAM
- [Sécurité — Whitelister des IP](security/whitelist_ip.md) — allowlist ipset + iptables
- [Sécurité — Logger les commandes SSH](security/ssh_log_commands.md) — PROMPT_COMMAND et rsyslog pour l'audit
- [Sécurité — Vitesse de connexion SSH](security/ssh_improve_speed.md) — ControlMaster et réutilisation des sessions TCP
- [Sécurité — Clé SSH RFC 4716](security/pubkey_rfc4716.md) — exporter une clé publique au bon format
- [Sécurité — RKHunter](security/rkhunter.md) — détection de rootkits par comparaison de hashs
- [Sécurité — LogWatch](security/logwatch.md) — rapports d'analyse de logs par mail
- [Sécurité — PortSentry](security/portsentry.md) — détecter et bloquer les scans de ports
- [Sécurité — Désactiver les mitigations Meltdown & co](security/disable_patches.md) — récupérer les perfs, en connaissance de cause
- [Shell — Template bash script](shell/template_bash_script.md) — squelette de script robuste
- [Shell — Écrire des scripts bash](shell/write_bash_scripts.md) — bonnes pratiques
- [Shell — Tips bash](shell/tips_bash.md) — astuces et patterns
- [Shell — Tips zsh](shell/tips_zsh.md) — spécificités zsh
- [Shell — Commandes avancées](shell/useful_commands.md) — réseau, LVM, RAID, SMART et TLS
- [Shell — Lenteurs oh-my-zsh](shell/debug_slowness_ohmyzsh.md) — profiler les plugins au démarrage
- [Réseau — Buffer NIC](networking/buffer_nic.md) — tuning des buffers réseau
- [Réseau — OpenVPN](networking/openvpn.md) — monter un tunnel VPN
- [Réseau — OpenVPN en IPv6](networking/openvpn_v6.md) — serveur dual-stack pour les clients VPN
- [Réseau — speedtest-cli](networking/speedtestcli.md) — mesurer le débit d'un serveur en CLI
- [Stockage — Créer un RAID](storage/create_raid.md) — mdadm et RAID logiciel
- [Stockage — Étendre une partition](storage/extend_partition.md) — LVM et redimensionnement à chaud
- [Systemd — Créer une unit](systemd/create_unit.md) — service, timer et socket
- [Avancé — strace](advanced/strace.md) — tracer les appels système
- [Avancé — Troubleshooting GRUB](advanced/troubleshooting_grub.md) — réparer un boot cassé
- [Avancé — Lock DDoS](advanced/lock_ddos.md) — mitiger une attaque en temps réel
- [Avancé — sysfs & procfs](advanced/understand_sysfs_procfs.md) — /proc et /sys en profondeur, hardening inclus
- [Avancé — Déplacer un processus dans tmux](advanced/move_process_to_tmux.md) — reptyr pour rattacher un TTY
- [Misc — Auto-upgrade](misc/autoupgrade.md) — mises à jour automatiques Debian/Ubuntu
- [Misc — Mot de passe root oublié](misc/forgot_root_password.md) — récupération sans réinstall
- [Misc — Monter une image ISO](misc/mount_iso.md) — `mount -o loop`, udisksctl, Mount-DiskImage et hdiutil
- [Misc — Convertir un .bin en .iso](misc/convert_bin_to_iso.md) — iat, bchunk, ccd2iso et vérification du format réel
- [Misc — Locales inutiles](misc/locales.md) — localepurge pour récupérer de l'espace
- [Misc — Paquets « rc » dpkg](misc/rc_package.md) — purger ce que remove a laissé derrière lui
- [Misc — Couleur dans man](misc/mancolor.md) — most ou les variables LESS_TERMCAP
- [Misc — Options de compilation du kernel](misc/find_kernel_options.md) — /proc/config.gz et /boot
- [Misc — Métadonnées PDF](misc/info_about_pdf.md) — exiftool : auteur, dates, compression
- [Misc — Sous-titres en CLI](misc/subs.md) — addic7ed-cli
- [Distributions — Groupe wheel sous BSD](bsd/wheel_group.md) — autoriser su à un utilisateur
- [Distributions — Dépôt EPEL](centos/add_epel_repositories.md) — epel-release sur RHEL, Rocky et AlmaLinux 8, 9 et 10
