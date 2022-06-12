# Deplacer un processus dans un tmux

Il peut être utile de déplacer un processus dans un tmux pour une
opération qui peut être plus longue que prévue. Techniquement, c'est
plutôt simple. **nelhage** a écrit un super outil permettant de
rattacher un processus a un nouveau TTY,
[reptyr](https://github.com/nelhage/reptyr)

Premièrement, il faut passer un processus en background. Une fois que
c'est effectué, il faut dissocier le processus du TTY.

``` bash
└─$ jobs -l
[1]+ 25644 Signal darrêt         php
└─$ disown 25644
-bash: avertissement :suppression de la tâche stoppée 1 avec le groupe de processus 25644
└─$ jobs -l


```

Une fois que c'est OK, on ouvre un tmux, et on attach le processus au
nouveau TTY avec reptyr

``` bash
└─$ reptyr 25644
```

Et voilà, on a désormais le processus dans un tmux !
