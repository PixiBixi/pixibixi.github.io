---
article: docs/linux/security/disable_patches.md
checked: '2026-11-10'
commit: b7cb5f81765d87959301bbe78f6ba6d71c70de74
sources: []
unpinned: 9
---

# docs/linux/security/disable_patches.md

## Findings

- L45 ERROR corrigé : la liste reprend maintenant `if nokaslr then kpti=0 [ARM64]` verbatim, plus une phrase : sur ARM64 KPTI reste actif si KASLR l'exige, il faut aussi `nokaslr`. Preuve : kernel-parameters.txt@origin/master (8a651625, 7.4-rc2) l.4107 ; arch/arm64/kernel/cpufeature.c@origin/master:1734-1744 (KASLR force KPTI avant le test `cpu_mitigations_off()`).
- L39 OUTDATED corrigé : la liste à puces faite main remplacée par le bloc "Equivalent to" de kernel-parameters.txt@origin/master l.4107-4131 (25 entrées), avec la précision que c'est l'équivalent de mitigations=off et non des paramètres à ajouter.
- L11 IMPRECISE corrigé : phrase reformulée (5.2 officiel, backports 4.14.x/4.19.x, "ou ou" corrigé) + mention de `CONFIG_CPU_MITIGATIONS=y`. Preuve : kernel/cpu.c@v5.2:2351 `early_param("mitigations", ...)`, aucune occurrence dans kernel/cpu.c@v5.1 ; note CPU_MITIGATIONS dans kernel-parameters.txt@master l.4099-4100. Les backports 4.14/4.19 non vérifiés (arbres stable non clonés), texte conservé.
- L23 IMPRECISE corrigé : ajout de `grub2-mkconfig -o /boot/grub2/grub.cfg` pour RHEL/SUSE et d'un paragraphe d'avertissement (multi-tenant, CI partagée, code non fiable). Preuve : kernel-parameters.txt@master "it may also expose users to several CPU vulnerabilities".
- L30 IMPRECISE corrigé : `noibrs`, `noibpb`, `no_stf_barrier` retirés de la ligne générique, une liste dit qu'ils sont RHEL/CentOS seulement, PowerPC seulement, et que `tsx_async_abort` arrive en 5.4 ; phrase sur le `mitigations=off` final sans effet avant 5.2. Preuve : aucune occurrence de noibrs/noibpb dans kernel-parameters.txt ni arch/x86/kernel/cpu/bugs.c @master ; `early_param("no_stf_barrier")` dans arch/powerpc/kernel/security.c@master:266 ; `tsx_async_abort` absent de kernel-parameters.txt@v5.2, présent @v5.4. Le caractère "RHEL uniquement" de noibrs/noibpb n'est pas vérifié dans un kernel RHEL (seule l'absence en mainline l'est).
- L42 IMPRECISE corrigé : disparu avec la liste remplacée (le bloc verbatim dit `nopti [X86,PPC]` ; l'entrée propre est `nopti [X86-64,EARLY] Equivalent to pti=off`, kernel-parameters.txt@master l.4618).
- L47 IMPRECISE corrigé : la phrase "Undocumented ... nobody knows what" (inventée) disparaît avec la liste. Preuve : arch/s390/kernel/nospec-branch.c@master:7-30 (`nobp`, expoline).
- L77 IMPRECISE corrigé : sortie `ls` d'origine conservée, phrase ajoutée sur les fichiers d'un kernel récent + commande `lscpu | grep Vulnerability`. Preuve : Documentation/ABI/testing/sysfs-devices-system-cpu@master (gather_data_sampling ... vmscape) ; lscpu dans debian:12.7 sous kernel OrbStack 7.0.14 affiche une ligne `Vulnerability <nom>:` par faille.
- L85 IMPRECISE corrigé : messages confirmés, ajout de la phrase "Not affected" sur un CPU non touché. Preuve : arch/x86/kernel/cpu/bugs.c@master:1028-1029 ; /sys/.../vulnerabilities et lscpu dans le conteneur OrbStack ARM64 : "Not affected".

## En plus

- "faill" corrigé en "faille".

## Modernisation

- Ne pas lister à la main : appliqué via la citation verbatim datée (7.4), avec "la liste grossit à chaque faille".
- `mitigations=auto,nosmt` et attack vector controls : mentionnés en une phrase (non testés).
- `lscpu` : ajouté (testé).

## Tests

- Clone local ~/Documents/work/src/linux (blob:none, depth 1, tags v5.1, v5.2, v5.4 fetchés). Docker debian:12.7 sur kernel OrbStack 7.0.14 pour lscpu et /sys/devices/system/cpu/vulnerabilities. Aucun boot avec mitigations=off testé, pas de `tested_with`.

## À signaler

- La sortie `ls` d'exemple (prompt `λ yann`) date de l'ère 5.x, laissée telle quelle.
