---
description: Renforcer la politique de mots de passe Linux avec PAM, pam_pwquality et pam_pwhistory, puis gérer l'expiration avec login.defs et chage
tags:
  - PAM
  - Authentication
---

# Améliorer la sécurité des mots de passe par défaut

Par défaut, tous les systèmes UNIX se basent sur une authentification par mot de passe. Le système d'authentification **PAM** s'occupe de ce processus.

C'est également via ce procédé que nous pouvons effectuer des authentifications distantes telles LDAP, AD...

Ce qui nous intéresse de notre côté est la sécurisation du mot de passe via PAM. Par défaut, presque tous les mots de passe sont acceptés, ce que nous ne voulons pas.

## pam_pwquality

Les vieux tutos passent par `pam_cracklib` : il a été retiré de Linux-PAM en 1.5.0, et le paquet `libpam-cracklib` n'existe plus depuis Debian 12. Son remplaçant est `pam_pwquality`, qui reprend les mêmes options (`retry`, `minlen`, `difok`, `ucredit`...).

### Installation

Étant donné qu'il s'agit d'un paquet, il nous faut l'installer. `libpwquality-tools` apporte `pwscore`, pratique pour tester la politique :

```bash
apt-get install libpam-pwquality libpwquality-tools
```

Sur Debian et Ubuntu, `pam-auth-update` ajoute tout seul la ligne du module dans `/etc/pam.d/common-password` :

```text
password    requisite    pam_pwquality.so retry=3
```

### Configuration

Plutôt que d'empiler les options sur cette ligne, on les met dans `/etc/security/pwquality.conf`, ou dans un fichier de `/etc/security/pwquality.conf.d/`. Le module PAM et les autres outils qui utilisent libpwquality lisent les mêmes valeurs, et `pam-auth-update` n'y touche pas.

Les options principales :

- `minlen` : longueur minimale (défaut 8, jamais moins de 6)
- `difok` : nombre de caractères du nouveau mot de passe absents de l'ancien (défaut 1)
- `dcredit`, `ucredit`, `lcredit`, `ocredit` : chiffres, majuscules, minuscules et caractères spéciaux
- `minclass` : nombre minimum de classes de caractères différentes parmi les 4
- `retry` : nombre de fois où l'utilisateur peut retaper un mot de passe refusé avant que `passwd` abandonne (défaut 1)
- `enforce_for_root` : applique aussi la politique quand root change un mot de passe, sinon il passe outre avec un simple avertissement

Le piège est sur les credits. Une valeur **positive** n'impose rien : c'est un bonus, chaque caractère de la classe compte comme 1 caractère de plus vers `minlen`, jusqu'à N. Seule une valeur **négative** impose un minimum : `dcredit=-3` exige au moins 3 chiffres. Les credits sont à 0 par défaut, `minlen` est alors une vraie longueur.

Par exemple, ce fichier force un mot de passe de 12 caractères minimum, avec au moins une minuscule, une majuscule, 3 chiffres et un caractère spécial :

```ini title="/etc/security/pwquality.conf.d/local.conf"
minlen = 12
difok = 3
lcredit = -1
ucredit = -1
dcredit = -3
ocredit = -1
retry = 3
enforce_for_root
```

On teste la politique sans changer de mot de passe : `pwscore` lit le mot de passe sur l'entrée standard, et répond un score ou la raison du refus.

```bash
echo 'Azerty123' | pwscore
```

### Historique des mots de passe

`difok` compare seulement avec le mot de passe actuel. Pour empêcher de réutiliser les N derniers, c'est le module `pam_pwhistory` (livré avec Linux-PAM), qui les stocke dans `/etc/security/opasswd`. On ajoute sa ligne dans `/etc/pam.d/common-password`, entre `pam_pwquality` et `pam_unix` :

```text
password    requisite    pam_pwquality.so retry=3
password    requisite    pam_pwhistory.so remember=5 use_authtok enforce_for_root
password    [success=1 default=ignore]    pam_unix.so obscure use_authtok try_first_pass yescrypt
```

Une fois ce module ajouté à la main, `pam-auth-update` considère le fichier comme modifié localement et ne le met plus à jour, sauf avec `--force`, qui écrase la modification.

## login.defs

Autre que PAM, `/etc/login.defs` permet de spécifier des options d'expiration :

- `PASS_MAX_DAYS` : nombre de jours maximum pour conserver un mot de passe
- `PASS_MIN_DAYS` : minimum de jours avant de pouvoir modifier son mot de passe
- `PASS_WARN_AGE` : nombre de jours avant expiration à partir duquel un warning est affiché

Ces valeurs ne sont lues qu'à la création du compte (`useradd`) : les modifier ne change rien pour les comptes existants. Depuis shadow 4.20, `PASS_MIN_DAYS` n'est même plus lu par `useradd` (Debian 13 est en 4.17, il fonctionne encore).

Pour un compte existant, on passe par `chage` :

```bash
# 90 days max, 1 day min, warning 14 days before
chage -M 90 -m 1 -W 14 jeremy
# Check the result
chage -l jeremy
```
