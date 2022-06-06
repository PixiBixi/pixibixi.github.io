# Installer son NS ainsi que son resolveur DNS via BIND9 
 
## Introduction 
 
Afin de se séparer au maximum des services proposés par différents 
tiers, il est possible d'installer son propre [resolveur 
DNS](http://www.bortzmeyer.org/son-propre-resolveur-dns.html), ainsi que 
de paramétrer son serveur DNS (Ici BIND9) afin d'avoir ses propre 
serveurs autoritaires. 
 
[Ne pas oublier DHCPD pour les DNS (CF Article Bortz)]{.underline} 
 
## Comment fonctionne un NS 
 
Un NS est un enregistrement DNS afin d'avoir son propre autoritaire : 
Prenons l'exemple avec ce nom de domaine : **wiki.jdelgado.fr**. 
 
1.  Tout d'abord, nous allons intérroger les ***root servers***, par 
    exemple *g.root-servers.net* 
2.  Ce serveur nous indique le serveur à contacter, ici, les serveurs 
    autoritaires **du TLD .eu** : *x.dns.eu* 
3.  Ces serveurs nous disent quel serveur autoritaires **du nom de 
    domaine**, dans notre cas, **ns1.jdelgado.fr** 
4.  Et enfin, nous obtenons enfin l'IP du serveur. 
 
Le serveur que nous allons installer correspond à l'étape **3** 
 
## Comment fonctionne un resolveur DNS 
 
Un *Resolveur DNS* agit d'une manière extremement simple : Il va 
simplement résoudre n'importe quel nom de domaine que vous cherchez, et 
retourner son adresse IP. 
 
Un des intérets à avoir son propre resolveur DNS est d'évité le *DNS 
Hijacking*, c'est à dire de modifier la résolution DNS. Exemple 
flagrant avec le nom de domaine **t411.io**. 
 
Un autre intéret à avoir son propre resolveur DNS est d'éviter 
l'espionnage de notre FAI ou autre. 
 
**Si vous voulez tout de même éviter le flicage,** mais que vous n'avez 
les compétences, ou tout simplement l'envie, il existe des projets tel 
que [OpenNIC](https://www.opennicproject.org/) qui vous indique le 
resolveur DNS libre le plus proche de chez vous, pour ainsi minimiser le 
ping, et donc le temps de résolution DNS. Il y a également le projet 
[DNS Watch](https://dns.watch/index) qui est un résolveur libre 
IPV4/IPV6 sans log et qui supporte le DNSSEC. 
 
## Installation 
 
### Résolveur DNS 
 
De base, BIND9 est correctement configuré afin de résoudre les noms de 
domaine sur vos interfaces locales, soit 127.0.0.1, ::1 si vous disposez 
d'IPv6, et enfin, votre IP locale fournie par le DHCP de votre, soit 
192.168.1.2 par exemple. 
 
Nous verrons par la suite comment le configurer. 
 
Afin qu'il résolve les requêtes DNS sur votre ordinateur locale, voici 
la ligne à écrire : 
 
``` 
apt-get -y install bind9 
``` 
 
Pour être certain que votre BIND9 soit bien installé, **dig +short 
google.fr** doit vous renvoyez une IP appartenant à Google. 
 
Dans le dossier de configuration BIND9, vous y retrouverez 4 fichiers de 
configuration : 
 
-   **named.conf** recense tous les fichiers de configuration. Au lieu 
    d'écrire la configuration dans un seul fichier, celle-ci est 
    partagée en plusieurs fichiers. 
-   **named.conf.default-zones** est un fichier contenant toutes les 
    zones par défaut, comme son nom l'indique. 
-   **named.conf.local** est vide par défaut, et c'est normal, il 
    s'agit du fichier où l'on effectuera toutes nos modifications 
-   **named.conf.options** est le configuration de base par défaut, il 
    contient toutes les options nécéssaires pour bien paramétrer notre 
    BIND9 
 
N'oubliez pas d'editer votre **resolv.conf** sous un système UNIX afin 
d'utiliser votre resolveur, ou bien vos paramètres de votre carte 
réseau sous Windows 
 
### Serveur autoritaire 
 
Un serveur autoritaire est un serveur faisant '"autorité'" sur une zone 
donnée. Celui-ci permet de toutes les redirections nécéssaires (MX, A, 
CNAME'...) 
 
Généralement, votre registrar fait également serveur DNS, mais il 
s'agit très souvent d'une usine à gaz, lorsqu'un simple BIND fait 
l'affaire, et est très simple à mettre en oeuvre 
 
Tout d'abord, il vous faudra mettre à jour votre liste de NS sur votre 
registrar, par exemple, pour mon cas : 
 
![](/internetbs_ns_list.jpg){.align-center} 
 
Ici, nous disons à notre registrar que notre serveur autoritaire sera 
**ns1.jdelgado.fr** soit **195.154.226.173** 
 
Repassons désormais à notre BIND9, et regardons les fichiers à éditer 
 
#### named.conf.local 
 
Dans ce fichier, nous allons ajouter la zone à gérer par BIND9. Voici un 
exemple de zone à rajouter au fichier 
 
``` bash 
zone "jdelgado.fr" IN { 
 
        # Zone de type maître 
        type master; 
 
        # Fichier de zone 
        file "/etc/bind/jdelgado.fr/db.jdelgado.fr"; 
 
        # On autorise le transfert de la zone aux serveurs DNS secondaires (Slaves) 
        allow-transfer { 217.70.177.40; 213.186.33.199; 173.245.58.105; 173.245.59.150; 8.8.8.8; 8.8.4.4; }; 
 
        # On autorise tout le monde à envoyer des requêtes vers cette zone 
        allow-query { any; }; 
 
        # Prévenir les serveurs DNS secondaires quun changement a été effectué dans la zone maître 
        notify yes; 
 
}; 
``` 
 
Au final, ce fichier comporte assez peu d'instructions, je vous invite 
à aller regarder les commentaires afin de savoir à quoi correspondent 
chacunes d'entrent-elles 
 
Au final, ce fichier comporte assez peu d'instructions, je vous invite 
à aller regarder les commentaires afin de savoir à quoi correspondent 
chacunes d'entrent-elles 
 
#### named.conf 
 
Nous ajoutons un include dans ce fichier, afin de pouvoir faire des logs 
corrects, au lieu de tout log dans syslog par défaut 
 
``` bash 
include "/etc/bind/named.conf.logging"; 
``` 
 
#### named.conf.logging 
 
Et voici le fichier de logging : 
[named.conf.logging](http://pastebin.com/raw/Xt2KVVL8) 
 
``` bash 
logging { 
    channel security_file { 
        file "/var/log/bind/security.log" versions 3 size 30m; 
        severity dynamic; 
    }; 
 
    channel b_query { 
        file "/var/log/bind/query.log" versions 2 size 10m; 
        severity info; 
    }; 
 
    channel general_file { 
        file "/var/log/bind/general.log" versions 3 size 5m; 
        severity dynamic; 
    }; 
 
    category queries { b_query; }; 
    category general { general_file; }; 
    category security { security_file; }; 
    category lame-servers { null; }; 
}; 
``` 
 
#### named.conf.options 
 
Le fichier de base étant totalement inutile, en voici un plus utile 
 
``` bash 
acl allowQueried { 
    188.166.95.206; 
}; 
 
acl allowRecursion { 
    localhost; 
}; 
``` 
