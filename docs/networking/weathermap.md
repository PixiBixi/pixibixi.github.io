![](/franceix-weathermap.png){.align-center}

## Vérifié l'état du réseau avec la Weathermap

Cet article aura pour but d'aider a vérifié l'état/encombrement du
réseau via les différentes Weathermap disponibles

## Qu'est ce qu'une Weathermap ?

Une Weathermap (Traduction littérale : Carte du temps) est une carte qui
permet de vérifié l'État du réseau d'un hébergeur, afin de savoir si
nous allons disposer de bonnes conditions de navigation. Bon nombre de
Weathermap sont publics, mais il en existe quelques une publiques car
les weathermap montrent le réseau Internet d'une entreprise
(Evidemment, certains équipements peuvent être cachés)

## Liste des Weathermap disponibles

|  Service               |  Lien
|----------|:-------------:|
|  IELO| [Ici](http://weathermap.ielo.net/) |
|  OVH| [Ici](http://weathermap.ovh.net/) |
|  Online/Scaleway| [Ici](http://netmap.scaleway.com/) |
| France-IX | [Ici](https://tools.franceix.net/) |
|  K-Net | [Ici](https://as24904.kwaoo.net/) et [Ici](https://k-net-stats.lafibre.info/)
| Renater      |   [Ici IPv4](http://pasillo.renater.fr/weathermap/weathermap_metropole.html), [ici IPv6](https://pasillo.renater.fr/weathermap/weathermap_metropole_ipv6.html) et [Ici](https://pasillo.renater.fr/weathermap/weathermap_idf.html)
|  Nerim| [Ici](http://stats.nerim.net/nav/map) |
|  WideVOIP - WhichWAN | [Ici](http://www.as42456.com/fr/weathermap) |
|  Hivane Network | [Ici](http://www.hivane.net/info/weathermap.html)
|  Hosteur| [Ici](http://www.hosteur.com/infos/infrastructures-reseaux.php)
|  Newsoo **RIP**| [Ici](https://newsoo.fr/cacti/weathermap.png)
|  France-IX| [Ici](https://tools.franceix.net/stats/aggregated)
|  Rezopole| [Ici](https://noc.rezopole.net/) |
|  Sfinx  | [Ici](https://www.sfinx.fr/) |
|  AMS-IX| [Ici](https://ams-ix.net/technical/statistics)
|  DEC-IX| [Ici](https://www.de-cix.net/about/statistics/)
|  Linx| [Ici](https://www.linx.net/pubtools/trafficstatshtml)

## Connaitre son réseau

Pour savoir par quels routeurs passe sa connexion, il suffit de faire un
**traceroute** avec l'outil **mtr** sous Linux ou bien
**[WinMTR](http://winmtr.net/)** sous Windows. Voici des informations
qui nous intéressent :

![](/mtr.png){.align-center}

Ce screen provient du logiciel **WinMTR**.

On peut voir ici que nous passons par un réseau HOPUS pour joindre le
réseau d'Online, puis que nous passons par le routeur s45-s103-1 pour
accéder à notre serveur.

## Diagnostiquer

A notre niveau, nous ne pouvons pas vraiment diagnostiquer ce qui se
passe chez notre ISP. Cependant, grace à un outil appelé Looking Glass,
on peut cependant faire des diagnostics plus poussés.

**[Liste complète](http://www.bgplookingglass.com/)**

**[Traceroute depuis différents pays + RS...](http://www.traceroute.org/)**

|  Opérateur(s)               |  Lien
|----------|:-------------:|
|  3T Systmes                  | [ici](http://lg.3tsystems.net/cgi-bin/bgplg) |
|  Adeli                       | [ici](https://lg.adeli.biz/) |
|  Bell MTS                    | [ici](http://lg.mtsdatacentres.com/cgi-bin/bgplg) |
|  Blizzard                    | [ici](http://us-looking-glass.battle.net/) |
|  Bussola                     | [ici](http://bussola.as21034.net/) |
|  ClearFly                    | [ici](https://lg.clearfly.net/cgi-bin/bgplg/) |
|  Cogent                      | [ici](http://cogentco.com/fr/network/looking-glass) |
|  Colt                        | [Ici](https://portal.colt.net/lg/private/lookingGlassExec.do) |
|  Core Backbone               | [ici](http://lg.core-backbone.com/) |
|  DataUtama                   | [ici](http://lg.datautama.net.id/cgi-bin) |
|  Deutsche Telekom            | [ici](https://f-lga1.f.de.net.dtag.de/index.php) |
|  Feral                       | [ici](https://network.feral.io/looking-glass) |
|  HE                          | [ici](https://lg.he.net/) |
|  HKIX                        | [ici](https://www.hkix.net/hkix/hkixlg.htm) |
|  Hafey                       | [ici](http://www.hafey.org/cgi-bin/bgplg) |
|  Hivane                      | [ici](https://lg.hivane.net/) |
|  Hopus                       | [Ici](http://lg.hopus.net/) |
|  Ikoula                      | [ici](http://lg.ikoula.com/) |
|  IndoCyber                   | [ici](http://bgplg.indocyber.net.id/) |
|  IpTel                       | [ici](https://lg.iptel.by/cgi-bin/bgplg) |
|  K-Net                       | [ici](https://lg.kwaoo.net/) |
|  LES                         | [ici](http://lg.les.net/cgi-bin/bgplg) |
|  Level3                      | [Ici](http://lookingglass.level3.net/) |
|  Lux Network                 | [ici](https://lg.luxnetwork.eu/) |
|  Milkywan                    | [ici](https://lg.milkywan.fr/) |
|  NLNOG                       | [ici](http://lg.ring.nlnog.net/) |
|  NTT                         | [ici](https://www.us.ntt.net/support/looking-glass/) |
|  Neide Telecom               | [ici](http://lg.neidetelecom.com/) |
|  OVH                         | [Ici](https://lg.ovh.net/) |
|  OpenTransit/Orange          | [Ici](https://looking-glass.opentransit.net/) |
|  RamNode                     | [Ici](http://lg.nl.ramnode.com/) |
|  Retn                        | [ici](http://lg.retn.net/) |
|  Root SA                     | [ici](http://lg.root.lu/) |
|  SFMIX                       | [ici](http://lg.sfmix.org/cgi-bin) |
|  SFR (Altice)                | [ici](http://peering.sfr.net/index.php?task=lg) |
|  Serverius                   | [ici](http://lg.serverius.net/) |
|  Silicon Valley Web Hosting  | [ici](http://lg.sjc02.svwh.net/cgi-bin/bgplg) |
|  Solnet                      | [ici](http://lg.solnet.ch/) |
|  Sprint                      | [ici](https://www.sprint.net/lg/lg_start.php) |
|  Syringa Network             | [ici](http://lg.syringanetworks.net/cgi-bin/bgplg) |
|  TW Telecom                  | [ici](http://lglass.twtelecom.net/) |
|  Tata                        | [Ici](http://lg.as6453.net/lg/) |
|  Telefonica                  | [ici](https://www.business-solutions.telefonica.com/fr/looking-glass/) |
|  TelekomRS                   | [ici](http://lg.telekom.rs/cgi-bin) |
|  Telia                       | [ici](http://lg.telia.net/) |
|  Trit                        | [ici](http://lg.trit.net/cgi-bin/bgplg) |
|  Vienna IX                   | [ici](https://www.vix.at/vix_lookingglass.html) |
|  WorldStream                 | [ici](/lg.worldstream.nl) |
|  Zayo                        | [Ici](http://lg.as8218.eu/) |

Il est également possible de se renseigner via les route-servers
(Disponible via telnet)

|  Opérateur(s) |  Lien |
|----------|:-------------:|
|  OTI     |      telnet route-server.opentransit.net |
|  HE      |      telnet route-server.he.net |
