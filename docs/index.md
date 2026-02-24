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

Cette magnifique documentation a été faite avec MkDocs Material. [→ À propos](about.md)

## Linux GNU

### Fondamentaux

* [Rappel des commandes de base](linux/fundamentals/base_commands.md)
* [Rappel sur le cron](linux/fundamentals/cron.md)
* [VIM: L'editeur de texte de la mort](linux/fundamentals/vim.md)
* [cURL: La commande à tout faire](linux/fundamentals/curl.md)
* [La commande find](linux/cli/find.md)
* [Memo sur la commande ip](linux/cli/ip.md)
* [Mes fichiers de configuration](linux/cli/confrc.md)
* [Mise à jour automatique de ses paquets](linux/misc/autoupgrade.md)
* [La commande ss (le nouveau netstat)](linux/cli/ss.md)
* [Configurer correctement son hostname](linux/cli/define_hostname.md)
* [Personnaliser son motd](linux/cli/motd.md)
* [Simuler des conditions réseau sur Linux](linux/cli/limit_bandwidth.md)
* [Apprendre à se servir de git](./linux/cli/git/git.md)
* [Réduire la taille de son repository Git](./linux/cli/git/rework_files.md)
* [TMUX Multiplexeur de Shell](linux/cli/tmux.md)
* [Générer une clé publique au format RFC 4716 depuis la clef privée](linux/security/pubkey_rfc4716.md)
* [Création de RAID logiciels avec mdadm](linux/storage/create_raid.md)
* [Remplacer les commandes de base Linux par des versions plus performantes](linux/cli/replace_base_commands.md)

### Sécuriser son serveur Linux

* [Désactiver les patchs de sécurité Meltdown & co](linux/security/disable_patches.md)
* [Apprendre à se servir d'ipset](linux/security/ipset.md)
* [Installer et configurer RKHunter](linux/security/rkhunter.md)
* [Installer et configurer LogWatch](linux/security/logwatch.md)
* [Hardening de son serveur SSH](linux/security/hardening_sshd.md)
* [Installer et configuer PortSentry](linux/security/portsentry.md)

* [Whitelister une série d'IP à l'aide d'IPset et iptables](linux/security/whitelist_ip.md)
* [Logger les actions SSH utilisateurs simplement](linux/security/ssh_log_commands.md)
* [Accès sécurisé via sFTP (Chroot SSH.md)](linux/security/sftp.md)
* [Améliorer la vitesse de connexion à votre serveur SSH](linux/security/ssh_improve_speed.md)
* [Améliorer la sécurité des mots de passe par défaut avec PAM](linux/security/password_pam.md)
* [Configurer des notifications SSH Slack](linux/security/slack_notifications_ssh.md)
* [Configurer des notifications SSH Telegram](linux/security/telegram_notifications_ssh.md)
* [Lister tous les certificats émis](./linux/security/issued_crt.md)

### Supervision

* [Munin: Supervision claire et efficace](monitoring/munin.md)
* [Supervision via les outils eZ](monitoring/eztools.md)
* [Netdata, Prometheus et Grafana : Une stack de monitoring simple et puissante](monitoring/lgtm/simple_monitoring_stack.md)
* [Générer des alertes depuis Loki](monitoring/lgtm/loki_alerting.md)
* [Tips sur la stack LGTM](monitoring/lgtm/tips_lgtm.md)
* [Métrique custom pour node_exporter](./monitoring/lgtm/custom_metrics_nodeexporter.md)
* [Configurer des notifications Slack pour check_mk](monitoring/check_mk/add_slack_notification.md)

### Hardware

* [Upgrade son firmware Mellanox](hardware/nic/mellanox/identify_and_upgrade_firmware.md)
* [HP Smart Array : Lignes de commande Linux](./hardware/server/hp/cli_sas.md)

### Hébergement

#### Mail Stack

* [Postfix/Dovecot/DKIM/Postgrey et plus encore](web/mail.md)
* [Configurer DKIM avec Exim](web/mail/exim_manage_dkim.md)

#### NGINX/PHP

* [Configurer NGINX avec le support IPv6](web/nginx/ipv6_nginx.md)
* [Faites une redirection permanente vers la version SSL de votre site avec NGINX](web/nginx/nginx_ssl.md)
* [Installer NGINX, PHP et MariaDB](web/nginx/installation.md)
* [Installer la version de PHP que vous désirez](./web/nginx/php_custom_version.md)
* [Être encore plus safe en customisant son header Server NGINX](web/nginx/custom_server_header.md)

#### Apache

* [Obtenir les bonnes IP sur apache derrière un reverse proxy](web/nginx/fetch_good_ips.md)

#### HAproxy

* [HAproxy : Sa configuration](web/haproxy/overview.md)
* [HAproxy : Mettre un node en maintenance](web/haproxy/maintenance.md)
* [HAproxy : Obtenir les vraies IPs depuis CloudFlare](web/haproxy/cloudflare.md)
* [HAproxy : Utiliser son API](web/haproxy/api.md)
* [HAproxy : Conserver l'IP de son utilisateur](./web/haproxy/keep_real_ip.md)
* [HAproxy : Comportement d'une limite mémoire](./web/haproxy/memory_limit.md)

#### FTP

* [Installer un serveur FTP avec Pure-ftp](web/ftp.md)

#### DNS

* [Héberger les NS de son serveur avec BIND (+ Resolveur DNS.md)](web/dns.md)

#### Troubleshooting

* [MOZILLA_PKIX_ERROR_REQUIRED_TLS_FEATURE_MISSING](web/troubleshooting.md)

#### Misc

* [Installer Ruby](web/ruby/install.md)

### Services web auto-hébergés

* [Selfoss, son Reader RSS self-hosted](selfhost/selfoss.md)
* [NextCloud, son cloud personnel](selfhost/nextcloud.md)
* [Stream sa propre music avec Sonerezh, un produit français !](selfhost/sonerezh.md)

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

* [Etendre à chaud sa partition root](linux/storage/extend_partition.md)
* [Créer son service syst](linux/systemd/create_unit.md)
* [Exploration poussée des systèmes de fichiers sysfs & procfs](linux/advanced/understand_sysfs_procfs.md)
* [Commandes avancées utiles](linux/shell/useful_commands.md)
* [Ecrire son script Bash](linux/shell/write_bash_scripts.md)
* [Astuces Bash](linux/shell/tips_bash.md)
* [Astuces ZSH](linux/shell/tips_zsh.md)
* [Debug ses lenteurs de ohmyzsh](./linux/shell/debug_slowness_ohmyzsh.md)
* [Un Template pour un script bash](./linux/shell/template_bash_script.md)
* [Config de base varnish](web/varnish/config.md)
* [Utilisation de strace](linux/advanced/strace.md)
* [Luter contre un DDOS](linux/advanced/lock_ddos.md)
* [Deplacer un processus dans un tmux](linux/advanced/move_process_to_tmux.md)
* [Troubleshooting Grub](linux/advanced/troubleshooting_grub.md)

## Bases de données

### MySQL

* [Créer son cluster Galera](databases/mysql/galera_gluster.md)
* [Commandes avancées MySQL](databases/mysql/advanced_commands.md)
* [Debug sa replication Master-Slave](databases/mysql/troubleshooting/replication_slave.md)
* [Gérer ses users MySQL](databases/mysql/users.md)
* [Restaurer la DB système MySQL](databases/mysql/db_mysql.md)
* [Générer des INSERT INTO depuis un SELECT](databases/mysql/troubleshooting/generate_insert_into.md)

### PostgreSQL

* [Upgrade sa version de postgresql](databases/postgres/upgrade_version.md)
* [Creer sa replication postgresql](databases/postgres/postgresql_replication.md)
* [Commandes utiles postgresql](./databases/postgres/commands.md)

### Redis

* [Déployer un Redis en High Availability](databases/redis/cluster_ha.md)
* [Décoder une fonction Redis](./databases/redis/decode_function.md)

### Memcached

* [Commandes diverses avec memcached](databases/memcached/misc_commands.md)

### ElasticSearch

* [Log des slow queries de ElasticSearch](databases/elasticsearch/log_slow_queries.md)

## Cloud

### AWS

* [Glossaire du vocabulaire AWS](./cloud/aws/glossaire.md)
* [Debug un payload d'erreur AWS](./cloud/aws/decode_error_aws.md)
* [AWS : CLI](./cloud/aws/cli.md)

### Google Cloud

* [Suivre l'upgrade de son cluster GKE](./cloud/gcloud/gke_upgrades.md)
* [Commandes utiles pour la CLI GCP](./cloud/gcloud/gcloud_commands.md)
* [GKE Spot Nodes](./cloud/gcloud/spot_nodes.md)
* [GKE Workload Identity](./cloud/gcloud/workload_identity.md)

### Azure

* [EphemeralDisks : comment faire ?](./cloud/azure/ephemeral_disks.md)
* [AKS Limitations](./cloud/azure/aks_limitations.md)
* [Commandes utiles pour la CLI Azure](./cloud/azure/misc_commands.md)

## Automatisation

### Ansible

* [Automatiser les taches avec Ansible](./automation/ansible/ansible.md)
* [Tips ansible](./automation/ansible/ansible_tips.md)
* [Réutilisation de variables ansible entre différentes tâches](./automation/ansible/ansible_reuse_variable.md)

### Terraform

* [Cheatsheet terraform](./automation/terraform/cheatsheet.md)
* [Tools Terraform indispensables](./automation/terraform/tools.md)
* [Accélerer Terraform](./automation/terraform/speedup.md)

### Divers

* [Makefile : à quoi ça sert ?](./automation/misc/makefile.md)

## Kubernetes

* [Commandes utiles pour K8S](kubernetes/cli/useful_commands.md)
* [Commandes Avancées](./kubernetes/cli/advanced_commands.md)
* [Mes meilleurs plugins Krew](./kubernetes/cli/krew_plugins.md)
* [Manage son $KUBECONFIG](kubernetes/cli/kubeconfig.md)
* [Outils pour mieux gérer K8S](kubernetes/cli/tools.md)
* [Resize les PVC de ses Statefulset](./kubernetes/troubleshooting/resize_pvc_statefulset.md)

### Operators K8S

* [Redémarrer un cluster Strimzi](./kubernetes/operator/strimzi/rollout_strimzi.md)

### Deploiement sur K8S

* [Golang : Définir automatiquement son GOMEMLIMIT/GOMAXPROCS](./kubernetes/deployment/golang_kubernetes_limit.md)
* [Spegel : Un OCI registry cache stateless](./kubernetes/deployment/local_image_cache.md)

### ArgoCD

* [Creer un service account](./kubernetes/argocd/argocd_sa.md)
* [Générer ses Applications ArgoCD avec ApplicationSet](./kubernetes/argocd/applicationset.md)
* [Sync Waves & Hooks](./kubernetes/argocd/sync_waves.md)

### Troubleshooting K8S

* [Debug son ServiceAccount](./kubernetes/troubleshooting/troubleshooting_sa.md)

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
* [Enlever les paquets "rc" sur dpkg](linux/misc/rc_package.md)
* [Ajouter de la couleur à la commande man](linux/misc/mancolor.md)
* [Trouver les options de compilation du kernel](linux/misc/find_kernel_options.md)
* [Réinitialiser son mot de passe root](linux/misc/forgot_root_password.md)
* [Convertir des .bin en .iso](linux/misc/convert_bin_to_iso.md)
* [dfc, la commande df en plus](linux/cli/dfc.md)
* [Mémo sur la commande sed](linux/cli/sed.md)
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

* [Ajouter un ISO depuis une URL](./hypervisor/proxmox/insert_iso_from_url.md)
* [Résoudre l'erreur "VM is locked"](./hypervisor/proxmox/troubleshooting/vm_locked.md)
* [NAT pour les VMs Debian](./hypervisor/proxmox/networking/nat.md)
* [Gérer son cluster Proxmox](./hypervisor/proxmox/cluster.md)
* [Créer sa VM en CLI avec cloud-init](./hypervisor/proxmox/vm_as_cli.md)
* [Bootstrap correctement son Proxmox](./hypervisor/proxmox/bootstrap_pve.md)

## Codage

* [SublimeText3 Best Tips](os/misc/st3.md)

## Torrent

* [ruTorrent le polyvalent](./selfhost/torrent/rutorrent.md)
* [Creer ses torrents avec mktorrent](./selfhost/torrent/mktorrent.md)

## Accès à distance

* [Une multitude d'accès à distance via la WebApp Guacamole](selfhost/guacamole.md)

## Networking

* [Tester la bande passante effective de son serveur avec des "proofs files"](networking/proof_files.md)
* [Vérifier l'état du réseau avec la Weathermap](networking/weathermap.md)
* [Lister les préfixes annoncés par un ASN](networking/list_prefix_asn.md)

## pfSense

* [Mise à jour de la bogon list via l'interface graphique](networking/pfsense/update_bogon_list.md)
* [Ajouter une gateway en dehors de son réseau](networking/pfsense/network/gateway_outside_network.md)

## Cisco

* [Commandes de base Cisco](./networking/cisco/commandes_base.md)
* [Création de VLAN Cisco](./networking/cisco/vlan.md)
* [QOS Cisco](./networking/cisco/qos.md)
* [Désactiver la recherche DNS sur du matériel Cisco](./networking/cisco/dns.md)
* [Informations utiles sur le STP](./networking/cisco/stp.md)
* [Serveur SSH](./networking/cisco/ssh.md)
* [Installer un serveur DHCP sur un routeur Cisco](./networking/cisco/serveur_dhcp.md)
* [Accroître la sécurité](./networking/cisco/security.md)
* [Routage inter-VLAN](./networking/cisco/routage_vlan.md)
* [Protocole CDP](./networking/cisco/cdp.md)
* [Protocole LLDP](./networking/cisco/lldp.md)
* [Désactiver la propagation du TTL en MPLS](./networking/cisco/mpls/ttl_propagation.md)
* [OSPF en IPv6](./networking/cisco/ipv6/ospf_ipv6.md)
* [Autoriser les transceiver no-name](./networking/cisco/transceiver/noname.md)

## Mac OS X

* [Brew, l'apt-get d'Apple](os/mac/brew.md)
* [Brew: L'installer sans XCode](os/mac/brew_xcode.md)
* [Informations sur MindView](os/mac/mind-view.md)
* [Enlever le premier caractère bizarre de iTerm](os/mac/iterm/troubleshooting/first_chat.md)
* [Remap le Alt+Arrow de iTerm](os/mac/iterm/troubleshooting/alt_arrow.md)

## ESXi

* [Acceder à la console de l'ESXi](./hypervisor/esxi/misc/shell_access.md)
* [Commandes network ESXi utiles](./hypervisor/esxi/commands/network.md)
* [Uploader ses ISO en ligne de commande](./hypervisor/esxi/upload_iso_cli.md)

### NetApp

* [Repérer un disque dur défaillant en le faisant clignoter](hardware/san/netapp/blink_led_hdd.md)

## Windows

### Server

* [Setup de base d'un Windows 2012 R2](os/windows/server/powershell/first_setup.md)
* [Monter un ISO directement via PowerShell](os/windows/server/powershell/mount_iso.md)
* [Installer et configurer un serveur DHCP en PowerShell](os/windows/server/powershell/dhcp_server.md)

* [Creer un pool de stockage en PowerShell](os/windows/server/powershell/storage/pool.md)
* [Autoriser l'ICMP sur un serveur Windows 2012R2 en PowerShell](os/windows/server/powershell/allow_icmp.md)
* [Importer des utilisateurs CSV dans un AD via PowerShell](os/windows/server/powershell/import_csv_users.md)
* [Clés de Registre Utiles](os/windows/server/registry/useful_keys.md)
* [Exécuter un script PowerShell via une tâche planifiée](os/windows/server/admin/jobs/schedule_jobs_scripts.md)
* [Désactiver TLSv1 sur IIS via un script PowerShell](os/windows/server/powershell/disable_tlsv1.md)
* [Connaitre le temps d'exécution d'une commande PowerShell](os/windows/server/powershell/command_time_execution.md)
* [Accéder au Firewall sans Icône ni raccourci](os/windows/server/firewall/access_without_shortcut.md)
* [Variables built-in utiles](os/windows/server/powershell/useful_vars.md)
* [Initier des connexions iSCSi en CLI](os/windows/server/powershell/initiate_iscsi.md)
* [Installer des drivers via PowerShell](os/windows/server/powershell/install_drivers.md)
* [Définir PowerShell en temps que shell par défaut](os/windows/server/core/setup_default_powershell.md)

### Desktop

* [Améliorer sa vie privée et les performances avec Blackbird](os/windows/desktop/tips/improve_privacy.md)
* [Bloquer les serveurs d'activation via le fichiers hosts](os/windows/desktop/tips/hosts_file.md)
* [Installer tous les logiciels de base via un simple installateur](os/windows/desktop/tips/install_main_softwares.md)

## Misc

* [Mes sources](misc/sources.md)
* [Bordel de liens utiles](misc/useful_links.md)
* [Monitoring des performances sous Linux](misc/linux_performances.md)
* [Optimisation](misc/optimization.md)
* [Scripts utiles](misc/scripts_useful.md)
* [Générer un template pour ses Pull Request et ses Issues](misc/github_template.md)
* [Lancer la console iLO/iDRAC depuis un Mac](hardware/server/hp/run_ilo.md)
* [Lancer une ancienne console iLO](hardware/server/hp/run_old_ilo.md)
* [ILO Advanced Key](hardware/server/hp/ilo_key.md)
* [Western Digital Green HDD, Comment prémunir le old_age prématuré](hardware/hdd/wd/fix_hdd.md)
* [Informations utile sur les dénominations fibre optique](misc/fibre_optique/info_transceiver.md)
* [Télécharger les sous-titres Netflix simplement](misc/download/netflix_subs.md)
