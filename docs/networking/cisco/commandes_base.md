---
description: Référence des commandes de base Cisco IOS - navigation, configuration et administration des switches et routeurs
tags:
  - Cisco
---

# Commandes de base Cisco IOS

Voici toutes les commandes de base à connaitre pour un équipement Cisco
compatibles **switch** et **router**.

## Outils de diagnostics

Effectuer un ping

    Router# ping ip-address

Effectuer un traceroute

    Router# traceroute ip-address

## Visualisation de l'état de l'Equipement

Montrer la version de l'IOS

    Router# show version

Montre le contenu de la mémoire flash

    Router# show flash

Montre les interfaces de l'équipement

    Router# show interfaces

## Visualisation et Sauvegarde de la configuration

Configuration courante

    Router# show running-config

Configuration au démarrage

    Router# show startup-config

Sauvegarder la configuration du routeur

    Router# copy running-config startup-config

Sauvegarder la configuration du routeur sur un serveur TFTP

    Router# copy running-config tftp:

TFTP passe en clair et sans authentification, alors que la config contient les hash et les mots de passe type 7. Dès que possible, on passe par SCP (qui s'appuie sur SSH) :

    Router# copy running-config scp:

Pour l'inverse (récupérer des fichiers depuis l'équipement en SCP), on active le serveur SCP :

    Router(config)# ip scp server enable

Supprimer la configuration de démarrage

    Router# erase startup-config

## Configuration de base d'un équipement CISCO

Affecter un nom au routeur

    Router(config)# hostname router-name

Définir un mot de passe hashé pour le mode privilégié

    Router(config)# enable secret password

Sans option, `enable secret` produit un hash MD5 (type 5). Sur les IOS qui le supportent, on préfère scrypt (type 9) :

    Router(config)# enable algorithm-type scrypt secret password

Définit une bannière de connexion (motd)

    Router(config)# banner motd #

Où `#` est le caractère d'exit (il est possible de le modifier)

## Configuration des lignes consoles et terminaux virtuels (vty)

Mettre un password pour le port console

    Router(config)# line console 0
    Router(config-line)# password password
    Router(config-line)# login
    Router(config-line)# logging synchronous

Password pour le telnet

    Router(config)# line vty 0 4
    Switch(config)# line vty 0 15
    Router(config-line)# password password
    Router(config-line)# login

Telnet fait passer identifiants et session en clair : à réserver au lab. Pour l'accès distant, on configure SSH avec un utilisateur local et on interdit telnet sur les vty :

    Router(config)# ip domain-name example.com
    Router(config)# crypto key generate rsa modulus 2048
    Router(config)# ip ssh version 2
    Router(config)# username admin privilege 15 algorithm-type scrypt secret password
    Router(config)# line vty 0 4
    Router(config-line)# login local
    Router(config-line)# transport input ssh

Masquer tous les passwords tappés précédemment

    Router(config)# service password-encryption

Ce n'est pas du vrai chiffrement : c'est un type 7, un simple chiffre de Vigenère réversible en une seconde. Ça protège d'une lecture par-dessus l'épaule, pas d'une fuite de la config. Pour les vrais secrets, on utilise `secret` (hashé) plutôt que `password`.
