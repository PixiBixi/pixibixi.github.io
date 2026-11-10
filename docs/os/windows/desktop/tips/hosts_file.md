---
description: Modifier le fichier hosts Windows pour bloquer publicités et services indésirables
tags:
  - Windows
  - DNS
---

# Hosts File

Diverses entrées dans le fichier hosts à mettre pour bloquer des pubs ou
autre

Le fichier est `C:\Windows\System32\drivers\etc\hosts`, on l'édite avec un éditeur lancé en administrateur. Une ligne contient une IP puis un ou plusieurs noms d'hôte, rien d'autre : pas de `http://` ni de chemin, et tout texte libre commence par `#`.

Pour du blocage large et tenu à jour, un DNS filtrant (Pi-hole, AdGuard Home, NextDNS) est plus simple à maintenir qu'une liste figée dans chaque machine.

!!! warning "Domaines Microsoft"
    Une partie des domaines ci-dessous sert à Windows Update, à l'activation et au cloud de Microsoft Defender (`spynet` est l'ancien nom de MAPS) : les bloquer dégrade les mises à jour et la protection. Depuis 2020, Defender signale aussi un hosts qui redirige des domaines Microsoft comme `SettingsModifier:Win32/HostsFileHijack`.

```text
# Bloquage des Serveurs Microsoft

127.0.0.1 localhost
127.0.0.1 genuine.microsoft.com
127.0.0.1 mpa.one.microsoft.com
127.0.0.1 sa.windows.com
127.0.0.1 se.windows.com
127.0.0.1 ie.search.msn.com
127.0.0.1 wustat.windows.com
127.0.0.1 wutrack.windows.com
127.0.0.1 catalog.microsoft.com
127.0.0.1 sls.microsoft.com
127.0.0.1 spynet2.microsoft.com
127.0.0.1 spynettest.microsoft.com
```

```text
0.0.0.0  activate.adobe.com
0.0.0.0  practivate.adobe.com
0.0.0.0  ereg.adobe.com
0.0.0.0  activate.wip3.adobe.com
0.0.0.0  wip3.adobe.com
0.0.0.0  3dns-3.adobe.com
0.0.0.0  3dns-2.adobe.com
0.0.0.0  adobe-dns.adobe.com
0.0.0.0  adobe-dns-2.adobe.com
0.0.0.0  adobe-dns-3.adobe.com
0.0.0.0  ereg.wip3.adobe.com
0.0.0.0  activate-sea.adobe.com
0.0.0.0  wwis-dubc1-vip60.adobe.com
0.0.0.0  activate-sjc0.adobe.com
0.0.0.0  adobe.activate.com
0.0.0.0  adobeereg.com
0.0.0.0  www.adobeereg.com
0.0.0.0  wwis-dubc1-vip60.adobe.com
0.0.0.0  hl2rcv.adobe.com
0.0.0.0  lmlicenses.wip4.adobe.com
0.0.0.0  lm.licenses.adobe.com
0.0.0.0 na1r.services.adobe.com
0.0.0.0 hlrcv.stage.adobe.com
```

```text
0.0.0.0 secure.tune-up.com
0.0.0.0 tune-up.com
```

```text
0.0.0.0 tonec.com
0.0.0.0 www.tonec.com
0.0.0.0 registeridm.com
0.0.0.0 www.registeridm.com
0.0.0.0 secure.registeridm.com
0.0.0.0 internetdownloadmanager.com
0.0.0.0 www.internetdownloadmanager.com
0.0.0.0 secure.internetdownloadmanager.com
0.0.0.0 mirror.internetdownloadmanager.com
0.0.0.0 mirror2.internetdownloadmanager.com
0.0.0.0 mirror3.internetdownloadmanager.com
```

```text
# Bloque des MatchWare (MindView..)
0.0.0.0 activate.matchware.com
0.0.0.0 activate1.matchware.com
0.0.0.0 activate2.matchware.com
```

**Pubs Spotify :**
[Ici](https://github.com/x0uid/SpotifyAdBlock/blob/master/hosts)
