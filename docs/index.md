# Sommaire

Bienvenue sur mon wiki personnel où j'écris toutes mes astuces, ainsi
que des tutoriels divers que j'ai pu prendre ici et là.

De formation DUT Réseaux & Télécoms et passionné de logiciel libre
depuis toujours, j'ai pu m'investir dans diverses communautés afin
d'aider un grand nombre de débutants dans le monde de Linux.

Ce wiki me permet d'apprendre de nombreuses choses mais également de
vous en faire apprendre. Je reste disponible sur mon mail personnel pour
toute question wiki[at]jdelgado[dot]fr

Cette magnifique documentation a été faites avec MkDocs

## Linux GNU

### Fondamentaux

-   [Rappel des commandes de base](/linux/fundamentals/base_commands)
-   [Rappel sur le cron](/linux/fundamentals/cron)
-   [VIM: L'editeur de texte de la mort](/linux/fundamentals/vim)
-   [cURL: La commande à tout faire](/linux/fundamentals/curl)
-   [La commande find](/linux/cli/find)
-   [Memo sur la commande ip](/linux/cli/ip)
-   [Mes fichiers de configuration](/linux/cli/confrc)
-   [Mise à jour automatique de ses paquets](/linux/misc/autoupgrade)
-   [La commande ss (le nouveau netstat)](/linux/cli/ss)
-   [HP Smart Array : Lignes de commande Linux](/misc/server/hp_cli_esx)
-   [Configurer correctement son hostname](/linux/cli/define_hostname)
-   [Personnaliser son motd](/linux/cli/motd)
-   [Simuler des conditions réseau sur Linux](/linux/cli/limit_bandwidth)
-   [Apprendre à se servir de git](github)
-   [TMUX Multiplexeur de Shell](/linux/cli/tmux)
-   [Générer une clé publique au format RFC 4716 depuis la clef privée](/ssh/pubkey_rfc4716)
-   [Automatiser les taches avec Ansible](/linux/automatisation/ansible)
-   [Création de RAID logiciels avec mdadm](/linux/misc/create_raid)
-   [Remplacer les commandes de base Linux par des versions plus performantes](/linux/cli/replace_base_commands)

### Sécuriser son serveur Linux

-   [Désactiver les patchs de sécurité Meltdown & co](/linux/security/disable_patches)
-   [Apprendre à se servir d'IPTables](/linux/security/iptables)
-   [Apprendre à se servir d'ipset](/linux/security/ipset)
-   [Installer et configurer Fail2Ban](/linux/security/fail2ban)
-   [Installer et configurer RKHunter](/linux/security/rkhunter)
-   [Installer et configurer LogWatch](/linux/security/logwatch)
-   [Installer et configurer SSH Guard](/linux/security/sshGuard)
-   [Hardening de son serveur SSH](/linux/security/hardening_sshd) 
-   [Installer et configuer PortSentry](/linux/security/portsentry)
-   [Bloquer tous les préfixes d'un pays entier](/linux/security/iptables_country)
-   [Whitelister une série d'IP à l'aide d'IPset et iptables](/linux/security/whitelist_ip)
-   [Logger les actions SSH utilisateurs simplement](/linux/security/ssh_log_commands)
-   [Accès sécurisé via sFTP (Chroot SSH)](/linux/security/sftp)
-   [Améliorer la vitesse de connexion à votre serveur SSH](/linux/security/ssh_improve_speed)
-   [Améliorer la sécurité des mots de passe par défaut avec PAM](/linux/security/password_pam)
-   [Configurer des notifications SSH Slack](/linux/security/slack_notifications_ssh)

### Supervision

-   [Munin: Supervision claire et efficace](/linux/monitoring/munin)
-   [Supervision via les outils eZ](/linux/monitoring/eztools)
-   [Netdata, Prometheus et Grafana : Une stack de monitoring simple et puissante](/linux/monitoring/simple_monitoring_stack)
-   [Configurer des notifications Slack pour check_mk](/linux/monitoring/check_mk/add_slack_notification)

### Hébergement

-   [Postfix/Dovecot/DKIM/Postgrey et plus encore](/linux/hosting/mail)
-   [Configurer DKIM avec Exim](/linux/hosting/mail/exim_manage_dkim)
-   [Installer NGINX, PHP et MariaDB](/linux/hosting/lemp/installation)
-   [Installer PHP7 et supérieur](/linux/hosting/lemp/php7x)
-   [Configurer NGINX avec le support IPv6](/linux/hosting/lemp/ipv6_nginx)
-   [Faites une redirection permanente vers la version SSL de votre site avec NGINX](/linux/hosting/lemp/nginx_ssl)
-   [Être encore plus safe en customisant son header Server NGINX](/linux/hosting/lemp/custom_server_header)
-   [Obtenir les bonnes IP sur apache derrière un reverse proxy](/linux/hosting/lemp/fetch_good_ips)
-   [HAproxy : Sa configuration](/linux/hosting/lemp/haproxy)
-   [HAproxy : Mettre un node en maintenance](/linux/hosting/lemp/haproxy/maintenance)
-   [HAproxy : Obtenir les vraies IPs depuis CloudFlare](/linux/hosting/lemp/haproxy/cloudflare)
-   [HAproxy : Utiliser son API](/linux/hosting/lemp/api)
-   [Installer un serveur FTP avec Pure-ftp](/linux/hosting/ftp)
-   [Héberger les NS de son serveur avec BIND (+ Resolveur DNS)](/linux/hosting/dns)
-   [MOZILLA_PKIX_ERROR_REQUIRED_TLS_FEATURE_MISSING](/linux/hosting/troubleshooting)
-   [Installer Ruby](/linux/hosting/ruby/install)

### Services web auto-hébergés

-   [Selfoss, son Reader RSS self-hosted](/linux/selfhost/selfoss)
-   [NextCloud, son cloud personnel](/linux/selfhost/nextcloud)
-   [Stream sa propre music avec Ampache](/linux/selfhost/ampache)
-   [Stream sa propre music avec Sonerezh, un produit français !](/linux/selfhost/sonerezh)
-   [Subsonic, le couteau Suisse de la musique](/linux/selfhost/subsonic)
-   [Sauvegarder ses vidéos avec YoutubeDL et sa GUI](/linux/selfhost/youtubedl)
-   [ZeroBin, son propre service de paste](/linux/selfhost/ZeroBin)
-   [Gérer son serveur en ligne via Ajenti](/linux/selfhost/ajenti)
-   [Héberger ses images avec Chevreto](/linux/selfhost/chevreto)
-   [Streamer sa musique depuis Koel](/linux/selfhost/koel)
-   [Partager ses fichiers avec H5ai](/linux/selfhost/h5ai)

### Networking

-   [Installer et configurer son VPN OpenVPN](/linux/networking/openvpn)
-   [Configurer son serveur OpenVPN pour de l'IPv6](/linux/networking/openvpn_v6)
-   [Configurer l'IPv6 sur son serveur Online](/linux/networking/ipv6/setup_online)
-   [Augmenter le buffer de sa carte réseau](/linux/networking/buffer_nic)
-   [Effectuer un Speedtest depuis son serveur](/linux/networking/speedtestcli)

### Avancé

-   [Etendre à chaud sa partition root](/linux/advanced/cli/extend_partition)
-   [Créer son service systemd](/linux/advanced/systemd/create_unit)
-   [Exploration poussée des systèmes de fichiers sysfs & procfs](/linux/advanced/understand_sysfs_procfs)
-   [Commandes avancées utiles](/linux/advanced/shell/useful_commands)
-   [Ecrire son script Bash](/linux/advanced/shell/write_bash_scripts)
-   [Astuces Bash](/linux/advanced/shell/tips_bash)
-   [Astuces ZSH](/linux/advanced/shell/tips_zsh)
-   [Config de base varnish](/linux/advanced/varnish/config)
-   [Utilisation de strace](/linux/advanced/strace)
-   [Luter contre un DDOS](/linux/advanced/lock_ddos)
-   [Deplacer un processus dans un tmux](/linux/advanced/move_process_to_tmux)
-   [Troubleshooting Grub](/linux/advanced/troubleshooting_grub)

### MySQL

-   [Créer son cluster Galera](/linux/mysql/galera_gluster)
-   [Commandes avancées MySQL](/linux/mysql/advanced_commands)
-   [Debug sa replication Master-Slave](/linux/mysql/troubleshooting/replication_slave)
-   [Gérer ses users MySQL](/linux/mysql/users)
-   [Restaurer DB installation MySQL](/linux/mysql/db_mysql)
-   [Générer des INSERT INTO depuis un SELECT](/linux/mysql/troubleshooting/generate_insert_into)

### PostgreSQL

-   [Upgrade sa version de postgresql](/linux/postgres/upgrade_version)

### Redis

-   [Déployer un Redis en High Availability](/linux/redis/cluster_ha)

### Memcached

-   [Commandes diverses avec memcached](/linux/memcached/misc_commands)

### ElasticSearch

-   [Log des slow queries de ElasticSearch](/linux/elasticsearch/log_slow_queries)

### DevOps

#### Kubernetes

-   [Commandes utiles pour K8S](/kubernetes/cli/useful_commands)
-   [Manage son $KUBECONFIG](/kubernetes/cli/kubeconfig)
-   [Outils pour mieux gérer K8S](/kubernetes/cli/tools)

#### Rancher

-   [Reset son password Rancher](/kubernetes/rancher/reset_password)
-   [Bootstrap rapidement son cluster](/kubernetes/rancher/bootstrap_cluster)

#### Terraform

-   [Cheatsheet terraform](/terraform/cheatsheet)
-   [Tools Terraform indispensables](/terraform/tools)

#### Gitlab

-   [Optimiser sa CI Gitlab](/gitlab/ci/optimize)
-   [Intégrer un scan d'image à sa CI](/gitlab/ci/scan_image)

#### Docker

-   [Docker: l'indispensable](docker)
-   [Utiliser un proxy pour pull les images Docker](/docker/use_proxy)
-   [Templates docker-compose](/docker/compose/templates)

### Divers

-   [Télécharger ses sous-titres en ligne de commande](/linux/misc/subs)
-   [Gagner de la place en supprimant les locales inutiles](/linux/misc/locales)
-   [Enlever les paquets "rc" sur dpkg](/linux/misc/rc_package)
-   [Ajouter de la couleur à la commande man](/linux/misc/mancolor)
-   [Trouver les options de compilation du kernel](/linux/misc/find_kernel_options)
-   [Réinitialiser son mot de passe root](/linux/misc/forgot_root_password)
-   [Convertir des .bin en .iso](/linux/misc/convert_bin_to_iso)
-   [dfc, la commande df en plus](/linux/cli/dfc)
-   [Mémo sur la commande sed](/linux/cli/sed)
-   [Obtenir des informations sur vos PDF](/linux/misc/info_about_pdf)

### WordPress

-   [Requêtes SQL pour migrer son WordPress](/web/wordpress/migrate_wordpress_sql)
-   [Requêtes SQL afin d'optimiser son site](/web/wordpress/tips_sql)

## Linux BSD

-   [Ajouter un utilisateur au groupe wheel](/linux_bsd/wheel_group)

## Linux CentOS

-   [Ajouter les repositories EPEL](/linux_centos/add_epel_repositories)

## Proxmox

-   [Ajouter un ISO depuis une URL](/proxmox/insert_iso_from_url)
-   [Résoudre l'erreur "VM is locked"](/proxmox/troubleshooting/vm_locked)
-   [NAT pour les VMs Debian](/proxmox/networking/nat)

## Codage

-   [SublimeText3 Best Tips](/code/st3)

## Torrent

-   [ruTorrent le polyvalent](/rtorrent/rutorrent)
-   [Flood le sublime](/rtorrent/flood)
-   [Transmission, le client torrent facile](transmission)
-   [Deluge, l'agressif](deluge)
-   [Creer ses torrents avec mktorrent](/torrent/mktorrent)

## Accès à distance

-   [Une multitude d'accès à distance via la WebApp Guacamole](guacamole)
-   [Accès à distance via TeamViewer (TV)](tv)
-   [Accès à distance via VNC](vnc)

## Networking

-   [Tester la bande passante effective de son serveur avec des "proofs files"](/networking/proof_files)
-   [Vérifié l'état du réseau avec la Weathermap](/networking/weathermap)
-   [Lister les préfixes annoncés par un ASN](/networking/list_prefix_asn)

## pfSense

-   [Mise à jour de la bogon list via l'interface graphique](/pfsense/update_bogon_list)
-   [Ajouter une gateway en dehors de son réseau](/pfsense/network/gateway_outside_network)

## Cisco

-   [Commandes de base Cisco](/cisco/commandes_base)
-   [Création de VLAN Cisco](/cisco/vlan)
-   [QOS Cisco](/cisco/qos)
-   [Désactiver la recherche DNS sur du matériel Cisco](/cisco/dns)
-   [Informations utiles sur le STP](/cisco/stp)
-   [Serveur SSH](/cisco/ssh)
-   [Installer un serveur DHCP sur un routeur Cisco](/cisco/serveur_dhcp)
-   [Accroître la sécurité](/cisco/security)
-   [Routage inter-VLAN](/cisco/routage_vlan)
-   [Protocole CDP](/cisco/cdp)
-   [Protocole LLDP](/cisco/lldp)
-   [Désactiver la propagation du TTL en MPLS](/cisco/mpls/ttl_propagation)
-   [Tunnel Automatic 6to4](/cisco/ipv6/6to4_tunnel)
-   [OSPF en IPv6](/cisco/ipv6/ospf_ipv6)
-   [Autoriser les transceiver no-name](/cisco/transceiver/noname)

## Mac OS X

-   [Brew, l'apt-get d'Apple](/mac/brew)
-   [Brew: L'installer sans XCode](/mac/brew_xcode)
-   [Informations sur MindView](/mac/mind-view)
-   [Enlever le premier caractère bizarre de iTerm](/mac/iterm/troubleshooting/first_chat)
-   [Remap le Alt+Arrow de iTerm](/mac/iterm/troubleshooting/alt_arrow)

## Mikrotik

-   [Installer son tunnel IPSec](/mkt/install_ipsec)
-   [Ne pas router Netflix à travers son tunnel IPSEC](/mkt/netflix_vpn)

## ESXi

-   [Acceder à la console de l'ESXi](/esxi/misc/shell_access)
-   [Commandes network ESXi utiles](/esxi/commands/network)
-   [Uploader ses ISO en ligne de commande](/esxi/upload_iso_cli)

### NetApp

-   [Repérer un disque dur défaillant en le faisant clignoter](/san/netapp/blink_led_hdd)

## Windows

### Server

-   [Setup de base d'un Windows 2012 R2](/windows_server/powershell/first_setup)
-   [Connexion SSH "native" en Powershell](/windows_server/powershell/ssh)
-   [Monter un ISO directement via PowerShell](/windows_server/powershell/mount_iso)
-   [Installer et configurer un serveur DHCP en PowerShell](/windows_server/powershell/dhcp_server)
-   [Installer et configurer un serveur AD en PowerShell](/windows_server/powershell/ad_server)
-   [Creer un pool de stockage en PowerShell](/windows_server/powershell/storage/pool)
-   [Gérer les exceptions pour les scripts PowerShell](/windows_server/powershell/exceptions)
-   [Autoriser l'ICMP sur un serveur Windows 2012R2 en PowerShell](/windows_server/powershell/allow_icmp)
-   [Importer des utilisateurs CSV dans un AD via PowerShell](/windows_server/powershell/import_csv_users)
-   [Clés de Registre Utiles](/windows_server/registry/useful_keys)
-   [Exécuter un script PowerShell via une tâche planifiée](/windows_server/admin/jobs/schedule_jobs_scripts)
-   [Désactiver TLSv1 sur IIS via un script PowerShell](/windows_server/powershell/disable_tlsv1)
-   [Connaitre le temps d'exécution d'une commande PowerShell](/windows_server/powershell/command_time_execution)
-   [Accéder au Firewall sans Icône ni raccourci](/windows_server/firewall/access_without_shortcut)
-   [Variables built-in utiles](/windows_server/powershell/useful_vars)
-   [Initier des connexions iSCSi en CLI](/windows_server/powershell/initiate_iscsi)
-   [Installer des drivers via PowerShell](/windows_server/powershell/install_drivers)
-   [Définir PowerShell en temps que shell par défaut](/windows_server/core/setup_default_powershell)

### Desktop

-   [Enlever les publicités de Skype](/windows/soft/ads_skype)
-   [Windows 10 : Comment activer la gestion des chemins trop long ?](/windows/tips/long_path)
-   [Améliorer sa vie privée et les performances avec Blackbird](/windows/tips/improve_privacy)
-   [Bloquer les serveurs d'activation via le fichiers hosts](/windows/tips/hosts_file)
-   [Installer tous les logiciels de base via un simple installateur](/windows/tips/install_main_softwares)

# Misc

-   [Mes sources](/misc/sources)
-   [Bordel de liens utiles](/mess/useful_links)
-   [Monitoring des performances sous Linux](/mess/linux_performances)
-   [Optimisation](/mess/optimization)
-   [Scripts utiles](/mess/scripts_useful)
-   [Générer un template pour ses Pull Request et ses Issues](/mess/github_template)
-   [Logiciels Utiles](/mess/useful_software)
-   [Lancer la console iLO/iDRAC depuis un Mac](/mess/run_ilo)
-   [Lancer une ancienne console iLO](/mess/run_old_ilo)
-   [Western Digital Green HDD, Comment prémunir le old_age prématuré](/mess/fix_hdd)
-   [Informations utile sur les dénominations fibre optique](/mess/fibre_optique/info_transceiver)
-   [Télécharger les sous-titres Netflix simplement](/mess/download/netflix_subs)
-   [ILO Key](/mess/ilo_key)

