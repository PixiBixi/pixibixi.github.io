# Améliorer la vitesse de connexion à votre serveur SSH

Dans la vie d'un sysadmin, nous devons nous connecter des dizaines de
fois par jour à différents serveurs SSH, parfois situés à l'autre bout
de la planète et ainsi entrainant une latence assez importance. Pour
rappel, SSH est un protocole basé sur TCP et ainsi initie donc sa
connexion via un 3 Way Handshake. Imaginons un serveur situé à Paris
alors que nous sommes en Colombie. Un simple établissement de session
TCP entraine donc une latence supplémentaire d'1 seconde lors de
**chaque** connexion au serveur.

Heureusement, les développeurs du client SSH ont pensés à tout et ont
développés un multiplexer SSH. Ainsi, lorsque cette option est activée,
la session TCP reste initialisée et ainsi nous pouvons la réutiliser, ce
qui introduit un gain de temps considérable.

## Configuration

La configuration se fait d'une manière simpliste dans votre fichier de
configuration ssh côté client

```bash
λ MacBook-Pro-de-Delgado ~ → cat ~/.ssh/config
Host *
    ControlMaster auto
    ControlPath ~/.ssh/private/master-%r@%h:%p.socket
    ControlPersist 10m
```

Nous appliquons la valeur auto à ControlMaster car il s'agit de
l'option la plus logique à utiliser. Celle-ci essaie d'utiliser une
connexion maitre déjà existante, si celle-ci n'existe pas, alors elle
sera créée. Le ControlPath est définit dans un dossier propre à notre
utilisateur et ne doit **surtout** pas être accessible par tous. %r sera
remplacé par l'username, %h par l'host et %p par le port utilisé.
Enfin, nous indiquons à notre client que nous souhaitons utiliser notre
socket pour une durée de 10 minutes.

Le dossier private n'existe pas, n'oubliez pas de le créer de lui
donner les droits adéquates.

Evidemment, des explications plus détaillées sont disponibles dans le
[https://linux.die.net/man/5/ssh_config](man de ssh_config)

## Benchmark

Benchmark effectué dans un train avec une connexion mitigée.

```bash
λ MacBook-Pro-de-Delgado ~ → time ssh backup.x.y.tld ls
ssh backup.x.y.tld ls  0,03s user 0,02s system 2% cpu 2,149 total
λ MacBook-Pro-de-Delgado ~ → time ssh backup.x.y.tld ls
ssh backup.x.y.tld ls  0,00s user 0,01s system 4% cpu 0,284 total
```

Lors de la première connexion, la session TCP n'était pas initialisée,
ainsi, la commande ls a durée 2,1s. Lors du second lancement, la session
TCP était initialisée et a donc été réutilisée. Notre commande a durée à
peine 0,2s soit un gain de 1000%. Le gain peut vous sembler dérisoire,
cependant, multilplié sur une journée ainsi que 200j/an, il s'avère
considérable.

## Précautions

Attention, même si l'option ControlMaster du client SSH semble magique,
celle-ci à quelques limitations. Par exemple, si nous souhaitons passer
une large quantité de donnée via un rsync ou un scp, il se peut que
celles-ci fail, il s'agit d'un point à ne pas négliger. Il est
possible de désactiver l'utilisation de ControlMaster en le passant à
none ponctuellement.

## Troubleshooting

Pour être sûr qu'un socket est ouvert, nous pouvons utiliser la control
command (-O dans ssh) **check**.

```bash
ssh -O check backup.x.y.tld ls
Control socket connect(/Users/jeremy/.ssh/private/master-y-jd@backup.x.y.tld:6666): No such file or directory
```

Ici, nous voyons que le socket n'est pas créé. Si vous êtes sûr que le
dossier existe et dispose de bons droits, alors vous pouvez initialiser
la connexion à la main :

```bash
ssh -M -S /Users/jeremy/.ssh/private/master-y-jd@backup.x.y.tld:6666 backup.x.y.tld
```

Désormais, si vous refaites notre commande de check, vous devrez
utiliser le socket :

```bash
ssh -O check backup.x.y.tld
Master running (pid=87060)
```

Si pour une quelconque raisons vous souhaitez arrêter le master, vous
pouvez le faire avec la control command **stop**

```bash
ssh -O stop backup.x.y.tld ls
Stop listening request sent.
```
