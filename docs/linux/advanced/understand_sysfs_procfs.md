# Exploration poussée des systèmes de fichiers sysfs & procfs

## Introduction

Beaucoup de répertoires sous Linux sont connus par la majorité des
administrateurs systèmes (/usr,/etc,/bin)...

Cependant, 2 filesystem restent assez méconnus pour bon nombre d'entre
nous, `/sys` et `/proc`.
Cet article aura pour but d'en expliquer les principaux fichiers.

## Système de fichier /proc

`/proc` dispose de son propre à celui-ci, procfs. Il est possible de
renforcer la sécurité de ce dernier qui est simplement inexistante de
base. Nous allons voir ultérieuemenr les différentes options de hardening

## Structure de base de /proc

Il s'agit d'un point de montage monté dans toute les distributions
UNIX. Toutes les commandes tels que ps,top,vmstat et free parsent
différents fichiers de /proc afin d'obtenir leur résultats. Voici par
exemple le résultat de free et son équivalent dans /proc

```bash
λ jeremy /proc → free
              total        used        free      shared  buff/cache   available
Mem:       16379504     1948272     3373296        6112    11057936    14094688
Swap:       4189180     2077184     2111996

λ jeremy / → cat /proc/meminfo
MemTotal:       16379504 kB
MemFree:         2793060 kB
MemAvailable:   14082656 kB
Buffers:          346800 kB
Cached:         10535828 kB
```

Nous pouvons voir que la commande free est juste un "parsage" du contenu de `/proc/meminfo`. (Techniquement, le syscall générant le fichier ou utilisant la commande est le même, ce n'est pas un "simple" parsage)


Une vue globale de /proc est disponible
[ici](https://paste.jdelgado.fr/?726e2d9772c477f4#Odqr+tWvVJlXrvUVinAzk1vh9R9qCxuEEvK8KhxMPCo=)

Tout d'abord, nous pouvons voir les dossiers `/proc/[pid]`. Chaque
répertoire contient différentes informations pour chaque PID, nous
reviendrons sur ces répertoires par la suite. Par défaut, chaque
utilisateur peut voir tous les PID de tout le monde. Cependant, il est
possible de rendre invisible les PID ne nous appartenant pas afin de
rendre plus sécurisé notre système. N'importe quel utilisateur
non-privilégié peut accéder a beaucoup d'informations. Ce n'est pas
forcément critique, mais moins l'utilisateur en sait, mieux c'est non
? :-)

De même que pour les pids, nous avoir un répertoire virtuel
  * `/proc/net` contient de multiples informations sur les
composants réseaux de votre système.

  * `/proc/sys` est un répertoire où nous pouvons définir ou visualiser
beaucoup de comportements du système tel que le nombre maximum de PID du
système, le comportement à adopter après un kernel-panic...

  * `/proc/irq` est un répertoire un peu '"particulier'" où nous pouvons
définir manuellement les interruptions à un certain core du CPU.

Outre ces répertoires, de nombreux fichiers peuvent nous importer de
nombreuses informations.

## Fichiers utiles

Tous les fichiers ne seront pas traités dans cette partie, seuls les
fichiers que j'ai jugé utiles le seront. Certains autres fichiers
peuvent également être utiles mais difficilement exploitable par
l'Homme.

  * `/proc/cpuinfo` nous apportera des précisions sur quel processeur nous utilisons, son modèle, les bugs auxquels il est vulnérable...

??? note "/proc/cpuinfo"
	```bash
	processor   : 0
	vendor_id   : GenuineIntel
	cpu family  : 6
	model       : 42
	model name  : Intel(R) Xeon(R) CPU E31230 @ 3.20GHz
	stepping    : 7
	microcode   : 0x2f
	cpu MHz     : 3559.874
	cache size  : 8192 KB
	physical id : 0
	siblings    : 8
	core id     : 0
	cpu cores   : 4
	apicid      : 0
	initial apicid  : 0
	fpu     : yes
	fpu_exception   : yes
	cpuid level : 13
	wp      : yes
	flags       : fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov pat pse36 clflush dts acpi mmx fxsr sse sse2 ss ht tm pbe syscall nx rdtscp lm constant_tsc arch_perfmon pebs bts rep_good nopl xtopology nonstop_tsc cpuid aperfmperf pni pclmulqdq dtes64 monitor ds_cpl vmx smx est tm2 ssse3 cx16 xtpr pdcm pcid sse4_1 sse4_2 x2apic popcnt tsc_deadline_timer aes xsave avx lahf_lm pti ssbd ibrs ibpb stibp tpr_shadow vnmi flexpriority ept vpid xsaveopt dtherm ida arat pln pts md_clear flush_l1d
	bugs        : cpu_meltdown spectre_v1 spectre_v2 spec_store_bypass l1tf mds swapgs itlb_multihit
	bogomips    : 6385.39
	clflush size    : 64
	cache_alignment : 64
	address sizes   : 36 bits physical, 48 bits virtual
	power management:
	```

Un petit extrait de notre fichier **/proc/cpuinfo**. Nous pouvons
rapidement voir qu'il s'agit d'un modèle E3-1230 propulsé à 3.20GHz
de base. Nous pouvons voir la version du microcode embarqué, les
instructions embarquées ainsi que les bugs auquel il est touché.

Pour rappel, si vous souhaitez retrouver des performances sur votre
processeur Intel et désactiver les patchs de sécurité, je vous rappelle
qu'un tutoriel est disponible
[ici](/linux/security/disable_patches#application)

  * `/proc/meminfo` nous permet d'obtenir toutes les informations
    nécessaires à notre RAM (RAM Totale, disponible, free...)

??? note "Sample of /proc/meminfo"
	```bash
	MemTotal:       16379496 kB
	MemFree:         1008852 kB
	MemAvailable:   14001640 kB
	Buffers:           87848 kB
	Cached:         12093768 kB
	```

  * `/proc/cgroup` est un mécanisme de linux (Control Group) est un
    ensemble de processus liés à un ensemble de limites ou paramètres
    définis via un filesystem cgroup. Ce mécanisme est par exemple
    utilisé par Docker afin de limiter les ressources si vous le
    souhaité. Nous explorerons certainement les cgroups dans un prochain
    articl.
  * `/proc/cmdline` est également un fichier très intéressant. il nous
    indique avec quels paramètres est lancé notre kernel Linux mais
    également dans quelle version

```bash
λ jeremy /proc → cat cmdline
BOOT_IMAGE=/vmlinuz-4.19.0-8-amd64 root=UUID=ccedef42-f296-4e01-ad9e-4327f847b728 ro debian-installer=en_US.UTF-8 quiet noibrs noibpb nopti nospectre_v2 nospectre_v1 l1tf=off nospec_store_bypass_disable no_stf_barrier mds=off mitigations=off
```

Je démarre ici sur le kernel 4.19.0-8 sur la partition ayant l'UUID
ccedef42-f296-4e01-ad9e-4327f847b728 en désactivant tous les patchs de
sécurité du CPU

  * `/proc/filesystems` pour lister tous les FS gérer par le kernel
    nativement.
  * `/proc/interrupts` nous permet de voir comment sont gérees les
    interruptions et celles qui sont utilisées. Pour expliquer un petit
    peu le fichier :

??? note "Sample of /proc/interrupts"
	```bash
				   CPU0       CPU1       CPU2       CPU3
		  0:          6          0          0          0  IR-IO-APIC   2-edge      timer
		  1:          0          0          0          9  IR-IO-APIC   1-edge      i8042
		  8:          0          1          0          0  IR-IO-APIC   8-edge      rtc0
		  9:          0          0          0          0  IR-IO-APIC   9-fasteoi   acpi
		 12:          0          0          5          0  IR-IO-APIC  12-edge      i8042
		 16:          0          0          0        453  IR-IO-APIC  16-fasteoi   uhci_hcd:usb2, hpilo
		 20:         29          0          0          0  IR-IO-APIC  20-fasteoi   ehci_hcd:usb3
		 21:          0          0         30          0  IR-IO-APIC  21-fasteoi   ehci_hcd:usb1
		 24:          0          0          0          0  DMAR-MSI   0-edge      dmar0
		 25:  158604567  960976068  268830823  527035126  IR-PCI-MSI 1048576-edge      eno0-rx-0
		 26:  475449447  461628402  354301051  453787807  IR-PCI-MSI 1048577-edge      eno0-tx-0
		 27:      66007      20504      41564      25490  IR-PCI-MSI 1048578-edge      eno0
		 28:   76098051          0          0          0  IR-PCI-MSI 2097152-edge      hpsa0-msix0
		 29:          0   79605111          0          0  IR-PCI-MSI 2097153-edge      hpsa0-msix1
	```

La première colonne correspond à l'IRQ, les CPUs aux différents cores
de notre machine, et la dernière au nom de l'interruption. Il s'agit
ici d'un extrait, le système dispose de bien plus d'IRQ que celles-ci
et sont variables selon vos composant systèmes.

Ici, dans cet exemple, nous pouvons voir que les IRQ 25/26
correspondeant au nombre interruptions depuis le lanchement de notre
machine de notre NIC eno0 en RX/TX sont gérées par les 4 threads de
notre processeur de manière non équitable. Voici un exemple d'un autre
serveur :

               CPU0       CPU1       CPU2       CPU3       CPU4       CPU5       CPU6       CPU7
     25:          0          0        107          0          0          0  350619649          0  IR-PCI-MSI 1048576-edge      eno0-rx-0
     26:          0          0          0         59          0  415375689          0          0  IR-PCI-MSI 1048577-edge      eno0-tx-0

Ici, nous pouvons voir que le RX est uniquement géré par le CPU6 et le
TX par CPU7. Sur des petits débits, ce n'est pas forcément grave, sur
de gros débits, cela peut causer un bottleneck. Il est possible
d'obtenir un résultat un peu plus digeste via la commande dstat. `dstat
-tif --int24 60` nous permet de lister toutes les interruptions système
pour une durée donnée (Ici 60 secondes)

```bash
λ jeremy ~ → dstat -tif --int24 60
----system---- -------------------interrupts------------------ -------------interrupts------------
     time     |  20    21    25    26    27    28    29    30 | LOC   PMI   RES   CAL   TLB   MCP
14-04 22:18:05|   0     0   237   129     0     8     0     0 | 468     0    16   119   108     0
14-04 22:19:05|   0     0   116     6     0     2     0     0 | 414     0     8    11     0     0
14-04 22:20:05|   0     0   119    15     0     1     0     0 | 412     0     9    10     0     0
```

Plus d'informations dans le [man](https://linux.die.net/man/1/dstat) de
la commande.

  * **loadavg** qui nous fournit le load-average que nous connaissons
    tous

```bash
λ jeremy /proc → cat loadavg
0.24 0.10 0.09 1/546 5181
```

Les 3 premières valeurs nous fournissent la charge moyenne du système
pour 1/5/15 minutes dernières minutes. Le 4ème champ contient 2 valeurs
distinctes séparées par un /, la première corresond au nombre de
processus s'exécutant en ce moment et le nombre total de processus.
Enfin la dernière valeur correspond au PID le plus récent du système.

Il est possible d'avoir un load détaillé, pour cela, on s'intéresse au dossier `/proc/pressure`

```bash
λ jeremy ~ → ls /proc/pressure
cpu  io  memory
```

Ici, le format est légèrement différent du fichier `/proc/loadavg`

```bash
λ jeremy ~ → cat /proc/pressure/cpu
some avg10=3.58 avg60=4.12 avg300=3.72 total=603533453516
```

Dans notre exemple, il s'agit du % de process attendant le CPU pendant les 10, 60 et 300 dernières secondes. Il s'agit donc d'une valeur plus intéressante en cas d'un troubleshooting fin qu'un simple load-average


## Hardening de /proc

2 options sont particulièrement intéressantes dans le montage de `/proc`pour renforcer de la sécurité sous Linux : `hidepid` et `gid`

La première permet de cacher les informations des différents PID par certains utilisateurs. Cette option prend 3 valeurs :

  * **hidepid=0** : Tout le monde peut accéder au différents PID. Si aucune valeur n'est explicitement spécifiée, il s'agit de la valeur par défaut
  * **hidepid=1** : Tout le monde peut voir l'arborescence de tous les PID, mais certains fichiers ne seront pas accessible par les autres utilisateurs
  * **hidepid=2** : Personne ne voit les dossier des PID (/proc/[pid]) hormis root. Il s'agit donc de l'option la plus sure.

En combinaison avec `hidepid`, nous avons l'option `gid`. Comme son nom l'indique très simplement, cela permettra aux users qui disposent du GID indiqué de voir tous les PID, malgré un `hidpid=2` spécifié.

Un cas typique est l'utilisation d'un monitoring. Celui-ci aura besoin de voir l'intégralité du système, mais ne doit pas tourner en tant que root.

Imaginons que notre utilisateur `monitoring` appartient au GID 1500 et que notre utilisateur `pierre` dispose d'un GID de 1200.

```
λ jeremy /proc → cat /etc/fstab
proc    /proc        proc        defaults,hidepid=2,gid=1500    0 0
```

Dans ce notre exemple ci-dessus :

  * Comme toujours, notre utilisateur `root` verra tous les PID.
  * Notre utilisateur `monitoring` verra tous les PID, grace à son appartenance au groupe 1500
  * Notre user générique `pierre` ne verra quant à lui que les PID dont il est propriétaire, n'appartenant pas au GID 1500

## /sys
