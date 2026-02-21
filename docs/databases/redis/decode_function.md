# Decoder une fonction redis

Redis peut intégrer des fonctions LUA.

Pour les décoder, un petit truc tout simple :

```bash
FUNCTION LIST WITHCODE
```

L'argument `WITHCODE` va intégrer le code source de la fonction, pratique non?
