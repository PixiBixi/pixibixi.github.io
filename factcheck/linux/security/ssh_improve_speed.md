---
article: docs/linux/security/ssh_improve_speed.md
checked: '2026-11-11'
commit: 3e0ed43608dc4d94f6385be37412a12594b04c74
sources: []
unpinned: 9
---

# docs/linux/security/ssh_improve_speed.md

## Findings

- L14 ERROR corrigé : le 3 Way Handshake coûte 1 aller-retour ; le texte dit maintenant qu'une connexion SSH enchaîne handshake, version, kex, auth, canal (une demi-douzaine d'allers-retours), d'où environ 1 s à ~200 ms de RTT. Preuve : ordre de grandeur réseau, non mesuré sur un vrai lien Paris-Colombie (le "demi-douzaine" est une estimation, pas une mesure).
- L100 ERROR corrigé (nuancé) : arrêt via `-O exit` ; `-O stop` décrit comme arrêt doux. Le finding disait "le master continue à tourner" : vrai seulement tant qu'il reste des sessions. Preuve : ssh.1 @V_10_6_P2 L502-505 ; test local : après `stop` avec une session active, le process devient `ssh: [stopped mux]`, socket supprimé, la session se termine normalement puis le master sort ; sans session active il sort aussitôt ; `-O exit` répond `Exit request sent.` et `-O check` échoue ensuite.
- L49 OUTDATED corrigé : lien man vers <https://man.openbsd.org/ssh_config>. Preuve : URL du finding (non relue).
- L19 IMPRECISE corrigé : ce qui est réutilisé est la connexion SSH (TCP, kex, auth), les nouvelles sessions sont des canaux via le socket unix. Preuve : ssh_config.5 @V_10_6_P2 L700.
- L32 IMPRECISE corrigé : config d'origine gardée (les sorties du troubleshooting en dépendent), ajout de la limite de chemin et de l'alternative `ControlPath ~/.ssh/private/%C`. Preuve : test local, ssh refuse avec `ControlPath too long ('...' >= 104 bytes)` ; `sun_path[104]` dans le SDK macOS `sys/un.h` ; `%C` = "Hash of %l%h%p%r%j" (ssh_config.5 @V_10_6_P2 L2348), présent dès V_6_7_P1, absent de V_6_6_P1.
- L42 IMPRECISE corrigé : `ControlPersist 10m` = délai d'inactivité après la dernière session. Preuve : ssh_config.5 @V_10_6_P2 (section ControlPersist, "after it has remained idle (with no client connections)").
- L64 IMPRECISE corrigé : 0,28 s et "environ 7,5x plus rapide" au lieu de 0,2 s / 1000 %. Preuve : 2,149 / 0,284 = 7,57, chiffres du benchmark de l'article.
- L72 IMPRECISE corrigé : warning réécrit (une seule connexion TCP partagée, un gros transfert ralentit les autres, le master tombe = tout tombe), plus d'affirmation "peuvent échouer". Preuve : ssh_config.5 L700 (sessions partagées sur une seule connexion) ; pas de source trouvée pour l'échec des gros transferts.
- L80 IMPRECISE corrigé : le socket absent avant la première connexion est normal avec `ControlMaster auto`, le `-M -S` manuel n'est gardé que pour le cas où il n'apparaît pas après connexion. Preuve : test local, `-O check` avant connexion renvoie `Control socket connect(...): No such file or directory` rc=255, puis `Master running` après un premier `ssh t true`.

## En plus

- L72 : `ControlMaster none` n'est pas une valeur valide (`ssh -G -o ControlMaster=none` renvoie `unsupported option "none"`, OpenSSH 10.6p1). Remplacé par `-S none` / `ControlPath=none` (ssh.1 @V_10_6_P2 L654-656 : "none to disable connection sharing").
- Ajout du `mkdir -m 700 -p ~/.ssh/private` à la place de "n'oubliez pas de le créer".
- Description du front matter : "réutilisant une connexion déjà établie" au lieu de "sessions TCP".
- Un espace insécable (U+00A0) dans "une latence" retiré.

## Modernisation

- `%C` : appliqué comme alternative (pas remplacé dans la config principale pour garder les sorties réelles du troubleshooting).
- `-O exit` : appliqué.
- Lien man.openbsd.org : appliqué.
- Désactivation ponctuelle : appliqué avec `-S none` / `ControlPath=none` (le `ControlMaster=no` suggéré ne suffit pas seul : il réutilise un master existant si ControlPath est défini).

## Tests

- OpenSSH_10.6p1 local (macOS) contre un sshd alpine:3.22 en conteneur (supprimé ensuite) : `-O check` avant/après, `-O stop` avec et sans session active, `-O exit`, `ControlPath too long`. Le socket de test a dû vivre dans `/tmp/fccm` (chemin du scratchpad > 104 octets), supprimé ensuite.
- Sources : clone openssh-portable, tags V_10_6_P2, V_6_7_P1, V_6_6_P1.

## À signaler

- Le "environ 200 ms de RTT" Paris-Colombie et "une demi-douzaine d'allers-retours" sont des ordres de grandeur, pas des mesures.
