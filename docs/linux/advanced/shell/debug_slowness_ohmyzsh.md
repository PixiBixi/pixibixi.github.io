# Debug ses lenteurs de ohmyzsh

Quelques informations chopées à gauche à droite bien utile

On peut profiler basiquement quel plugin cause les lenteurs, dans le fichier source de ohmyzsh remplacer cette [partie de code](https://github.com/ohmyzsh/ohmyzsh/blob/master/oh-my-zsh.sh#L202-L206) par le code suivant :

```bash
# Load all of the plugins that were defined in ~/.zshrc
for plugin ($plugins); do
  timer=$(($(/opt/homebrew/bin/gdate +%s%N)/1000000))
  if [ -f $ZSH_CUSTOM/plugins/$plugin/$plugin.plugin.zsh ]; then
    source $ZSH_CUSTOM/plugins/$plugin/$plugin.plugin.zsh
  elif [ -f $ZSH/plugins/$plugin/$plugin.plugin.zsh ]; then
    source $ZSH/plugins/$plugin/$plugin.plugin.zsh
  fi
  now=$(($(/opt/homebrew/bin/gdate +%s%N)/1000000))
  elapsed=$(($now-$timer))
  echo $elapsed":" $plugin
done
```

Ce code induit que vous êtes sur mac avec gdate d'installé, sinon, utilisez simplement date. Vous aurez l'output suivant :

```bash
27: ssh-agent
3: terraform
14: zsh-syntax-highlighting
3: timer
4: kubectl
3: kube-ps1
4: helm
3: battery
37: brew
5: aws
```

On peut déjà voir que les 2 plugins les plus lents sont ssh-agent et zsh-syntax-highlighting, mais sans être alarmant.

N'hésitez pas à cleanup régulièrement vos plugins

On peut également faire un profiling beaucoup plus poussé avec du zsh natif

```bash
➜  ~ cat .zshrc
zmodload zsh/zprof
...
votre zshrc classique
...
zprof
```

Via cette méthode, nous aurons réellement un profiling de votre ZSH détaillé

```bash
num  calls                time                       self            name
-----------------------------------------------------------------------------------
 1)    1         642.37   642.37   85.74%    369.76   369.76   49.36%  compinit
 2)  816         138.14     0.17   18.44%    138.14     0.17   18.44%  compdef
 3)    1         107.30   107.30   14.32%    107.30   107.30   14.32%  compdump
 4)    1          29.49    29.49    3.94%     29.49    29.49    3.94%  _add_identities
 5)    2          28.07    14.04    3.75%     28.07    14.04    3.75%  compaudit
 6)   21          34.68     1.65    4.63%     25.59     1.22    3.42%  _omz_source
 7)    1          16.80    16.80    2.24%     16.80    16.80    2.24%  zrecompile
 8)    1           8.76     8.76    1.17%      8.69     8.69    1.16%  _zsh_highlight_load_highlighters
 9)    1           5.59     5.59    0.75%      5.59     5.59    0.75%  (anon) [/Users/jeremy/.oh-my-zsh/tools/check_for_upgrade.sh:157]
10)    1           4.32     4.32    0.58%      4.32     4.32    0.58%  test-ls-args
11)    1           9.85     9.85    1.31%      4.26     4.26    0.57%  handle_update
12)    4           2.37     0.59    0.32%      2.37     0.59    0.32%  is-at-least
13)    1           1.79     1.79    0.24%      1.78     1.78    0.24%  _zsh_highlight__function_callable_p
14)    1           1.50     1.50    0.20%      1.50     1.50    0.20%  _start_agent
15)    3           1.27     0.42    0.17%      1.23     0.41    0.16%  add-zle-hook-widget
16)    1           1.06     1.06    0.14%      1.06     1.06    0.14%  regexp-replace
17)    1           0.89     0.89    0.12%      0.89     0.89    0.12%  colors
18)    9           0.85     0.09    0.11%      0.85     0.09    0.11%  add-zsh-hook
19)    3           0.58     0.19    0.08%      0.58     0.19    0.08%  bashcompinit
20)    1           0.34     0.34    0.05%      0.28     0.28    0.04%  _kube_ps1_init
21)    5           0.43     0.09    0.06%      0.19     0.04    0.03%  complete
22)   19           0.19     0.01    0.03%      0.19     0.01    0.03%  is_plugin
23)    3           0.24     0.08    0.03%      0.09     0.03    0.01%  _build_kubectl_out_alias
24)    3           0.05     0.02    0.01%      0.05     0.02    0.01%  is_theme
25)    1           0.04     0.04    0.01%      0.04     0.04    0.01%  (anon) [/usr/share/zsh/5.9/functions/add-zle-hook-widget:28]
26)    2           0.02     0.01    0.00%      0.02     0.01    0.00%  env_default
27)    1           0.01     0.01    0.00%      0.01     0.01    0.00%  _zsh_highlight__is_function_p
28)    1           0.00     0.00    0.00%      0.00     0.00    0.00%  _zsh_highlight_bind_widgets

-----------------------------------------------------------------------------------
```

* Les colonnes les plus importantes sont le temps passé dans le self, en pourcentage et en temps réel
* Cette stacktrace nous apprend qu'une grande partie du temps est passé dans les calls de compinit, compinit et compdump

Par la suite, nous avons le détail de chaque numéro, par exemple

```bash
 1)    1         642.37   642.37   85.74%    369.76   369.76   49.36%  compinit
       1/2        28.07    28.07    3.75%      0.17     0.17             compaudit [5]
       1/1       107.30   107.30   14.32%    107.30   107.30             compdump [3]
     800/816     137.23     0.17   18.32%    137.23     0.17             compdef [2]

```

* Dans les 369ms de compinit qui prend 49% de zsh, une grande partie est du à compdump

Plus qu'à faire de la speleologie dans vos plugins :)
