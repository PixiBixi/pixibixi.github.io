# strace

strace intercepte et trace les appels système effectués par un processus.
Indispensable pour déboguer un processus qui bloque, échoue silencieusement,
ou consomme des ressources inattendues.

---

## Syntaxe de base

```bash
# Tracer une commande
strace commande [args]

# Attacher à un processus existant
strace -p <PID>

# Suivre les processus fils (fork/threads)
strace -f commande

# Résumé des appels (comptage + temps)
strace -c commande
```

---

## Options essentielles

| Option | Effet |
|--------|-------|
| `-p <PID>` | Attacher à un processus en cours |
| `-f` | Suivre les forks et threads |
| `-c` | Afficher un résumé statistique à la fin |
| `-e <expr>` | Filtrer par type d'appel |
| `-o <file>` | Écrire la sortie dans un fichier |
| `-t` | Ajouter l'heure à chaque ligne |
| `-T` | Afficher la durée de chaque appel |
| `-s <n>` | Taille max des strings affichées (défaut : 32) |
| `-x` | Afficher les strings en hexadécimal |
| `-y` | Afficher les chemins de fichiers des fd |
| `-yy` | Afficher aussi les infos socket |

---

## Filtrage par type d'appel (`-e`)

```bash
# Uniquement les appels réseau
strace -e trace=network curl https://example.com

# Uniquement les accès fichiers
strace -e trace=file ls /etc

# Appels mémoire
strace -e trace=memory commande

# Appels process (fork, exec, wait)
strace -e trace=process commande

# Plusieurs catégories
strace -e trace=file,network commande

# Un appel spécifique
strace -e openat,read,write commande

# Exclure un appel
strace -e trace='!futex' commande
```

Catégories disponibles : `file`, `network`, `memory`, `process`, `signal`, `ipc`, `desc`

---

## Résumé statistique

```bash
strace -c commande
```

```text
% time     seconds  usecs/call     calls    errors syscall
------ ----------- ----------- --------- --------- --------
 45.23    0.023451          12      1951           read
 30.12    0.015621          8       1952           write
 12.45    0.006453          6       1075      120  openat
...
```

Utile pour identifier quel appel système consomme le plus de temps.

---

## Attacher à plusieurs processus

```bash
# Attacher à tous les workers PHP-FPM
sudo strace -f -c $(pgrep php-fpm | sed 's/^/-p /' | tr '\n' ' ')

# Résumé des appels stat sur PHP-FPM
sudo strace -f -e trace=stat $(pgrep php-fpm | sed 's/^/-p /' | tr '\n' ' ')

# Attacher à tous les workers nginx
sudo strace -f -p $(pgrep -d',' nginx)
```

---

## Déboguer les problèmes courants

### Processus bloqué / hung

```bash
# Voir sur quel appel système le process est bloqué
strace -p <PID>
# Si le process ne répond plus, il sera souvent bloqué sur :
# read(), recv(), select(), poll(), futex(), nanosleep()
```

### Fichier introuvable

```bash
# Identifier les ENOENT (No such file or directory)
strace -e openat commande 2>&1 | grep ENOENT
```

### Problème de permissions

```bash
# Identifier les EACCES / EPERM
strace commande 2>&1 | grep -E "EACCES|EPERM"
```

### Port déjà utilisé / connexion refusée

```bash
strace -e trace=network commande 2>&1 | grep -E "EADDRINUSE|ECONNREFUSED"
```

### Identifier les fichiers de config lus au démarrage

```bash
# Voir tous les fichiers ouverts par une commande
strace -e openat -y commande 2>&1 | grep -v ENOENT
```

### Détecter les appels lents

```bash
# Afficher la durée de chaque appel, trier par les plus lents
strace -T -f commande 2>&1 | sort -t '<' -k2 -rn | head -20
```

---

## Enregistrer la trace pour analyse

```bash
# Sauvegarder dans un fichier avec timestamps
strace -tt -f -o /tmp/trace.log commande

# Attacher à un daemon et logger en arrière-plan
strace -tt -f -p <PID> -o /tmp/trace.log &

# Analyser après coup
grep ENOENT /tmp/trace.log
grep "open.*config" /tmp/trace.log
```

---

## Cas pratique : déboguer un service qui refuse de démarrer

```bash
# 1. Lancer le service sous strace avec toutes les options utiles
strace -f -tt -e trace=file,network,process \
    -o /tmp/service_debug.log \
    /usr/sbin/mon-service --foreground

# 2. Chercher les erreurs
grep -E "ENOENT|EACCES|ECONNREFUSED" /tmp/service_debug.log

# 3. Voir les fichiers que le service cherche à ouvrir
grep "openat" /tmp/service_debug.log | grep -v " = [0-9]"
```

---

## Alternatives

| Outil | Usage |
|-------|-------|
| `ltrace` | Trace les appels aux bibliothèques partagées (libc, etc.) |
| `perf trace` | Alternative plus performante à strace (moins d'overhead) |
| `bpftrace` | Traçage avancé via eBPF — scripts personnalisables |
| `lsof -p <PID>` | Fichiers et sockets ouverts (sans trace des appels) |
