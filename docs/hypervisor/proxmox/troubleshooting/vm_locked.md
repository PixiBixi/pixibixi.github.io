---
description: Résoudre l'erreur 'VM is locked' dans Proxmox avec qm unlock, après avoir vérifié la tâche qui a posé le lock
tags:
  - Proxmox
  - Recovery
---

# Résoudre l'erreur « VM is locked »

Sous Proxmox, de ma faible expérience, il est fréquent d'avoir un problème de VM locked, souvent après un backup ou une migration qui a planté.

L'erreur `VM is locked (backup)` vient de la ligne `lock:` dans la config de la VM. On commence par regarder quelle opération l'a posée (XXX représente la VM ID) :

```bash
qm config XXX | grep ^lock
```

!!! warning "Vérifier que la tâche est bien terminée"
    Un lock `backup`, `snapshot`, `migrate` ou `clone` est posé par une tâche. Si elle tourne encore (onglet Tasks de l'UI, ou `/var/log/pve/tasks/active`), on ne lève pas le lock : on attend ou on stoppe la tâche.

Une fois la tâche morte, on retire le lock :

```bash
qm unlock XXX
```

Supprimer `/var/lock/qemu-server/lock-XXX.conf` à la main ne sert à rien ici : ce fichier n'est que le verrou (`flock`) qui sérialise les modifications de la config, pas le `lock:` de la VM. Le supprimer pendant une opération casse juste l'exclusion entre les tâches.

Si l'erreur est plutôt `can't lock file '/var/lock/qemu-server/lock-XXX.conf' - got timeout`, un process garde ce verrou. On le retrouve avant de le tuer :

```bash
lsof /var/lock/qemu-server/lock-XXX.conf
```
