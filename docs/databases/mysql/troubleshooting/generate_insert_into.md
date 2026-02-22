---
description: Générer des requêtes INSERT INTO depuis une sélection MySQL avec mysqldump pour extraire des lignes filtrées
---

# Générer des INSERT INTO depuis un SELECT

Une commande est vraiment magique avec mysqldump et permet de générer
des INSERT INTO depuis un WHERE assez simple

```bash
mysqldump -t DB Table --where="champ in (280, 172);" > ~/Req.sql
```

Cet SQL dump va simple générer les INSERT INTO selon la condition que
nous lui avons donné, MAGIQUE !
