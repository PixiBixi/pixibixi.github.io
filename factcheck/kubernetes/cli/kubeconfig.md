---
article: docs/kubernetes/cli/kubeconfig.md
checked: '2026-11-10'
commit: a1769050978c531384d756fe02441b74ead6f8ec
sources: []
unpinned: 4
---

# docs/kubernetes/cli/kubeconfig.md

## Findings

- L36 ERROR corrigé : boucle `for` + `IFS=$\n` remplacée par `while IFS= read -r -d ''` sur `find ... -print0`, avec `\( -name "*.yml" -o -name "*.yaml" \)` et pas de `:` final quand KUBECONFIG est vide. Preuve : test bash 5, l'ancien script coupe les chemins sur chaque `n` (`[/private/tmp/claude-503/-Users-jeremy-Docume]`...) ; le nouveau sort bien `sub dir/dev cluster.yml`, `prod.yml`, `staging.yaml`, `config` en bash et en zsh, ignore un dossier nommé `fake.yaml` et un `.txt`.
- L51 ERROR corrigé : lien vers `config/.kube/switch-config.yaml`. Preuve : clone dotfiles origin/master, `git ls-tree` : seul `config/.kube/switch-config.yaml` existe.
- L44 IMPRECISE corrigé : `.yml` ou `.yaml`, sous-dossiers compris, plus un paragraphe sur l'ordre (premier fichier gagne pour contexts/clusters/users et `current-context`). Preuve : test kubectl v1.37.1 client, `KUBECONFIG=a.yaml:b.yaml` -> current-context `a`, cluster en conflit -> `https://a` ; inversé -> `b`.
- L53 IMPRECISE corrigé : phrase fausse remplacée par "sans switch-config.yaml, kubeswitch ne lit que ~/.kube/config" et un exemple de store `filesystem` pour `~/.kube/kubeconfig/`. Preuve : le switch-config.yaml des dotfiles n'a que des stores azure/rancher/eks/gke ; kubeswitch `docs/kubeconfig_stores.md` @origin/master L4 et l'exemple filesystem L37-46.

## En plus

- `[ ! -d $ADD_KUBECONFIG_FILES ]` non quoté : quoté.

## Modernisation

- Aucune suggestion.

## Tests

- bash 5 et zsh locaux sur une arbo factice dans le scratchpad ; kubectl v1.37.1 (client seul).

## À signaler

- Le switch-config.yaml des dotfiles contient des valeurs d'exemple (`subscriptionID: xxxx`, token Rancher factice) : le lien "mon fichier de configuration" pointe vers un exemple, pas une vraie config. À l'auteur de voir.
- Coquille non touchée L57 : "Par exemplep".
