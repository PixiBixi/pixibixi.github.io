---
description: Wiki SRE/Platform Engineer — Linux, Kubernetes, Cloud, CI/CD, Monitoring. 200+ articles pratiques en français.
---

# Sommaire

Bienvenue sur mon wiki personnel où j'écris toutes mes astuces, ainsi
que des tutoriels divers que j'ai pu prendre ici et là.

De formation DUT Réseaux & Télécoms et passionné de logiciel libre
depuis toujours, j'ai pu m'investir dans diverses communautés afin
d'aider un grand nombre de débutants dans le monde de Linux.

Ce wiki me permet d'apprendre de nombreuses choses mais également de
vous en faire apprendre. Je reste disponible sur mon mail personnel pour
toute question contact+wiki[at]jdelgado[dot]fr

Cette magnifique documentation a été faite avec MkDocs Material. [À propos](about.md)

## Linux GNU

### Fondamentaux

* [Rappel des commandes de base](linux/fundamentals/base_commands.md)
* [Rappel sur le cron](linux/fundamentals/cron.md)
* [VIM: L'editeur de texte de la mort](linux/fundamentals/vim.md)
* [cURL: La commande à tout faire](linux/fundamentals/curl.md)
* [La commande find](linux/cli/find.md)
* [Mémo sur la commande IP](linux/cli/ip.md)
* [Dotfiles](linux/cli/confrc.md)
* [Mise à jour automatique de ses paquets](linux/misc/autoupgrade.md)
* [La commande ss](linux/cli/ss.md)
* [Configurer correctement son hostname](linux/cli/define_hostname.md)
* [Personnaliser ton motd](linux/cli/motd.md)
* [Simuler des conditions réseau sur Linux](linux/cli/limit_bandwidth.md)
* [Apprendre à se servir de git](./linux/cli/git/git.md)
* [Réduire la taille de son repository Git](./linux/cli/git/rework_files.md)
* [tmux](linux/cli/tmux.md)
* [Générer une clé SSH au format RFC 4716](linux/security/pubkey_rfc4716.md)
* [Création de RAID logiciels avec mdadm](linux/storage/create_raid.md)
* [Remplacer les commandes de base Linux](linux/cli/replace_base_commands.md)

### Sécuriser son serveur Linux

* [Désactiver les patchs de sécurité Meltdown & co](linux/security/disable_patches.md)
* [Apprendre à se servir d'ipset](linux/security/ipset.md)
* [Installer et configurer RKHunter](linux/security/rkhunter.md)
* [Installer et configurer LogWatch](linux/security/logwatch.md)
* [Hardening simple du serveur SSH](linux/security/hardening_sshd.md)
* [Installer et configurer PortSentry](linux/security/portsentry.md)

* [Whitelister une série d'IP à l'aide d'IPset et iptables](linux/security/whitelist_ip.md)
* [Logger les actions SSH utilisateurs simplement](linux/security/ssh_log_commands.md)
* [Accès sécurisé via sFTP (Chroot SSH)](linux/security/sftp.md)
* [Améliorer la vitesse de connexion à votre serveur SSH](linux/security/ssh_improve_speed.md)
* [Améliorer la sécurité des mots de passe par défaut](linux/security/password_pam.md)
* [Configurer des notifications Slack pour SSH](linux/security/slack_notifications_ssh.md)
* [Configurer des notifications Telegram pour SSH](linux/security/telegram_notifications_ssh.md)
* [Lister tous les certificats émis](./linux/security/issued_crt.md)

### Supervision

* [Munin : l'outil de supervision sans fioritures](monitoring/munin.md)
* [Les outils eZ Server, des outils simple de supervision](monitoring/eztools.md)
* [Netdata, Prometheus et Grafana : une stack de monitoring simple et puissante](monitoring/lgtm/simple_monitoring_stack.md)
* [Générer des alertes depuis Loki](monitoring/lgtm/loki_alerting.md)
* [2-3 tips pour la stack LGTM](monitoring/lgtm/tips_lgtm.md)
* [Grafana Alloy — remplacer Promtail (et tout le reste)](monitoring/lgtm/alloy.md)
* [Ecrire une métrique custom pour node_exporter](./monitoring/lgtm/custom_metrics_nodeexporter.md)
* [Configurer des notifications Slack pour check_mk](monitoring/check_mk/add_slack_notification.md)

### Hardware

* [Identifier and upgrade son firmware Mellanox](hardware/nic/mellanox/identify_and_upgrade_firmware.md)
* [Commandes HP Smart Array en CLI (Utilisable pour un ESX...)](./hardware/server/hp/cli_sas.md)

### Hébergement

#### Mail Stack

* [Postfix/Dovecot/DKIM/Postgrey et plus encore](web/mail.md)
* [Configurer DKIM avec Exim](web/mail/exim_manage_dkim.md)

#### NGINX/PHP

* [Configurer nginx pour utiliser IPv6](web/nginx/ipv6_nginx.md)
* [Forcer le SSL sous NGINX](web/nginx/nginx_ssl.md)
* [Installer son Serveur Web : NGINX, PHP-FPM et MariaDB](web/nginx/installation.md)
* [Installer une version custom de PHP](./web/nginx/php_custom_version.md)
* [Être encore plus safe en customisant son header Server NGINX](web/nginx/custom_server_header.md)

#### Apache

* [Obtenir les bonnes IP sur apache derrière un reverse proxy](web/nginx/fetch_good_ips.md)

#### HAproxy

* [Reverse proxy: HAproxy](web/haproxy/overview.md)
* [HAproxy : Mettre un node en maintenance](web/haproxy/maintenance.md)
* [HAproxy : Obtenir les vraies IPs depuis CloudFlare](web/haproxy/cloudflare.md)
* [HAproxy : Utiliser son API](web/haproxy/api.md)
* [Conserver l'IP de son visiteur sur un reverse-proxy](./web/haproxy/keep_real_ip.md)
* [HAproxy : Comportement d'une limite mémoire](./web/haproxy/memory_limit.md)
* [HAproxy : Performance tuning](./web/haproxy/performance_tuning.md)

#### FTP

* [Installer son serveur FTP](web/ftp.md)

#### DNS

* [Installer son NS ainsi que son resolveur DNS via BIND9](web/dns.md)

#### Troubleshooting

* [Troubleshooting TLS : MOZILLA_PKIX_ERROR](web/troubleshooting.md)

#### Misc

* [Installer Ruby](web/ruby/install.md)

### Services web auto-hébergés

* [Selfoss, son Reader RSS self-hosted](selfhost/selfoss.md)
* [NextCloud, son cloud personnel](selfhost/nextcloud.md)
* [Sonerezh](selfhost/sonerezh.md)

* [Sauvegarder ses vidéos avec YoutubeDL et sa GUI](selfhost/youtubedl.md)
* [Gérer son serveur en ligne via Ajenti](selfhost/ajenti.md)
* [Streamer sa musique depuis Koel](selfhost/koel.md)
* [Partager ses fichiers avec H5ai](selfhost/h5ai.md)

### Linux Networking

* [Installer et configurer son VPN OpenVPN](linux/networking/openvpn.md)
* [Configurer son serveur OpenVPN pour de l'IPv6](linux/networking/openvpn_v6.md)

* [Augmenter le buffer de sa carte réseau](linux/networking/buffer_nic.md)
* [Effectuer un Speedtest depuis son serveur](linux/networking/speedtestcli.md)

### Avancé

* [Étendre à chaud sa partition root](linux/storage/extend_partition.md)
* [Créer son service systemd](linux/systemd/create_unit.md)
* [Exploration poussée des systèmes de fichiers sysfs & procfs](linux/advanced/understand_sysfs_procfs.md)
* [Liste de commandes utiles assez avancées](linux/shell/useful_commands.md)
* [Ecrire son script bash](linux/shell/write_bash_scripts.md)
* [Astuces bash](linux/shell/tips_bash.md)
* [Astuces zsh](linux/shell/tips_zsh.md)
* [Debug ses lenteurs de ohmyzsh](./linux/shell/debug_slowness_ohmyzsh.md)
* [Un template pour un script bash](./linux/shell/template_bash_script.md)
* [Config varnish](web/varnish/config.md)
* [strace : tracer les appels système](linux/advanced/strace.md)
* [Mitigation DDoS L7](linux/advanced/lock_ddos.md)
* [Déplacer un processus dans un tmux](linux/advanced/move_process_to_tmux.md)
* [Troubleshooting GRUB](linux/advanced/troubleshooting_grub.md)

## Bases de données

### MySQL

* [Créer son cluster Galera](databases/mysql/galera_gluster.md)
* [MySQL : Commandes avancées](databases/mysql/advanced_commands.md)
* [Debug d'une réplication primaire/réplica](databases/mysql/troubleshooting/replication_slave.md)
* [Gérer ses users MySQL](databases/mysql/users.md)
* [Restaurer la DB système MySQL](databases/mysql/db_mysql.md)
* [Générer des INSERT INTO depuis un SELECT](databases/mysql/troubleshooting/generate_insert_into.md)

### PostgreSQL

* [Upgrade sa version de PostgreSQL](databases/postgres/upgrade_version.md)
* [PostgreSQL Replication](databases/postgres/postgresql_replication.md)
* [Postgres : les commandes qui servent](./databases/postgres/commands.md)

### Redis

* [Déployer un Redis en High Availability](databases/redis/cluster_ha.md)
* [Décoder une fonction Redis](./databases/redis/decode_function.md)

### Memcached

* [Memcached : debug et commandes utiles](databases/memcached/misc_commands.md)

### ElasticSearch

* [Log des slow queries de ElasticSearch](databases/elasticsearch/log_slow_queries.md)

### MongoDB

* [MongoDB — Dump et import d'indexes](databases/mongodb/dump-import-indexes.md)

## Cloud

### AWS

* [Glossaire du vocabulaire AWS](./cloud/aws/glossaire.md)
* [Decoder un message d'erreur AWS](./cloud/aws/decode_error_aws.md)
* [AWS : CLI](./cloud/aws/cli.md)

### Google Cloud

* [Suivre l'upgrade de son cluster GKE](./cloud/gcloud/gke_upgrades.md)
* [Commandes utiles pour la CLI Gcloud](./cloud/gcloud/gcloud_commands.md)
* [GKE Spot Nodes](./cloud/gcloud/spot_nodes.md)
* [GKE Workload Identity](./cloud/gcloud/workload_identity.md)
* [GKE — Capacité réelle des nodes](./cloud/gcloud/gke_node_capacity.md)

### Azure

* [EphemeralDisks : comment faire ?](./cloud/azure/ephemeral_disks.md)
* [Limitations AKS](./cloud/azure/aks_limitations.md)
* [Commandes utiles pour la CLI Azure](./cloud/azure/misc_commands.md)

## Automatisation

### Ansible

* [Automatisation des taches avec ansible](./automation/ansible/ansible.md)
* [Ansible : Tips](./automation/ansible/ansible_tips.md)
* [Réutilisation de variables ansible entre différentes tâches](./automation/ansible/ansible_reuse_variable.md)

### Terraform

* [Cheatsheet terraform](./automation/terraform/cheatsheet.md)
* [Tools Terraform indispensables](./automation/terraform/tools.md)
* [Accélerer Terraform](./automation/terraform/speedup.md)

### Divers

* [Makefile : à quoi ça sert ?](./automation/misc/makefile.md)

## Kubernetes

* [Commandes utiles pour K8S](kubernetes/cli/useful_commands.md)
* [Kubernetes : Commandes Avancées](./kubernetes/cli/advanced_commands.md)
* [Mes meilleurs plugins Krew](./kubernetes/cli/krew_plugins.md)
* [Manage son $KUBECONFIG](kubernetes/cli/kubeconfig.md)
* [Outils pour mieux gérer K8S](kubernetes/cli/tools.md)
* [Resize les PVC de son Statefulset](./kubernetes/troubleshooting/resize_pvc_statefulset.md)

### Operators K8S

* [Comment rollout restart un composant Strimzi](./kubernetes/operator/strimzi/rollout_strimzi.md)

### Deploiement sur K8S

* [Golang : Définir automatiquement son GOMEMLIMIT/GOMAXPROCS](./kubernetes/deployment/golang_kubernetes_limit.md)
* [Spegel : Un OCI registry cache stateless](./kubernetes/deployment/local_image_cache.md)
* [ValidatingAdmissionPolicy : admission control sans webhook](./kubernetes/deployment/validating_admission_policy.md)

### ArgoCD

* [Créer son service account ArgoCD](./kubernetes/argocd/argocd_sa.md)
* [ArgoCD ApplicationSet](./kubernetes/argocd/applicationset.md)
* [ArgoCD : Sync Waves & Hooks](./kubernetes/argocd/sync_waves.md)
* [ArgoCD : Sync Options](./kubernetes/argocd/sync_options.md)

### Troubleshooting K8S

* [Debug son ServiceAccount Kubernetes](./kubernetes/troubleshooting/troubleshooting_sa.md)

### Rancher

* [Reset son password Rancher](kubernetes/rancher/reset_password.md)
* [Bootstrap rapidement son cluster](kubernetes/rke/bootstrap_cluster.md)
* [Récupérer son fichier rkestate](./kubernetes/rke/recover_rkestate.md)

## Gitlab

* [Optimiser sa CI Gitlab](ci-cd/gitlab/ci/optimize.md)
* [Intégrer un scan d'image à sa CI](ci-cd/gitlab/ci/scan_image.md)
* [Utilisation de la CLI officielle](./ci-cd/gitlab/cli.md)

## Containers

### Docker

* [Utiliser un proxy pour pull les images Docker](containers/docker/use_proxy.md)
* [Templates docker-compose](containers/docker/compose/templates.md)

### Kafka

* [Kafkactl, un outil magique](./containers/kafka/kafkactl.md)

### Divers

* [Télécharger ses sous-titres en ligne de commande](linux/misc/subs.md)
* [Gagner de la place en supprimant les locales inutiles](linux/misc/locales.md)
* [Enlever les paquets '"rc'" sur dpkg](linux/misc/rc_package.md)
* [Ajouter de la couleur à sa commande man](linux/misc/mancolor.md)
* [Trouver les options de compilation du kernel](linux/misc/find_kernel_options.md)
* [Réinitialiser son mot de passe root](linux/misc/forgot_root_password.md)
* [Convertir des .bin en .iso](linux/misc/convert_bin_to_iso.md)
* [DFC, la commande DF en plus](linux/cli/dfc.md)
* [sed : chercher et remplacer en CLI](linux/cli/sed.md)
* [Obtenir des informations sur vos PDF](linux/misc/info_about_pdf.md)

## Web

### Benchmark

* [Benchmark avec une random query string](./web/benchmark/benchmark_random_querystring.md)

### WordPress

* [Requêtes SQL pour migrer son WordPress](web/wordpress/migrate_wordpress_sql.md)
* [Requêtes SQL afin d'optimiser son site](web/wordpress/tips_sql.md)

## Linux BSD

* [Ajouter un utilisateur au groupe wheel](./linux/bsd/wheel_group.md)

## Linux CentOS

* [Ajouter les repositories EPEL](./linux/centos/add_epel_repositories.md)

## Proxmox

* [Ajouter une ISO depuis une URL](./hypervisor/proxmox/insert_iso_from_url.md)
* [Résoudre l'erreur '"VM is locked'"](./hypervisor/proxmox/troubleshooting/vm_locked.md)
* [NAT pour les VMs Proxmox](./hypervisor/proxmox/networking/nat.md)
* [Gérer son cluster Proxmox](./hypervisor/proxmox/cluster.md)
* [Créer sa VM en CLI avec cloud-init](./hypervisor/proxmox/vm_as_cli.md)
* [Avoir un Proxmox clean](./hypervisor/proxmox/bootstrap_pve.md)

## Codage

* [SublimeText : Le codage Efficace](os/misc/st3.md)

## Torrent

* [ruTorrent, WebUI rTorrent](./selfhost/torrent/rutorrent.md)
* [Créer ses torrents avec mktorrent](./selfhost/torrent/mktorrent.md)

## Accès à distance

* [Guacamole : l'outil idéal pour établir des sessions RDP, SSH et VNC](selfhost/guacamole.md)

## Networking

* [Tester la bande passante effective de son serveur avec des proofs files](networking/proof_files.md)
* [Les weathermaps](networking/weathermap.md)
* [Lister les préfixes annoncés par un AS](networking/list_prefix_asn.md)

## pfSense

* [Mise à jour de la bogon list via l'interface graphique](networking/pfsense/update_bogon_list.md)
* [Ajouter une gateway en dehors de son réseau](networking/pfsense/network/gateway_outside_network.md)

## Cisco

* [Commandes de base Cisco IOS](./networking/cisco/commandes_base.md)
* [Cisco : Créér son VLAN](./networking/cisco/vlan.md)
* [QOS Cisco](./networking/cisco/qos.md)
* [Cisco : Désactiver la résolution DNS](./networking/cisco/dns.md)
* [STP : Spanning Tree Protocol](./networking/cisco/stp.md)
* [Serveur SSH](./networking/cisco/ssh.md)
* [Installer un serveur DHCP sur un routeur Cisco](./networking/cisco/serveur_dhcp.md)
* [Switch Cisco : Accroître la sécurité](./networking/cisco/security.md)
* [Cisco : Routage Inter-VLAN](./networking/cisco/routage_vlan.md)
* [Le Protocole CDP](./networking/cisco/cdp.md)
* [Le Protocole LLDP](./networking/cisco/lldp.md)
* [Désactiver la propagation du TTL en MPLS](./networking/cisco/mpls/ttl_propagation.md)
* [OSPF en IPv6](./networking/cisco/ipv6/ospf_ipv6.md)
* [Autoriser les transceiver no-name](./networking/cisco/transceiver/noname.md)

## Mac OS X

* [Brew, le package manager de MacOS](os/mac/brew.md)
* [Brew : L'installer sans XCode](os/mac/brew_xcode.md)

* [Enlever le premier caractère bizarre de iTerm](os/mac/iterm/troubleshooting/first_chat.md)
* [Remap le Alt+Arrow de iTerm](os/mac/iterm/troubleshooting/alt_arrow.md)

## ESXi

* [Accéder à la console de l'ESXi](./hypervisor/esxi/misc/shell_access.md)
* [ESXi : commandes réseau en vrac](./hypervisor/esxi/commands/network.md)
* [Uploader ses ISO en ligne de commande](./hypervisor/esxi/upload_iso_cli.md)

### NetApp

* [Repérer un disque dur défaillant en le faisant clignoter](hardware/san/netapp/blink_led_hdd.md)

## Windows

### Server

* [Setup de base d'un Windows 2012R2](os/windows/server/powershell/first_setup.md)
* [Monter un ISO directement via PowerShell](os/windows/server/powershell/mount_iso.md)
* [Installer et configurer un serveur DHCP en PowerShell](os/windows/server/powershell/dhcp_server.md)

* [Manipuler les HDD en Powershell](os/windows/server/powershell/storage/pool.md)
* [Autoriser l'ICMP sur un serveur Windows 2012R2 en PowerShell](os/windows/server/powershell/allow_icmp.md)
* [Importer des utilisateurs CSV dans un AD via PowerShell](os/windows/server/powershell/import_csv_users.md)
* [Windows : clés de registre utiles](os/windows/server/registry/useful_keys.md)
* [Exécuter un script PowerShell via une tâche planifiée](os/windows/server/admin/jobs/schedule_jobs_scripts.md)
* [Désactiver TLSv1 et TLSv1.1](os/windows/server/powershell/disable_tlsv1.md)
* [Connaitre le temps d'exécution d'une commande PowerShell](os/windows/server/powershell/command_time_execution.md)
* [Accéder au Firewall sans Icône ni raccourci](os/windows/server/firewall/access_without_shortcut.md)
* [PowerShell : variables built-in utiles](os/windows/server/powershell/useful_vars.md)
* [Initier des connexions iSCSi en CLI](os/windows/server/powershell/initiate_iscsi.md)
* [Installer des drivers via PowerShell](os/windows/server/powershell/install_drivers.md)
* [Définir PowerShell en temps que shell par défaut](os/windows/server/core/setup_default_powershell.md)

### Desktop

* [Ameliorer sa privacy sous Windows](os/windows/desktop/tips/improve_privacy.md)
* [Hosts File](os/windows/desktop/tips/hosts_file.md)
* [Installer tous les logiciels de base via un simple installateur](os/windows/desktop/tips/install_main_softwares.md)

## Misc

* [Mes sources](misc/sources.md)
* [Bordel de lien](misc/useful_links.md)
* [Performances Linux](misc/linux_performances.md)
* [Optimisations Linux : liens de référence](misc/optimization.md)
* [Scripts utiles multi-OS](misc/scripts_useful.md)
* [Générer un template pour ses Pull Request et ses Issues](misc/github_template.md)
* [Lancer la console iLO depuis un Mac](hardware/server/hp/run_ilo.md)
* [Lancer une ancienne console iLO](hardware/server/hp/run_old_ilo.md)

* [WD Green HDD, Comment prémunir le old_age prématuré](hardware/hdd/wd/fix_hdd.md)
* [Informations utile sur les dénominations fibre optique](misc/fibre_optique/info_transceiver.md)
* [Télécharger les sous-titres Netflix simplement](misc/download/netflix_subs.md)
