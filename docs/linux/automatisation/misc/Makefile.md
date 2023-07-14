# Makefile : à quoi ça sert ?

## Bonus

### Générer une documentation automatique pour son Makefile

Avec un peu de malice, rien de plus simple :

```Makefile
.DEFAULT_GOAL := help

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
```

Pour vous décripter ce que fait cette ligne automagique, tout d'abord, nous allons appliquer un grep sur les lignes commencant par une (ou plusieurs) lettre(s) suivi d'un `:`. Nous allons prendre tout le contenu qui suit les signes `##`. Une fois cela fait, nous allons le strier, puis appliquer un filtre pour les afficher de manière élégante.

Tout ceci pour nous donner le résultat suivant :

![Makefile](./_screens/make_help_example.png)
