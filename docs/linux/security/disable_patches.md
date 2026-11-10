---
description: Désactiver les mitigations Meltdown/Spectre au démarrage du kernel pour retrouver les performances maximales
tags:
  - Patch Management
---

# Désactiver les patchs de sécurité Meltdown & co

Suite à Meltdown & co, le kernel Linux a implémenté de nombreux patches qu'il est possible de désactiver afin de retrouver des performances correctes. Le paramètre `mitigations=` existe "officiellement" depuis le 5.2, et a été backporté en 4.14.x et 4.19.x. Il n'a d'effet que si le kernel est compilé avec `CONFIG_CPU_MITIGATIONS=y` (le cas des kernels des distributions).

On ne fait ça que sur une machine où tout le code qui tourne est de confiance : sans mitigations, un process ou une VM peut lire la mémoire des autres. À proscrire sur un hyperviseur multi-tenant, un runner CI partagé ou un poste qui exécute du JavaScript venu du web.

Des benchmarks sont disponibles
[ici](https://www.phoronix.com/scan.php?page=article&item=spectre-meltdown-2&num=1)

## Application

Pour changer les paramètres, il faut éditer le fichier `/etc/default/grub`
et rajouter ceci :

```bash
GRUB_CMDLINE_LINUX_DEFAULT="quiet mitigations=off"
```

Si vous disposez d'un kernel inférieur à 5.2, alors voici la ligne à mettre. Le `mitigations=off` final est sans effet avant le 5.2 mais prend le relais après une mise à jour du kernel :

```bash
GRUB_CMDLINE_LINUX_DEFAULT="quiet nopti nospectre_v1 nospectre_v2 l1tf=off nospec_store_bypass_disable mds=off tsx_async_abort=off mitigations=off"
```

Quelques paramètres dépendent du kernel ou de l'architecture, un paramètre inconnu est simplement ignoré :

- `noibrs` et `noibpb` n'existent que dans les kernels RHEL/CentOS, on les ajoute sur ces distributions
- `no_stf_barrier` ne concerne que PowerPC
- `tsx_async_abort=off` n'existe qu'à partir du 5.4 (et des backports)

Puis il faut lancer une regénération du grub, `update-grub` sur Debian/Ubuntu ou `grub2-mkconfig` sur RHEL/SUSE :

``` bash
update-grub
grub2-mkconfig -o /boot/grub2/grub.cfg
```

`mitigations=off` équivaut à passer toute la liste suivante d'un coup, pas besoin de l'ajouter en plus. La liste grossit à chaque nouvelle faille, voici celle de `Documentation/admin-guide/kernel-parameters.txt` en 7.4 :

```text
Equivalent to: if nokaslr then kpti=0 [ARM64]
               gather_data_sampling=off [X86]
               indirect_target_selection=off [X86]
               kvm.nx_huge_pages=off [X86]
               l1tf=off [X86]
               mds=off [X86]
               mmio_stale_data=off [X86]
               no_entry_flush [PPC]
               no_uaccess_flush [PPC]
               nobp=0 [S390]
               nopti [X86,PPC]
               nospectre_bhb [ARM64]
               nospectre_v1 [X86,PPC]
               nospectre_v2 [X86,PPC,S390,ARM64]
               reg_file_data_sampling=off [X86]
               retbleed=off [X86]
               spec_rstack_overflow=off [X86]
               spec_store_bypass_disable=off [X86,PPC]
               spectre_bhi=off [X86]
               spectre_v2_user=off [X86]
               srbds=off [X86,INTEL]
               ssbd=force-off [ARM64]
               tsa=off [X86,AMD]
               tsx_async_abort=off [X86]
               vmscape=off [X86]
```

Sur ARM64, KPTI reste actif si KASLR l'exige : il faut aussi passer `nokaslr` pour qu'il saute.

Entre tout et rien, `mitigations=auto` (le défaut) garde le SMT, `mitigations=auto,nosmt` désactive le SMT si besoin. Sur x86, les kernels récents permettent aussi de ne désactiver que certains vecteurs d'attaque (`Documentation/admin-guide/hw-vuln/attack_vector_controls.rst`).

## Vérification

Pour vérifier que les vulnérabilités ne sont plus mitigées, il faut se
pencher du côté du dossier `/sys/devices/system/cpu/vulnerabilities/`

```bash
λ yann ~ → ls /sys/devices/system/cpu/vulnerabilities/
itlb_multihit  l1tf  mds  meltdown  spec_store_bypass  spectre_v1  spectre_v2  tsx_async_abort
```

Un kernel récent en expose bien plus (`gather_data_sampling`, `mmio_stale_data`, `retbleed`, `srbds`, `tsa`, `vmscape`...). `lscpu` en donne aussi un résumé, une ligne `Vulnerability` par faille :

```bash
lscpu | grep Vulnerability
```

Si nous regardons le contenu du fichier spectre_v1 par exemple **avant**
correction du kernel :

```bash
λ yann ~ → cat /sys/devices/system/cpu/vulnerabilities/spectre_v1
Mitigation: usercopy/swapgs barriers and __user pointer sanitization
```

Nous voyons ici que la vulnérabilité est mitigée. Sur un serveur
non-mitigé, voici le message que nous auront :

```bash
λ yann ~ → cat /sys/devices/system/cpu/vulnerabilities/spectre_v1
Vulnerable: __user pointer sanitization and usercopy barriers only; no swapgs barriers
```

Nous voyons ici que le patch kernel a été désactivé et que nous sommes
donc « vulnérable » à la faille Spectre V1. Sur un CPU qui n'est pas touché par une faille, le fichier affiche `Not affected`, avec ou sans `mitigations=off`.
