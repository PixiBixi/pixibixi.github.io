---
description: "Énumérer les sous-domaines d'un domaine avec subfinder : sources passives, clés d'API, filtrage des wildcards DNS et sortie JSON."
tags:
  - Security
  - DNS
  - OSINT
tested_with:
  - "subfinder 2.17.0"
---

# subfinder : énumérer les sous-domaines d'un domaine

Retrouver tous les sous-domaines exposés d'un domaine, c'est la galère : la zone DNS ne se liste pas, les vieux enregistrements oubliés traînent pendant des années et chaque certificat émis les a déjà rendus publics. [subfinder](https://github.com/projectdiscovery/subfinder) de ProjectDiscovery interroge une cinquantaine de sources passives (Certificate Transparency, archives web, bases DNS passives...) et sort une liste dédoublonnée sans envoyer un seul paquet vers la cible.

Le script [crt.sh](issued_crt.md) se limite à Certificate Transparency, subfinder en fait une source parmi d'autres.

## Installer

Le binaire est en Go, on l'installe avec `go install` ou via Homebrew :

```bash
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
# ou
brew install subfinder
```

## Lancer une énumération

Le cas de base tient en une ligne, `-silent` ne garde que les sous-domaines sur stdout (pas de bannière ni de logs) :

```console
$ subfinder -d jdelgado.fr -silent
mealie.jdelgado.fr
wallabag.jdelgado.fr
monitoring.jdelgado.fr
cloud.hzn.jdelgado.fr
autodiscover.jdelgado.fr
...
```

Les options utiles au quotidien :

- **`-dL domains.txt`** : une liste de domaines, avec `-oD <dir>` pour un fichier de sortie par domaine
- **`-o out.txt`** : écrit le résultat dans un fichier
- **`-oJ`** : sortie JSONL à passer à `jq`, avec `-cs` pour savoir quelle source a remonté chaque sous-domaine
- **`-s crtsh,certspotter`** / **`-es alienvault`** : choisir ou exclure des sources
- **`-all`** : interroge toutes les sources au lieu du jeu par défaut, plus complet mais plus lent
- **`-recursive`** : ne garde que les sources capables de remonter des sous-sous-domaines
- **`-m`** / **`-f`** : garde ou retire des sous-domaines (liste ou fichier), avec `-match-regex` / `-filter-regex` en version regex
- **`-rl 10`** : plafonne le nombre de requêtes HTTP par seconde, toutes sources confondues

La liste des sources s'affiche avec `-ls` :

```console
$ subfinder -ls
[INF] Current list of available sources. [54]
[INF] Sources marked with an * require key(s) or token(s) to work.
[INF] Sources marked with a ~ optionally support key(s) for better results.
...
```

## Ajouter des clés d'API

Une bonne partie des sources (Shodan, Censys, SecurityTrails, Chaos, GitHub...) ne fonctionne qu'avec une clé, sans elle subfinder ne les interroge pas. Les clés vont dans `provider-config.yaml`, créé au premier lancement dans `~/.config/subfinder/` sous Linux et `~/Library/Application Support/subfinder/` sous macOS. Chaque source prend une liste de clés :

```yaml title="provider-config.yaml"
shodan:
  - <shodan_api_key>
securitytrails:
  - <securitytrails_api_key>
github:
  - <github_token_1>
  - <github_token_2>
```

Avec plusieurs clés pour une même source, subfinder en tire une au hasard pour chaque domaine énuméré (la source GitHub les fait tourner en round robin). Les quotas s'étalent ainsi sur toutes les clés. On pointe vers un autre fichier avec `-pc` ou la variable `SUBFINDER_PROVIDER_CONFIG`.

## Ne garder que ce qui résout

Une source passive remonte aussi tout ce qui a existé un jour : des sous-domaines supprimés depuis des années ressortent tant qu'un certificat ou une archive les mentionne. `-active` (alias `-nW`) résout chaque résultat et ne garde que ceux qui répondent, `-oI` ajoute l'IP et la source :

```console
$ subfinder -d jdelgado.fr -silent -active -oI
wiki.jdelgado.fr,185.199.109.153,crtname
tickler.jdelgado.fr,185.199.111.153,scanmalware
rules.jdelgado.fr,185.199.111.153,shodanct
```

Le piège de `-active`, c'est qu'il **retire aussi les wildcards DNS**. Avant de résoudre, subfinder interroge 3 sous-domaines aléatoires du domaine et note les IP qui répondent. Tout résultat qui résout vers l'une de ces IP est écarté comme faux positif. Sur un domaine avec un `*.jdelgado.fr` qui pointe vers le serveur, tous les vrais services hébergés dessus disparaissent : il ne reste que 3 sous-domaines sur 54, ceux qui pointent ailleurs (GitHub Pages ici). Sur ce genre de domaine, on garde la sortie passive et on résout à part.

!!! warning "Passif ne veut pas dire anodin"
    subfinder ne touche pas la cible (hors `-active`, qui ne fait que du DNS), mais une énumération reste de la reconnaissance : sur un domaine qui n'est pas le sien, on le fait dans le cadre d'un pentest ou d'un bug bounty autorisé.
