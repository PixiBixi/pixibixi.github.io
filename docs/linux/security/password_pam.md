---
description: Renforcer la politique de mots de passe Linux avec PAM et pam-cracklib pour imposer des critères de complexité
---

# Améliorer la sécurité des mots de passe par défaut

Par défaut, tous les systèmees UNIX se basent sur une authentification
par mot de passe. Le système d'authentification **PAM** s'occupe de ce
processus.

C'est également via ce procédé que nous pouvons effectuer des
authentifications distantes telles LDAP, AD...

Ce qui nous intéresse de notre côté est la sécurisation du mot de passe
via PAM. Par défaut, tous les mots de passe sont acceptés par défaut, ce
que nous voulons pas.

## PAM-Cracklib

C'est donc du côté du packet PAM-Cracklib que nous allons nous tourner.
PAM-Cracklib va nous permettre d'apporter une sécurité non négligable
en forcant la présence d'une majuscule, d'un chiffre... dans le mot
de passe

### Installation

Etant donner qu'il s'agit d'un packet, il nous faut l'installer.

```bash
apt-get install libpam-cracklib
```

### Configuration

Tout se fait dans le fichier */etc/pam.d/common-password*, nous allons
donc l'éditer

```bash
nano /etc/pam.d/common-password
```

Vous allez désormais ajouter cette ligne, juste au dessus de la première
ligne non commentée :

```bash
password    requisite           pam_cracklib.so retry=3 minlen=8 difok=3
```

Ici, nous voyons que le module `pam_cracklib` (du moins, sa librairie)
sera chargée lorsque nous exécutons une actions relative au mot de passe
avec quelques options :

* `retry` : Nombre d'essais avant que l'exécutaire passwd soit
    relancé
* `minlen` : Nombre de caractères minimum requis
* `difok` : Nombre de caractères différents lors d'un changement de
    mot de passe exigé

D'autres paramètres sont égalements disponibles et peuvent vous
intéressés :

* `difok` : Stocke un nombre donné de mot de passe afin de les
    empêcher d'être réutilisés
* `lcredit` : Force l'utilisation de minuscule
* `ucredit` : Force l'utilisation de majuscule
* `dcredit` : Force l'utilisation de décimal
* `ocredit` : Force l'utilisation de caractères spéciaux

Par exemple, la ligne suivant force un mot de passe de 8 caractères
minimaux, différents des 3 derniers, comportant au moins une minuscule,
une majuscule, 3 chiffres et un caractères spéciaux.

```bash
password  required  pam_cracklib.so retry=3 minlen=8 difok=3 lcredit=1 ucredit=1 dcredit=3 ocredit=1
```

Cependant, si vous spécifiez un chiffre spécifique, cela signifie que
vous devriez avoir exactement ce nombre du type de caractères dans votre
mot de passe. Pour spécifier au moins un caractère de ce type, il faut
mettre.. `-1`

## Login.defs

Autre que PAM-Cracklib, `Login.defs` permet de spécifier des options
utiles telles que

* `PASS_MAX_DAYS` : Nombre de jours maximum pour conserver un mot de
    passe
* `PASS_MIN_DAYS` : Minimum de jours autorisés avant de pouvoir
    modifier son mot de passe
* `PASS_WARN_AGE` : Nombre de jours à partir duquel un warning sera
    affiché
