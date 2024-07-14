# Golang : Définir automatiquement son GOMEMLIMIT/GOMAXPROCS

Golang est un puissant language de programmation dont il est important de connaitre les subtilités, parmis celles-ci `GOMEMLIMIT` et `GOMAXPROCS`

  * `GOMEMLIMIT` va définir le comportement du Garbage Collector (GC). Plus la limite tend vers GOMEMLIMT, plus le GC va devenir agressif
  * `GOMAXPROCS` va limiter le nombre de CPU maximum sur lequel va s'exécuter notre programme Go

Imaginons le déploiement K8S suivant :

```
kind: Namespace
apiVersion: v1
metadata:
  name: demo
---
apiVersion: v1
kind: Pod
metadata:
  name: go-limits
  namespace: demo
spec:
  containers:
    - name: test-container
      image: docker pull debian:trixie-slim
      resources:
        limits:
          memory: 128Mi
          cpu: "2"
      command:
        - sh
        - '-c'
      args:
        - >-
          while true; do echo -en '\n'; printenv GOMEMLIMIT; printenv GOMAXPROCS
          sleep 10; done;
```

Par défaut, nos variables ne sont pas définies automagiquement. Cependant, comme nous avons définit des limites, le container est donc conscient des limites qui lui sont attribuées, le programme Go sera informé de ces dernières.

Il est cependant utile de bien comprendre ces variables, nous allons donc les attribuer automatiquement en ajoutant des variables d'environnement

```
    env:
    - name: GOMEMLIMIT
      valueFrom:
        resourceFieldRef:
          resource: limits.memory
    - name: GOMAXPROCS
      valueFrom:
        resourceFieldRef:
          resource: limits.cpu
```

Avec ces simples lignes, les variables seront automatiquement remplies. Magique non ? :)

Ces deux variables sont bien entendu indépendantes du déploiement via Kubernetes
