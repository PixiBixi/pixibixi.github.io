---
description: "Migrer un Grafana self-hosted vers Grafana Cloud : garder les UID, remapper les datasources, pousser l'alerting en pause, détecter les rules qui ne sonnent jamais et faire converger 2 instances qui bougent."
tags:
  - Grafana
  - Grafana Cloud
  - Alerting
  - Migration
---

# Migrer Grafana vers Grafana Cloud : datasources, alerting et convergence

Copier des dashboards d'un Grafana à l'autre tient en 2 appels d'API. Ce qui coûte, c'est tout ce qui casse sans la moindre erreur, par exemple un panel vide parce que la datasource ne s'appelle plus pareil ou une alerte verte depuis des mois qui ne peut structurellement pas sonner.

Cet article reprend les pièges rencontrés en migrant un peu plus de 1000 dashboards et environ 250 alert rules, dans l'ordre où ils se présentent. Tout passe par l'API HTTP de Grafana, avec un `plan` en lecture seule avant chaque `apply`. L'outil est publié dans [PixiBixi/scripts](https://github.com/PixiBixi/scripts/tree/main/grafana-cloud-migrate), avec ses tests.

## Garder les UID d'un bout à l'autre

La décision qui simplifie tout le reste est de conserver l'UID de chaque objet : dashboards, folders, alert rules et library panels. Un dashboard se pousse sur `/api/dashboards/db` avec son UID d'origine, `id` à `null` et `overwrite: true`.

```json
{
  "dashboard": {"uid": "abc123", "id": null, "title": "API latency", "panels": []},
  "folderUid": "f1",
  "overwrite": true
}
```

Relancer l'`apply` est idempotent, un dashboard déjà présent est écrasé au lieu d'être dupliqué. Les permaliens `/d/<uid>/...` continuent de marcher. C'est ce qui rend trivial un problème qui ne l'est pas : les annotations des alert rules contiennent des liens en dur vers l'ancienne instance. Comme les UID ne bougent pas, seul l'hôte est faux et une substitution suffit. Sur environ 250 rules, 78 annotations pointaient vers l'ancien Grafana.

Les champs `id` et `version` sont locaux à l'instance, ils partent. Tout le reste se garde.

## Remapper les références de datasource

Un dashboard ne référence pas ses datasources d'une seule façon. L'historique d'une instance de plusieurs années les mélange toutes. Sur un même dashboard on croise :

- l'objet moderne `{"type": "prometheus", "uid": "..."}`
- la **chaîne nue**, héritée d'avant Grafana 8, qui contient le **nom** de la datasource et pas son UID
- `null`, qui suit la datasource par défaut de l'instance, donc celle de la **cible** après migration
- une référence de variable, `$ds`, `${ds}` ou `${ds:raw}`, à laisser intacte
- les datasources intégrées (`grafana`, `-- Mixed --`, `-- Dashboard --`, `__expr__` et `-100` pour les expressions anciennes), qui existent sous le même UID partout

Le parcours doit donc être récursif et se faire par **clé** plutôt que par chemin : les panels d'une row repliée sont dans `panels[].panels[]`, les targets portent leur propre `datasource`, les annotations aussi. Un chemin en dur en oublie toujours un.

La correspondance source vers cible se construit par UID d'abord, puis par nom et type, puis par nom seul. Sur un peu plus de 150 datasources, 103 ont matché par UID parce qu'elles avaient été provisionnées avec le même, 12 par nom et le reste n'avait pas d'équivalent.

### 3 catégories, pas 2

Le réflexe est de bloquer tout dashboard qui référence une datasource introuvable. C'est le premier piège : il faut distinguer 3 cas, qui n'appellent pas la même réponse.

| Cas | Ce qu'on fait |
|---|---|
| La datasource existe sur la source et n'a pas d'équivalent cible | **Bloquer**, c'est une vraie régression |
| La datasource n'existe même plus sur la source | Migrer tel quel, le panel est déjà cassé aujourd'hui |
| La datasource est volontairement abandonnée | Migrer tel quel en le déclarant dans le mapping |

Le deuxième cas surprend par son volume. Sur un échantillon de 120 dashboards, 43 références pointaient vers des datasources supprimées depuis longtemps. Les bloquer aurait gelé la migration sur des dashboards morts, alors qu'ils ne perdent rien à passer.

Le troisième cas relève d'une décision. Une datasource qu'on ne reprend pas sur Cloud existe toujours sur la source. C'est son marquage explicite dans le mapping qui débloque les dashboards qui l'utilisent. Un dashboard qui ne dépend **que** de datasources abandonnées arrive vide, on peut le laisser derrière. Un dashboard qui garde ne serait-ce qu'un panel vivant, ou une variable de datasource, mérite de passer.

!!! warning "Le picker d'une variable de datasource n'est pas une référence"
    Une variable de type `datasource` stocke le type de plugin dans `query` et la dernière valeur sélectionnée dans `current.value`. Cette valeur est l'état du picker, que Grafana repeuple au chargement. La traiter comme une référence bloquante gelait 29 dashboards dont les panels pointaient tous `${ds}`. On la remappe quand c'est possible et on la vide sinon.

## Cloud Monitoring : le projet est dans la requête

Un panel Cloud Monitoring peut renvoyer `403 Permission denied` alors que la datasource a bien migré, avec le bon UID. La raison est qu'une query Cloud Monitoring porte son propre `projectName`, qui l'emporte sur le `default_project` configuré sur la datasource.

Le service account GCP derrière la datasource Cloud doit donc avoir `roles/monitoring.viewer` sur **chaque projet qu'une requête nomme**, pas seulement sur ceux que la datasource déclare. Scanner les dashboards pour lister les `projectName` réellement utilisés donne la bonne liste d'un coup, au lieu de découvrir les 403 un dashboard après l'autre. Sur la migration décrite ici, 23 projets distincts étaient interrogés pour 4 déclarés en `default_project`.

Ajouter ces projets en `default_project` ne corrige rien, c'est la valeur pré-remplie dans l'éditeur et elle n'accorde aucun droit. Attention aussi aux projets templatés : `mon-projet-${env:text}` se résout sur le **libellé** de la variable, donc chaque valeur possible de `env` est un projet à binder, à condition qu'il existe. Une valeur qui ne correspond à aucun projet fait échouer l'apply IAM, on la vérifie avant avec `gcloud projects describe`.

## Ce qui ne passera jamais

Certains panels resteront cassés sur Cloud quoi qu'on fasse. Autant le savoir avant de chercher une erreur de mapping.

- **Les plugins non signés.** Un Grafana on-prem les charge via `allow_loading_unsigned_plugins` dans `grafana.ini`. Grafana Cloud n'installe que les plugins de son catalogue et on n'a pas la main sur `grafana.ini`. Tout dashboard qui en dépend est à réécrire ou à abandonner.
- **Les plugins référencés mais absents de la source.** Un panel de type `natel-plotly-panel` ou `grafana-polystat-panel` dont le plugin n'est plus installé est déjà cassé aujourd'hui, la migration n'y change rien.
- **2 plugins pour le même moteur.** Une instance ancienne peut avoir des datasources ClickHouse sur le plugin communautaire d'Altinity et d'autres sur le plugin officiel. Le plugin Altinity s'installe sur Cloud, mais passer de l'un à l'autre n'est pas un remap d'UID : le modèle de query change, c'est une réécriture des panels.

Lire `grafana.ini` de l'instance source avant de commencer évite des surprises, en particulier les sections `plugins` et `security`.

## Pousser l'alerting sans réveiller personne

Un dashboard est inerte, une alert rule réveille une astreinte. La première règle est donc de pousser **toutes** les rules avec `isPaused: true`, quel que soit leur état sur la source. Le passage en production devient une décision explicite par équipe, unpause côté Cloud et désactivation côté source dans la même minute. Tout décalage entre les 2 donne soit un trou de couverture, soit un double page.

### Pousser par groupe, pour l'intervalle

L'intervalle d'évaluation vit sur le **groupe**, pas sur la rule. Pousser les rules une par une sur `/api/v1/provisioning/alert-rules` les rattache à un groupe créé avec l'intervalle par défaut, sans rien signaler. Les intervalles allaient ici de 60s à 86400s : un groupe évalué une fois par jour serait passé à une évaluation par minute.

On pousse donc le groupe entier en un appel, intervalle compris.

```json
{
  "title": "disk",
  "folderUid": "f1",
  "interval": 300,
  "rules": []
}
```

Cet appel, un `PUT` sur `/api/v1/provisioning/folder/<uid>/rule-groups/<group>`, **remplace** le contenu du groupe. Conséquence directe sur les reruns incrémentaux : on ne peut sauter un groupe que si **toutes** ses rules sont inchangées. En retirer une seule du payload parce qu'elle n'a pas bougé la supprime de la cible.

### L'UID de datasource est stocké 2 fois

Une alert rule porte l'UID de sa datasource dans `data[].datasourceUid` **et** dans la copie `data[].model.datasource.uid`. Réécrire seulement le premier laisse la query pointer sur l'ancienne instance. Le parcours récursif par clé de la section précédente traite les 2 sans y penser, un remplacement ciblé en oublie un.

### Provenance et rules en lecture seule

Tout objet créé par l'API de provisioning est marqué comme provisionné, donc en lecture seule dans l'UI pour tout le monde. L'en-tête `X-Disable-Provenance: true` sur la création l'évite.

Les rules qui portent déjà une `provenance` sur la source viennent d'un pipeline externe. Les copier crée une deuxième source de vérité, on les saute et on redéploie le pipeline vers la cible. Elles résistent d'ailleurs à la suppression : un `DELETE` sur une rule provisionnée échoue même avec `X-Disable-Provenance`.

### Contact points : les secrets ne sortent pas

L'API de provisioning renvoie `[REDACTED]` à la place des webhooks Slack et des clés PagerDuty. Copier les contact points tels quels crée des receivers qui ne notifient rien, sans erreur.

L'export déchiffré existe, il demande la permission `alert.provisioning.secrets:read`. Sur Grafana OSS, faute de rôles fins, elle vient avec le rôle de base Admin. Un compte Editor prend un 403 qui nomme la permission manquante.

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "$GRAFANA_URL/api/v1/provisioning/contact-points/export?decrypt=true"
```

Cette sortie contient des secrets en clair, on la fait transiter en mémoire vers la cible sans jamais l'écrire sur disque.

### L'arbre de notification remplace tout

`PUT /api/v1/provisioning/policies` remplace l'arbre complet en un appel. Sur une stack neuve il n'y a rien à écraser, donc ce n'est pas une raison de le faire à la main, mais 2 garde-fous s'imposent : snapshoter l'arbre de la cible avant d'écrire puis refuser de pousser si un seul receiver référencé, à n'importe quelle profondeur, manque sur la cible. Les templates et mute timings passent avant, l'arbre les référence par nom.

Une rule qui porte `notification_settings.receiver` court-circuite l'arbre et va directement à ce contact point. Il faut donc que les contact points existent avant les rules. Il faut aussi savoir qu'une partie des alertes ne passe pas par les routes qu'on relit.

## Détecter les rules qui ne peuvent pas sonner

Le problème le plus sérieux trouvé pendant la migration existait déjà sur la source. Un groupe entier de rules n'avait rien déclenché en 14 jours alors que l'une d'elles était au-dessus de son seuil 85 % du temps depuis 6 jours. Toutes étaient en `state: inactive` et `health: ok`, donc vertes dans l'UI.

Le point commun est dans le modèle de la query. Les rules qui sonnaient avaient `instant: true`. Celles qui ne sonnaient jamais avaient `range: true, instant: false` et une `condition` qui pointait directement sur la query, sans étage `reduce` ni `threshold`, la comparaison étant écrite dans la PromQL elle-même.

```json
{
  "condition": "A",
  "data": [
    {
      "refId": "A",
      "relativeTimeRange": {"from": 600, "to": 0},
      "model": {"expr": "sum(backend_servers_down) > 3", "range": true, "instant": false}
    }
  ]
}
```

Sur environ 250 rules, 45 n'avaient aucun étage d'expression et 18 avaient en plus `range: true`. Parmi elles, des alertes disque plein à 90 % et l'expiration des certificats kubelet. Elles s'affichaient vertes, ce qui est pire que pas d'alerte du tout puisque personne ne pense à les vérifier.

Les 27 autres sans étage d'expression fonctionnent parce que leur query ne renvoie qu'un point. Rien dans leur définition ne les protège : le jour où quelqu'un bascule leur query en `range`, elles rejoignent les premières.

Le repérage se fait en 2 temps. L'état courant de chaque rule vient de l'API ruler.

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "$GRAFANA_URL/api/prometheus/grafana/api/v1/rules" \
  | jq '.data.groups[].rules[] | {name, state, health}'
```

L'historique des transitions vient de `/api/v1/rules/history?ruleUID=<uid>`, qui renvoie un data frame dont les champs sont `time`, `text`, `prev`, `next` et `data`. Il n'y a pas de champ `current` : un script qui le cherche compte 0 déclenchement sur toutes les rules et conclut à tort que tout va bien. Une rule qui ne passe jamais `next` à `Alerting` alors que sa PromQL rendue à la main est au-dessus du seuil est cassée, quel que soit son `health`.

!!! warning "`repeat_interval` ne protège pas du flapping"
    50 rules avaient un `repeat_interval` de `999w` ou `1000d`, pour notifier une fois et ne jamais relancer. Ça ne couvre que le rappel d'une alerte qui reste active. Chaque cycle resolved puis firing génère une notification neuve, si bien qu'une rule qui flappe a posté une quinzaine de messages en une journée pour un seul incident. Le levier contre le flapping est le `for` ou un `keep_firing_for`, pas le `repeat_interval`.

## Faire converger 2 instances qui bougent

Une migration de cette taille ne se fait pas en une passe. Entre 2 runs, la source continue de vivre : en une seule journée, 9 dashboards créés, 3 déplacés de folder et une centaine d'alert rules supprimées, dont une partie par un collègue qui faisait son propre ménage en parallèle. Un `apply` sur un plan de la veille pousse une organisation périmée sans rien signaler.

### Les déplacements se propagent, les suppressions non

Déplacer un dashboard de folder est une sauvegarde comme une autre, son champ `version` augmente. Un rerun incrémental qui compare les versions le repousse avec son nouveau `folderUid` et Grafana le déplace sur la cible, puisque l'UID est le même.

Pour ces reruns, le champ `version` d'un dashboard n'est pas dans `/api/search`, il faut un `GET` par dashboard. On économise les écritures, pas les lectures. Les alert rules sont plus simples : leur `updated` figure dans la liste renvoyée par l'API de provisioning, rien à récupérer en plus.

Une suppression, elle, ne se propage jamais. Le plan liste ce qui existe sur la source, un dashboard supprimé ne produit aucune ligne et l'`apply` ne le voit pas. Il reste sur Cloud indéfiniment, l'écart grandit à chaque ménage côté source. Au bout de quelques jours, 11 dashboards supprimés du legacy vivaient encore sur la cible.

### Supprimer seulement ce qu'on a poussé

La tentation est de supprimer ce qui est sur la cible et plus sur la source. C'est le bon moyen de détruire les dashboards créés directement sur Grafana Cloud, qui par définition n'existent pas sur la source.

Le bon ensemble part du manifeste de ce que l'outil a lui-même poussé.

```text
à supprimer = (poussés par l'outil) ∩ (présents sur la cible) − (présents sur la source)
```

Un dashboard né sur Cloud n'est dans aucun manifeste, donc invisible pour la commande. L'exclusion vient de la construction de la liste elle-même, il n'y a aucun filtre à oublier. La contrepartie est assumée : un dashboard mort importé à la main sur Cloud reste un ménage manuel.

La commande refuse aussi de tourner si la source liste moins de la moitié du manifeste, parce qu'un `/api/search` tronqué ferait passer tout le reste pour supprimé. Elle sauvegarde chaque dashboard **depuis la cible** avant de le supprimer, la copie source n'existant plus par définition.

### Les doublons sont souvent côté source

Un test d'existence par UID ne voit pas un dashboard de même titre dans le même folder sous un autre UID. Le pousser crée alors 2 dashboards homonymes côte à côte. Indexer la cible par couple folder et titre, en plus de l'UID, les attrape avant l'écriture.

En creusant les 4 cas remontés, aucun n'était un import manuel côté Cloud : la source hébergeait elle-même des paires de dashboards homonymes dans un même folder, par exemple 2 `Tempo / Reads` sous 2 UID différents. Le ménage était à faire sur l'ancienne instance.
