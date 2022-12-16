# Désactiver les patchs de sécurité Meltdown & co

Suite à Meltdown & co, le kernel Linux a implémenté de nombreux patches
qu'il est possible de désactiver afin de retrouver des performances
correctes. Ce paramètre a été introduit en backports 4.14.x, 4.19.x ou
ou 5.2 '"officiellement'".

Des benchmarks sont disponibles
[ici](https://www.phoronix.com/scan.php?page=article&item=spectre-meltdown-2&num=1)

## Application

Pour changer les paramètres, il faut éditer le fichier /etc/default/grub
et rajouter ceci :

    GRUB_CMDLINE_LINUX_DEFAULT="quiet mitigations=off"

Si vous disposez d'un kernel inférieur à 5.2, alors voici la ligne à
mettre

    GRUB_CMDLINE_LINUX_DEFAULT="quiet noibrs noibpb nopti nospectre_v2 nospectre_v1 l1tf=off nospec_store_bypass_disable no_stf_barrier mds=off tsx_async_abort=off mitigations=off"

Puis il faut lancer une regénération du grub :

    update-grub

Voici les paramètres mitigés via un mitigations=off dans un kernel
récent :

-   **nopti** '[X86,PPC'] - Control Page Table Isolation of user and
    kernel address spaces. Disabling this feature removes hardening, but
    improves performance of system calls and interrupts.
-   **kpti**=0 '[ARM64'] - Control page table isolation of user and
    kernel address spaces.
-   **nobp**=0 '[S390'] - Undocumented. Does something on S390 systems,
    nobody knows what.
-   **nospectre_v1** '[X86,PPC'] - Disable mitigations for Spectre
    Variant 1 (bounds check bypass). With this option data leaks are
    possible in the system.
-   **nospectre_v2** '[X86,PPC,S390,ARM64'] - Disable all mitigations
    for the Spectre variant 2 (indirect branch prediction)
    vulnerability. System may allow data leaks with this option.
-   **spectre_v2_user**=off '[X86'] - Control mitigation of Spectre
    variant 2 (indirect branch speculation) vulnerability between user
    space tasks
-   **spec_store_bypass_disable**=off '[X86,PPC'] - Control Speculative
    Store Bypass (SSB) Disable mitigation (Speculative Store Bypass
    vulnerability)
-   **ssbd**=force-off '[ARM64'] - Speculative Store Bypass Disable
    control
-   **l1tf**=off '[X86'] - Control mitigation of the L1TF vulnerability
    on affected CPUs
-   **mds**=off '[X86'] - Control mitigation for the Micro-architectural
    Data Sampling (MDS) vulnerability.
-   **tsx_async_abort**=off '[X86'] - Control mitigation for the Micro-architectural
    TSX (MDS) vulnerability.


## Vérification

Pour vérifier que les vulnérabilités ne sont plus mitigées, il faut se
pencher du côté du dossier **/sys/devices/system/cpu/vulnerabilities/**

```bash
λ yann ~ → ls /sys/devices/system/cpu/vulnerabilities/
itlb_multihit  l1tf  mds  meltdown  spec_store_bypass  spectre_v1  spectre_v2  tsx_async_abort
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
donc '"vulnérable'" à la faill Spectre V1
