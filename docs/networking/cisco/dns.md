---
description: "Désactiver la résolution DNS sur Cisco IOS avec no ip domain-lookup et transport preferred none, pour supprimer le timeout de 30 secondes après une faute de frappe en console."
tags:
  - Cisco
  - DNS
---

# Cisco : désactiver la résolution DNS (no ip domain-lookup)

Une faute de frappe en mode enable et IOS considère le mot comme un nom d'hôte à résoudre. Le terminal se bloque une trentaine de secondes, sans qu'aucune touche ne réponde. Deux commandes suppriment ce comportement et la plupart des réponses n'en donnent qu'une.

## La première commande

En mode configuration globale :

```cisco
Router> enable
Router# configure terminal
Router(config)# no ip domain-lookup
```

Sur IOS 15 et au-delà, la commande a perdu son tiret. Les deux formes coexistent selon les versions et la complétion par tabulation tranche en une seconde :

```cisco
Router(config)# no ip domain lookup
```

## La seconde, celle qu'on oublie

`no ip domain-lookup` empêche la résolution, mais IOS tente encore d'ouvrir une session Telnet vers ce qu'il a pris pour un hôte et le blocage reste. Il faut lui retirer ce réflexe, ligne par ligne :

```cisco
Router(config)# line con 0
Router(config-line)# transport preferred none
Router(config-line)# exit
Router(config)# line vty 0 4
Router(config-line)# transport preferred none
```

C'est cette commande qui fait réellement disparaître l'attente. Sans elle, le comportement s'améliore sans disparaître, ce qui explique les retours du type « ça ne marche pas chez moi ».

## Tant qu'on y est

`logging synchronous` évite qu'un message console s'affiche au milieu d'une commande en cours de frappe, ce qui est le second irritant de la console Cisco :

```cisco
Router(config)# line con 0
Router(config-line)# logging synchronous
Router(config-line)# exec-timeout 15 0
```

## Sortir d'une résolution en cours

Si le blocage est déjà là, la séquence d'échappement l'interrompt sans attendre le timeout : **Ctrl + Maj + 6**, relâcher, puis **x**. Elle fonctionne aussi pour interrompre un `ping` ou un `traceroute` long.

## Garder la résolution, mais correcte

Sur un équipement de production, on veut souvent l'inverse : que la résolution fonctionne vraiment, donc qu'elle soit rapide. On garde `ip domain-lookup` et on lui donne un serveur joignable, sinon chaque requête part vers le broadcast `255.255.255.255` par défaut et expire :

```cisco
Router(config)# ip domain-lookup
Router(config)# ip name-server 10.0.0.53 10.0.0.54
Router(config)# ip domain-name example.local
```

Ne pas oublier de sauvegarder, sans quoi tout est perdu au prochain redémarrage :

```cisco
Router# write memory
```
