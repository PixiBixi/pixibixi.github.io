---
description: Liens de référence classés par domaine — TLS, sécurité, réseau, web, shell et outils du quotidien
tags:
  - Resources
---

# Liens en vrac

Des ressources externes qui n'ont pas leur place dans un article dédié, mais qu'on ressort régulièrement.

## TLS & certificats

- [crt.sh](https://crt.sh/) — liste tous les certificats émis pour un domaine via les logs de Certificate Transparency
- [Rate limits Let's Encrypt](https://letsencrypt.org/docs/rate-limits/) — à connaître avant de scripter une émission en masse
- [Mozilla Server Side TLS](https://wiki.mozilla.org/Security/Server_Side_TLS) — la référence pour les suites de chiffrement, avec un générateur de config
- [Renouvellement auto Let's Encrypt](https://vincent.composieux.fr/article/install-configure-and-automatically-renew-let-s-encrypt-ssl-certificate) — mise en place de l'autorenew

## Sécurité

- [Mozilla OpenSSH Guidelines](https://wiki.mozilla.org/Security/Guidelines/OpenSSH) — configuration serveur et client durcie
- [HTTP Security Headers](https://blog.appcanary.com/2017/http-security-headers.html) — à quoi sert chaque header, sans le jargon
- [Security Headers](https://securityheaders.io/) — scanner en ligne pour vérifier ses headers
- [CSP Cheat Sheet](https://scotthelme.co.uk/csp-cheat-sheet/) — Content Security Policy, directive par directive
- [Phishing with Unicode Domains](https://www.xudongz.com/blog/2017/idn-phishing/) — les homographes IDN, toujours d'actualité
- [Gitleaks](https://github.com/gitleaks/gitleaks) — détection de secrets commités dans un repo
- [2FA Directory](https://twofactorauth.org/) — quels services supportent le 2FA et sous quelle forme
- [Forcer le changement de password](https://www.it-connect.fr/linux-forcer-le-changement-de-mot-de-passe-des-comptes/) — expiration des comptes sous Linux

## Réseau & DNS

- [OpenNIC](https://www.opennicproject.org/) — résolveurs DNS alternatifs, avec les plus proches géographiquement
- [Pi-hole](https://pi-hole.net/) — résolveur DNS filtrant avec interface web
- [mtr.sh](https://mtr.sh/) — lancer un mtr depuis plusieurs points du globe
- [Talos Intelligence](https://www.talosintelligence.com/) — réputation et blocklist d'IP
- [GNS3 Vault](https://gns3vault.com) — labs réseau prêts à l'emploi pour GNS3

## Web

- [Gixy](https://github.com/yandex/gixy) — analyse statique d'une configuration nginx, trouve les erreurs de sécurité classiques
- [Brotli sur nginx](https://certsimple.com/blog/nginx-brotli) — mise en place de la compression Brotli
- [Test XMLRPC](https://xmlrpc.devzing.com/) — tester des calls RPC, pratique pour ruTorrent ou WordPress

## Linux & shell

- [Bash FAQ (Wooledge)](http://mywiki.wooledge.org/BashFAQ) — la meilleure ressource bash qui existe, de loin
- [htop expliqué](https://codeahoy.com/2017/01/20/hhtop-explained-visually/) — chaque colonne et chaque couleur d'htop, visuellement
- [pkgs.org](https://pkgs.org/) — chercher un paquet dans les dépôts de toutes les distributions
- [whatportis](http://blog.shevarezo.fr/post/2016/06/28/ports-protocoles-services-dans-terminal) — retrouver le port par défaut d'un service depuis le terminal

## Outils & cheatsheets

- [DevHints](https://devhints.io/) — une tonne de cheatsheets en un seul endroit
- [jq play](https://jqplay.org/) — construire et tester une expression jq dans le navigateur
- [VerbalExpressions](https://verbalexpressions.github.io/) — écrire des regex lisibles dans plusieurs langages
- [Langages highlight.js](https://highlightjs.readthedocs.io/en/latest/css-classes-reference.html#language-names-and-aliases) — les alias valides pour colorer un bloc de code
- [Tableau périodique du DevOps](https://xebialabs.com/periodic-table-of-devops-tools/) — panorama de l'outillage
- [SonarQube](https://www.sonarqube.org/features/multi-languages/) — analyse de qualité de code multi-langage
- [Royal TS(X)](https://www.royalapplications.com/ts/osx/features) — client SSH/RDP multi-protocole
- [iTerm2 + Zsh](https://gist.github.com/kevin-smets/8568070) — configuration de référence

## Git & CI

- [Workflows Git](https://medium.com/@OVHUXLabs/la-puissance-des-workflows-git-12e195cafe44) — organisation des branches en entreprise

## Windows

- [GPO Search](https://gpsearch.azurewebsites.net/) — chercher une stratégie de groupe par nom ou par clé de registre

## Virtualisation

- [ESXi Customizer](https://www.v-front.de/p/esxi-customizer-ps.html) — injecter des drivers dans une image ESXi

## Fibre & antennes

- [CartoRadio](https://www.cartoradio.fr/) — carte des installations radioélectriques déclarées à l'ANFR
- [Carte FH LaFibre](https://carte-fh.lafibre.info/index_crozon.php) — carte des faisceaux hertziens
