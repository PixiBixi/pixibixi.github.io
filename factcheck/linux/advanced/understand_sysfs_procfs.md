---
article: docs/linux/advanced/understand_sysfs_procfs.md
checked: '2026-11-10'
commit: 8a957e8d4d5f080e468000e58b1d3bc049012583
sources:
- repo: linux
  path: Documentation/accounting/psi.rst
  lines: '45'
  ref: origin/master
  commit: e0d8e8de8bcb1ef7b749033b5af5518ba8df7bec
- repo: linux
  path: block/elevator.c
  lines: 744-746
  ref: origin/master
  commit: e0d8e8de8bcb1ef7b749033b5af5518ba8df7bec
- repo: linux
  path: Documentation/filesystems/proc.rst
  lines: 2398-2436
  ref: origin/master
  commit: e0d8e8de8bcb1ef7b749033b5af5518ba8df7bec
- repo: linux
  path: arch/powerpc/kernel/security.c
  lines: '266'
  ref: origin/master
  commit: e0d8e8de8bcb1ef7b749033b5af5518ba8df7bec
unpinned: 8
---

# docs/linux/advanced/understand_sysfs_procfs.md

## Findings

- L136 ERROR corrigé : `/proc/cgroup` remplacé par `/proc/cgroups` (contrôleurs) et `/proc/<pid>/cgroup` (appartenance), avec mention que `/proc/cgroup` n'existe pas. Preuve : container alpine:3.20 (kernel 7.0.14) `ls /proc/cgroup` -> "No such file or directory", `/proc/cgroups` et `/proc/self/cgroup` présents.
- L243 ERROR corrigé : PSI `some` décrit comme % de temps où au moins une tâche est bloquée, pas un % de process ; `total` en microsecondes. Preuve : linux Documentation/accounting/psi.rst:45 @origin/master (8a65162).
- L304 ERROR corrigé : NVMe multi-queue est déjà en `none` par défaut, seuls les single-queue prennent `mq-deadline`. Preuve : block/elevator.c:744-746 @origin/master.
- L247 OUTDATED corrigé : 4 valeurs (0/off, 1/noaccess, 2/invisible, 4/ptraceable) plus `subset=pid`. Preuve : Documentation/filesystems/proc.rst:2398-2436 @origin/master ; test container `mount -t proc -o hidepid=4,subset=pid` -> monté `hidepid=ptraceable,subset=pid`, seuls les PID et `self` visibles.
- L28 IMPRECISE corrigé : "toutes les distributions Linux" (BSD et Solaris ont un procfs au format différent). Preuve : connaissance générale, pas de source primaire consultée.
- L142 IMPRECISE corrigé : la version vue dans cmdline vient du nom de fichier `vmlinuz`, renvoi vers `uname -r` / `/proc/version`. Preuve : raisonnement sur BOOT_IMAGE (paramètre du bootloader), non testé.
- L148 IMPRECISE corrigé : sortie conservée (c'est la vraie cmdline de l'auteur), phrase ajoutée sous le bloc : `no_stf_barrier` PowerPC uniquement, `mitigations=off` suffit sur un kernel récent. Preuve : `early_param("no_stf_barrier")` seulement dans arch/powerpc/kernel/security.c:266 @origin/master.
- L224 IMPRECISE corrigé : "processus runnable (en cours ou en file d'attente)". Preuve : Documentation/filesystems/proc.rst:768.
- L252 IMPRECISE corrigé : hidepid=1 rend les dossiers des autres inaccessibles (pas seulement certains fichiers). Preuve : proc.rst "users may not access any /proc/&lt;pid&gt;/ directories but their own".
- L274 IMPRECISE corrigé (2 findings) : "en principe une seule valeur" avec l'exception des listes à crochets, et "une bonne partie des attributs reste en lecture seule". Preuve : Documentation/filesystems/sysfs.rst:62-65 ("preferably with only one value per file ... socially acceptable to express an array").
- L332 IMPRECISE corrigé : commentaire du bloc précise que ce sont les compteurs génériques du kernel, les drops hardware sont dans `ethtool -S`. Preuve : Documentation/ABI/testing/sysfs-class-net-statistics:44-52 ("See the network driver for the exact meaning").
- L342 IMPRECISE corrigé : phrase ajoutée, le défaut THP dépend de la config kernel (`always` ou `madvise`). Preuve : mm/Kconfig:848-850 (choice "Transparent Hugepage Support sysfs defaults", default ALWAYS) ; le container OrbStack affiche `always [madvise] never`.

## En plus

- L253 hidepid=2 : l'article disait "personne ne voit les dossiers des PID hormis root", alors que chacun voit ses propres process (l'exemple fstab plus bas le dit d'ailleurs). Corrigé. Preuve : proc.rst "hidepid=1 plus all /proc/&lt;pid&gt;/ will be fully invisible to other users".
- L255 typo `hidpid=2` -> `hidepid=2` ; L226 "corresond" -> "correspond" ; L28 "toute les" -> "toutes les".

## Modernisation

- hidepid=4 / subset=pid : appliqué. `pidns=` non ajouté (usage niche, aurait alourdi la section).
- dstat -> dool : appliqué (une phrase après le lien man). Preuve : `gh api repos/dstat-real/dstat` archived=true, dernier push 2020-06-18 ; scottchiefbaker/dool actif (push 2026-10-14). pcp-dstat non mentionné (non vérifié).
- systemd-tmpfiles type `w` : appliqué dans l'admonition de persistance (syntaxe non testée sur une machine systemd).
- Ligne `full` dans /proc/pressure/cpu depuis 5.13 : appliqué. Preuve : psi.rst:57-58.

## Tests

- OrbStack, alpine:3.20 privileged, kernel 7.0.14-orbstack : /proc/cgroup absent, mount hidepid=4,subset=pid OK. /proc/pressure absent dans ce kernel (PSI non testé en live).
- Clone créé : ~/Documents/work/src/linux (shallow, blob:none, origin/master 8a65162).

## À signaler

- Le lien paste.jdelgado.fr (L50) n'a pas été vérifié.
- Le reste de l'article garde l'ancien style ("nous", "vous") : non réécrit volontairement.
