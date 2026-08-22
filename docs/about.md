---
description: "Senior Platform Engineer chez Equativ - infra 2,5M req/s, 4500+ serveurs, 30+ clusters Kubernetes. Wiki SRE pratique depuis 2017, 240+ articles."
---

# À propos

Senior Platform Engineer chez [Equativ](https://equativ.com), je gère au quotidien une infrastructure adtech à grande échelle : 2,5M req/s, 4500+ serveurs, 30+ clusters Kubernetes, 50 TB de PostgreSQL.

Ce wiki existe depuis 2017. Au départ c'était des notes perso pour ne pas refaire deux fois la même recherche. Avec le temps ça a grossi - 240+ articles sur Linux, Kubernetes, Cloud, CI/CD, monitoring, réseaux.

Le contenu est orienté pratique : commandes copy-pasteable, configs réelles, gotchas de prod. Du mémo de 10 lignes au tutoriel complet.

## Parcours

- **2022 → aujourd'hui** - Senior Platform Engineer chez [Equativ](https://equativ.com). Infra adtech globale (EU, NA, APAC), Kubernetes multi-cloud, FinOps, observabilité à grande échelle.
- **2020 → 2022** - Web Architect chez Waays
- **2020** - Diplôme d'ingénieur en Réseaux & Télécoms, [CPE Lyon](https://www.cpe.fr/)
- **2017** - DUT Réseaux & Télécoms, IUT Annecy-le-Vieux
- **2017** - Création de ce wiki

## Stack du quotidien

- **Infra** : Linux (Debian/Ubuntu), Terraform, Ansible, HAProxy, Varnish, Teleport
- **Databases** : PostgreSQL (50 TB), MariaDB
- **Kubernetes** : GKE, EKS, on-prem, ArgoCD, Rancher
- **Cloud** : GCP (CloudSQL, GCS), AWS (EC2, RDS, S3, Route53)
- **Observabilité** : Prometheus, Thanos, Grafana, Loki, Tempo, OpenTelemetry
- **Streaming** : Confluent Kafka, KSQL, Schema Registry
- **FinOps** : Reserved Instances, Spot Fleets, rightsizing

## Open source

Les projets du moment :

- [gopen](https://github.com/PixiBixi/gopen) (Go) : ouvre le repo git dans le browser sur
  la branche et le dossier courants. Gère le fichier précis, la ligne ou la plage de lignes,
  le choix du remote, la copie de l'URL sans ouvrir le browser, et parle GitHub, GitLab,
  Bitbucket, Azure DevOps, Gitea, Gogs et CodeCommit.
- [kubectl-klens](https://github.com/PixiBixi/kubectl-klens) (Go) : plugin kubectl
  d'inspection de cluster en lecture seule. Un dispatcher, une vingtaine de raccourcis, les
  formes singulier et pluriel interchangeables. Distribué via un index krew custom.
- [kubearch](https://github.com/PixiBixi/kubearch) (Go) : exporter Prometheus qui remonte
  les architectures supportées par chaque image du cluster, sans pull des layers. Il lit les
  manifest lists depuis le registry. Pratique pour piloter une migration arm64 et repérer les
  images qui bloquent.
- [freshrss-summary](https://github.com/PixiBixi/freshrss-summary) (Python) : score et trie
  les articles FreshRSS non lus par pertinence (SRE, Kubernetes, ArgoCD, Terraform).
  FastAPI, SQLite et un chart Helm pour le déployer.
- [dotfiles](https://github.com/PixiBixi/dotfiles) : config Zsh, Neovim, Wezterm, tmux.

Les anciens, toujours en ligne :

- [nginx-ensite](https://github.com/PixiBixi/nginx-ensite) : équivalent de a2ensite pour nginx.
- [dockerfiles](https://github.com/PixiBixi/dockerfiles) : collection de Dockerfiles custom.
- [Script-Debug-MonDedie](https://github.com/PixiBixi/Script-Debug-MonDedie) : outil de debug
  écrit pour la communauté MonDedie, archivé depuis.

## Certifications

- CCNA 1 & 2 (Cisco)

## Ailleurs

- Portfolio & CV : [jdelgado.fr](https://jdelgado.fr)
- GitHub : [PixiBixi](https://github.com/PixiBixi)
- LinkedIn : [je-delgado](https://fr.linkedin.com/in/je-delgado)

## Contact

[contact+wiki@jdelgado.fr](mailto:contact+wiki@jdelgado.fr)
