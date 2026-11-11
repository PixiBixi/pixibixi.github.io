---
article: docs/hardware/server/hp/cli_sas.md
checked: '2026-11-11'
commit: 36d65e6ead7f9238bf5b2e2a00521e8c1a2467cc
sources: []
unpinned: 3
---

# docs/hardware/server/hp/cli_sas.md

## Findings

- L17 OUTDATED corrigé : les 26 occurrences de `/opt/hp/hpssacli/bin/hpssacli` deviennent `ssacli` ; l'intro dit que ssacli remplace hpssacli (même syntaxe), donne le chemin Linux (`/usr/sbin/ssacli`), le chemin ESXi et l'ancien chemin hpssacli pour les vieux serveurs. Preuve : index du dépôt HPE MCP (downloads.linux.hpe.com/downloads/MCP/dists/stretch/11.05/non-free/binary-amd64/Packages) : `Package: ssacli`, `Replaces: hpssacli` ; contenu de ssacli-3.10-3.0_amd64.deb : `./usr/sbin/ssacli` et `./opt/smartstorageadmin/ssacli/bin/ssacli`. Chemin ESXi : guides tiers seulement (H3C, pariswells.com), pas de doc HPE lue.
- L93 IMPRECISE corrigé : phrase avant les blocs `ld 2 delete` ("Détruit le volume et ses données. ssacli demande une confirmation, sauf si on ajoute `forced`") et `pd ... modify erase` ("irréversible"). Preuve : aide embarquée du binaire ssacli 3.10 (strings) : "Certain commands produce warning prompt(s) that require user input. The forced parameter represses the warning prompt(s)", exemple `ctrl slot=3 array A delete forced`.
- L133 IMPRECISE corrigé : on/off ciblent maintenant `pd 2I:1:6`, l'exemple `ld 2` est gardé avec une phrase qui dit qu'il fait clignoter tous les disques du volume. Preuve : aide ssacli 3.10 : `[led=on|off][duration=1-86400]`, exemples `ctrl slot=1 ld 1 modify led=on`, `ctrl slot=1 pd all modify led=on`, "Default is 3600".

## En plus

- Typo "utilistaire" -> "utilitaire".
- Mention de la durée par défaut de la LED (3600 s, `duration=`), d'après la même aide.

## Modernisation

- ssacli à la place de hpssacli, binaire dans le PATH sur Linux, chemin ESXi : appliqué.

## Tests

- Téléchargement et extraction du .deb ssacli 3.10-3.0 depuis le dépôt HPE (scratchpad `fc/hpe`), lecture des chaînes d'aide avec `strings` (sans exécuter le binaire : l'exécution dans un conteneur amd64 a été refusée par le classifieur). Présence vérifiée dans l'aide de : `dwc` (alias de `drivewritecache`), `cacheratio=`, `nbwc=`, `ssdsmartpath=`, `arrayaccelerator=`, `add spares=`, `add drives=`, `rescan`, `create type=ld`, `modify erase`.

## À signaler

- Le paquet testé (3.10, dépôt stretch) est ancien ; les chemins sont a priori les mêmes dans les versions récentes, non vérifié.
- Le chemin ESXi n'est confirmé que par des guides tiers. Le wrapper `esxcli ssacli cmd --cmdopts="..."` existe sur certaines versions (guides tiers), non ajouté.
