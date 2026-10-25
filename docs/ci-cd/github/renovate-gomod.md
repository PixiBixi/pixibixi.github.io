---
description: "Le manager gomod de Renovate : pourquoi une majeure Go arrive en no-op sans gomodUpdateImportPaths, pourquoi constraintsFiltering strict coupe toutes les mises à jour et pourquoi une règle sur la directive go ne bumpe rien."
tags:
  - GitHub Actions
  - CI/CD
  - Renovate
  - Go
  - Supply chain
---

# Renovate et les modules Go : majeures, contraintes et directive go

Le manager `gomod` a 3 comportements qui ne ressemblent à aucun autre écosystème, et les 3 produisent une PR verte qui ne fait pas ce qu'on croit. Une majeure qui ne migre rien, un filtre sur la directive `go` qui fait disparaître toutes les mises à jour et une `packageRule` sur cette directive qui ne matche jamais. Le point commun : la CI passe, donc rien ne le signale.

## Une majeure Go qui ne migre rien

En Go, une majeure change le chemin d'import en même temps que la version, `module/v13` devient `module/v14`. Renovate le dit lui-même dans la [doc du manager](https://docs.renovatebot.com/modules/manager/gomod/) :

> Major upgrades in Go are different from most other ecosystems, because both the version and module name need to be changed.

Par défaut il ne touche qu'au `go.mod`. Le reste, c'est-à-dire le code, reste sur l'ancienne majeure. Sur un webhook ExternalDNS, la PR de bump du SDK Akamai est passée avec l'intégralité de la CI verte, tests compris, en laissant ça :

```gomod title="go.mod après la PR"
require (
  github.com/akamai/AkamaiOPEN-edgegrid-golang/v13 v13.4.0
  github.com/akamai/AkamaiOPEN-edgegrid-golang/v14 v14.0.0
)
```

Les 2 majeures cohabitent, aucun fichier `.go` n'a bougé et le binaire livré est toujours construit sur la v13. `go mod why` le confirme, et sort en code non nul :

```console
$ go mod why -m github.com/akamai/AkamaiOPEN-edgegrid-golang/v14
# github.com/akamai/AkamaiOPEN-edgegrid-golang/v14
(main module does not need module github.com/akamai/AkamaiOPEN-edgegrid-golang/v14)
```

Les tests passent parce qu'ils compilent le code inchangé, donc la v13. La nouvelle majeure est une dépendance directe morte, et le seul effet réel du merge est d'avoir ajouté un module de plus à l'arbre.

`gomodTidy` était pourtant bien dans la config, et il aurait nettoyé le require mort tout seul. Sur ce `go.mod` exact, un `go mod tidy` nu retire la ligne v14 en une passe :

```console
$ go mod tidy && git diff --stat
 go.mod | 1 -
 go.sum | 1 -
```

S'il ne l'a pas fait, c'est que Renovate l'a délibérément sauté, et la condition est en dur dans le manager :

```ts title="lib/modules/manager/gomod/artifacts.ts"
const mustSkipGoModTidy =
  !config.postUpdateOptions?.includes('gomodUpdateImportPaths') &&
  config.updateType === 'major';
```

Sur une majeure, `go mod tidy` ne tourne donc pas tant que `gomodUpdateImportPaths` est absent, et ce n'est pas un oubli. Le code importe toujours la v13, donc tidy remettrait la v13 et supprimerait la v14, c'est-à-dire qu'il annulerait la PR pour un diff vide. Renovate préfère livrer un `go.mod` incohérent plutôt que rien. Mettre `gomodTidy` dans les `postUpdateOptions` ne change rien à ce cas précis, il ne couvre que les mineures et les patchs.

## Réécrire les imports avec gomodUpdateImportPaths

L'option qui fait la migration est `gomodUpdateImportPaths`, et elle n'est pas dans les défauts :

```json title="renovate.json"
{
  "postUpdateOptions": ["gomodTidy", "gomodUpdateImportPaths"]
}
```

Renovate installe alors [`marwan-at-work/mod`](https://github.com/marwan-at-work/mod) et le passe sur les sources avant d'ouvrir la PR :

```bash
go install github.com/marwan-at-work/mod/cmd/mod@latest
mod upgrade --mod-name=github.com/akamai/AkamaiOPEN-edgegrid-golang/v13 -t=14
```

Les chemins d'import sont réécrits, `go mod tidy` n'est plus sauté, et le `go.mod` qui sort ne contient plus qu'une majeure. La CI compile enfin ce qui serait livré. Garder `gomodTidy` explicite à côté reste utile, il couvre les mineures et les patchs, que cette bascule ne concerne pas.

2 limites à connaître. Le `@latest` de l'installation n'est pas épinglé par défaut, on le fige avec une contrainte `gomodMod` si on ne veut pas d'un outil tiers flottant dans le pipeline. Et la réécriture est sautée sur le passage de v0 à v1, qui ne change pas le chemin d'import, sauf pour les modules `gopkg.in/`.

Ça ne fait pas de miracle pour autant, l'outil réécrit des chemins, pas de la logique :

> it is known and unavoidable that the majority of major Go upgrades won't be immediately mergeable.

La vraie question devient donc « est-ce que les symboles qu'on utilise font partie des ruptures », et la réponse s'obtient sans lire tout le changelog amont. On liste ce que le code touche réellement :

```bash
rg -ohN 'dns\.[A-Za-z0-9_]+' --glob '*.go' internal/ | sort -u
```

Puis on croise avec la liste des breaking changes de la release. Sur la v14 du SDK Akamai, les ruptures portaient sur `GetZoneNames`, `GetZoneNameTypes`, `ListRecordSetTypesRequest.ZoneName`, les `GroupID` qui passent de `int` à `int64` et les paquets Datastream et EdgeWorkers. Aucun symbole en commun avec un provider qui ne fait que lister des zones et manipuler des record sets, donc la migration se réduisait à la réécriture des imports.

Pour les majeures qui, elles, demandent du travail, Renovate recommande de ne pas les laisser arriver toutes seules :

```json title="renovate.json"
{
  "packageRules": [
    {
      "description": "Une majeure Go demande une migration de code, on la déclenche à la demande",
      "matchManagers": ["gomod"],
      "matchUpdateTypes": ["major"],
      "dependencyDashboardApproval": true
    }
  ]
}
```

La PR n'est plus ouverte qu'après avoir coché la case dans le dependency dashboard, ce qui évite d'avoir en permanence une majeure ouverte que personne ne peut merger.

## constraintsFiltering strict : un filtre qui vide la liste

La directive `go` du `go.mod` veut dire « compatible avec cette version ou une plus récente ». Une dépendance qui monte la sienne au-dessus de la nôtre n'est plus utilisable tant qu'on n'a pas bumpé la nôtre, et Renovate la propose quand même par défaut. L'option qui a l'air faite pour ça est `constraintsFiltering: "strict"`, et elle ne fait pas ce que son nom laisse croire.

Le manager convertit d'abord notre directive en plage semver, réduite à la mineure :

```ts title="lib/modules/manager/gomod/extract.ts"
const parts = goDirective.split('.');
return {
  version: `~${parts[0]}.${parts[1]}.x`,
  versioning: 'semver-coerced',
};
```

En mode `strict`, le datasource lit ensuite la directive `go` du `go.mod` de chaque release et ne garde que celles qui tombent dans cette plage. Avec `go 1.27.1`, la plage vaut `~1.27.x`, donc une release qui demande `go 1.26.0` est rejetée alors qu'elle compile très bien en 1.27. Seules passent les releases qui déclarent notre mineure et celles qui n'ont pas de directive du tout, c'est-à-dire presque aucune. Sur kubectl-klens, le log debug d'un dry-run local (`renovate --platform=local --dry-run=lookup`) le montre :

```text title="log debug, extrait"
Filtered out 61 non-matching releases out of 61 total for golang.org/x/net
Filtered out 47 non-matching releases out of 47 total for golang.org/x/term
Filtered out 650 non-matching releases out of 652 total for k8s.io/api
```

Rien n'échoue, aucune issue n'est ouverte et le dependency dashboard liste simplement les modules sans mise à jour. Sur ce dépôt, `golang.org/x/net` est resté 5 semaines en v0.58.0 alors que 3 versions étaient sorties, jusqu'à ce que govulncheck remonte 5 advisories HTTP/2 corrigées en v0.60.0.

Le défaut `none` est donc le bon. Une release qui exige une Go plus récente se voit dans la PR elle-même, parce que le `go.mod` du diff remonte notre directive `go`, et l'automerge n'agit que sur une CI verte. Le contrôle a lieu à la relecture de la PR, ce que le filtre promettait sans le tenir.

L'app Mend, qui tourne en `binarySource=install`, lit la même directive autrement quand elle choisit la Go qui exécute ses commandes : elle prend la dernière `1.x` compatible et lit `go 1.22` comme `^1.22`, pas comme `=1.22`. Pour l'exécution, la directive est un plancher et jamais un pin.

## Directive go et toolchain : 2 comportements opposés

C'est le piège le plus discret, parce que la règle a l'air correcte et que rien ne dit qu'elle ne matche rien :

```json title="renovate.json, la règle inerte"
{
  "description": "Go toolchain updates",
  "matchManagers": ["gomod"],
  "matchDepTypes": ["golang"],
  "groupName": "go-toolchain"
}
```

Le depType `golang`, c'est la directive `go`, et Renovate ne propose **pas** de mise à jour dessus par défaut. Le `groupName` s'applique donc à un flux vide. Le depType `toolchain`, lui, correspond à la directive `toolchain` et se comporte à l'inverse :

> In `go.mod`, the `toolchain` directive essentially means "Use this exact version of go". Unlike the `go` directive, it's valid to keep bumping this, and you should see updates to it proposed by default.

C'est le `rangeStrategy` qui débloque la directive `go`. On liste les 2 depTypes pour grouper la directive et la toolchain dans la même PR :

```json title="renovate.json, la règle qui matche"
{
  "description": "Go toolchain updates",
  "matchManagers": ["gomod"],
  "matchDepTypes": ["golang", "toolchain"],
  "matchDepNames": ["go"],
  "rangeStrategy": "bump",
  "groupName": "go-toolchain"
}
```

Renovate déconseille explicitement de bumper la directive `go` automatiquement, au motif qu'elle définit le plancher de compatibilité du module. Sur une application, où personne n'importe le module, le coût est nul et c'est une ligne de moins à maintenir à la main. Sur une bibliothèque, c'est un vrai arbitrage : chaque bump écarte les consommateurs restés sur une Go plus ancienne, on garde alors le défaut.

Le contrôle qui tranche, c'est l'historique de la directive. Une directive qui n'a jamais bougé depuis le commit initial trahit une règle qui ne matche rien :

```bash
git log --oneline -L3,3:go.mod
```

## Les options qui ne servent pas ici

Les autres `postUpdateOptions` du manager ont chacune un cas d'usage précis, et la plupart supposent un layout qu'un dépôt applicatif n'a pas :

| Option | Quand elle sert | Pourquoi pas ici |
|---|---|---|
| `gomodTidyAll` | Monorepo Go, `replace` locaux à suivre en cascade | Un seul module, aucun `replace` |
| `gomodMassage` | Commente les `replace` avant d'appeler `go` | Idem, et incompatible avec `gomodTidyAll` |
| `gomodVendor` / `gomodSkipVendor` | Dépôts qui committent `vendor/` | Pas de `vendor/` |
| `goGenerate` | Code généré à régénérer après un bump | Réservé au self-hosted |
| `gomodTidy1.17` / `gomodTidyE` | `-compat=1.17`, `-e` pour tolérer les erreurs | Ni l'un ni l'autre demandé |

`goGenerate` mérite sa précision, parce que c'est celle qui coûte le plus de temps avant de comprendre : elle ne tourne que si l'option globale `allowedUnsafeExecutions` contient `goGenerate`. Or les options `self-hosted` ne se mettent pas dans un `renovate.json` de dépôt, Renovate les ignore et peut ouvrir une issue de config par-dessus. Sur l'app Mend, `goGenerate` est donc hors de portée quoi qu'on écrive.

Dernier défaut à connaître, les mises à jour d'**indirects** sont désactivées sauf si des directives `tool` existent. C'est un défaut sain, `go mod tidy` les recalcule depuis les directs, mais il faut savoir que le silence sur une indirect vulnérable vient de là et pas d'un raté de détection.

## Ce qui aurait attrapé le problème

Aucune de ces 3 situations ne produit de CI rouge, donc le garde-fou ne peut pas être un job de lint. Ce sont des contrôles à faire à la lecture de la PR :

| Contrôle | Ce qu'il attrape |
|---|---|
| `go mod why -m <module>/vN` sur une PR de majeure | La majeure ajoutée mais jamais importée |
| Le diff touche-t-il des `.go` sur une majeure | Le même symptôme, en un coup d'œil |
| Un module listé sans mise à jour dans le dependency dashboard alors qu'une version plus récente existe | Un filtre qui vide la liste des releases |
| `git log -L` sur la directive `go` | Une `packageRule` qui ne matche rien depuis toujours |

!!! tip "Aller plus loin"
    La validation de la config elle-même, ce que `renovate-config-validator` attrape et ce qu'il laisse passer, est dans [Valider une config Renovate](renovate-config.md). Le durcissement de la CI qui entoure ces PR, `minimumReleaseAge` et l'automerge, est dans [Durcir une CI GitHub Actions](hardening.md).
