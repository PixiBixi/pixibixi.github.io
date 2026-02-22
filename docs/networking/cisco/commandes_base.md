---
description: Référence des commandes de base Cisco IOS — navigation, configuration et administration des switches et routeurs
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

Supprimer la configuration de démarrage

    Router# erase startup-config

## Configuration de base d'un équipement CISCO

Affecter un nom au routeur

    Router(config)# hostname router-name

Définir un mot de passe crypté pour le mode privilégié

    Router(config)# enable secret password

Définit une bannière de connexion (motd)

    Router(config)# banner motd #

Où '# est le caractère d'exit (il est possible de le modifier)

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

Encrypter tous les passwords tappés précédemment

    Router(config)# service password-encryption
