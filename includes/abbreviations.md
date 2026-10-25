<!-- markdownlint-disable-file MD041 -->
*[autodiscover]: Mode où Renovate traite tous les repos auxquels il a accès, au lieu d'une liste explicite
*[bump]: Incrément du numéro de version (patch, minor ou major) déduit des commits depuis le dernier tag
*[CGO]: Mécanisme qui permet à du code Go d'appeler du C, au prix d'une dépendance à la libc et d'un binaire non statique
*[CVE]: Common Vulnerabilities and Exposures, l'identifiant public d'une vulnérabilité connue
*[dependency dashboard]: Issue que Renovate tient à jour dans le repo, avec les mises à jour en attente et des cases pour les déclencher
*[distroless]: Image de conteneur sans shell ni gestionnaire de paquets, qui ne contient que ce dont le binaire a besoin
*[DWARF]: Format des informations de debug (types, variables, lignes source) que lisent delve et gdb
*[eBPF]: Programmes chargés dans le kernel Linux et exécutés sur des événements (paquet réseau, appel système), sans module ni recompilation
*[ECDSA]: Signature sur courbes elliptiques, des handshakes TLS bien moins coûteux que RSA
*[fan-out]: Une requête envoyée en parallèle à plusieurs backends, dont on attend toutes les réponses avant de répondre
*[IRQ]: Interruption matérielle envoyée par une carte réseau ou un disque au CPU
*[keyless]: Signature sans clé privée à gérer, avec un certificat éphémère délivré pour une identité OIDC
*[lockfile]: Fichier qui fige la version exacte de chaque dépendance installée, comme go.sum ou package-lock.json
*[LRU]: Least Recently Used, on évicte d'abord l'entrée lue le moins récemment
*[MTU]: Maximum Transmission Unit, la taille maximale d'un paquet sur le lien
*[NUMA]: Non-Uniform Memory Access, une machine multi-socket où la latence mémoire dépend du CPU
*[OCI]: Open Container Initiative, le standard des images et des registries de conteneurs
*[OCSP]: Online Certificate Status Protocol, la vérification de révocation d'un certificat
*[OIDC]: OpenID Connect, le protocole qui délivre un token d'identité signé, ici celui du run GitHub Actions
*[PDB]: PodDisruptionBudget, le nombre de pods qu'une éviction volontaire peut retirer à la fois
*[Release PR]: PR que release-please maintient ouverte, qui accumule les changements et publie la release à son merge
*[RSA]: Algorithme de signature historique des certificats TLS, plus coûteux en CPU qu'ECDSA à chaque handshake
*[RTT]: Round-Trip Time, le temps d'un aller-retour réseau
*[SBOM]: Software Bill of Materials, l'inventaire des dépendances embarquées dans un artefact
*[semver]: Semantic Versioning, une version MAJOR.MINOR.PATCH où chaque position indique la nature du changement
*[skew]: Écart entre le nombre de pods d'un domaine et celui du domaine le moins chargé, borné par maxSkew
*[SLSA]: Supply-chain Levels for Software Artifacts, le framework qui décrit la provenance d'un build
*[TSDB]: Time Series Database, une base de séries temporelles, comme le stockage local de Prometheus
*[TTFB]: Time To First Byte, le délai avant de recevoir le premier octet de la réponse
*[TTL]: Time To Live, la durée de vie d'une entrée avant son expiration
*[ULID]: Identifiant unique triable par date, qui nomme chaque block Thanos
*[UPX]: Ultimate Packer for eXecutables, qui compresse un binaire et le décompresse en mémoire à chaque lancement
*[WAL]: Write-Ahead Log, le journal qu'une base écrit avant d'appliquer une modification et rejoue au redémarrage
