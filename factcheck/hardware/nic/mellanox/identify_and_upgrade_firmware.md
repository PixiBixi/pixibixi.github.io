---
article: docs/hardware/nic/mellanox/identify_and_upgrade_firmware.md
checked: '2026-11-11'
commit: e6d108ad53d052f01e03e5a7dd47ae57e86e96df
sources:
- repo: mstflint
  path: dev_mgt/tools_dev_types.c
  lines: 149-155
  ref: origin/master_devel
  commit: 25c7acf54fde9fd81885ab2384c93f1dc3fb541d
unpinned: 3
---

# docs/hardware/nic/mellanox/identify_and_upgrade_firmware.md

## Findings

- L46 IMPRECISE corrigé : MCX542B-ACA -> MCX542B-ACAN, avec la table NVIDIA citée comme source de la correspondance. Preuve : networking-docs.nvidia.com/connectx5fwrn/16354506lts/firmware+compatible+products (WebFetch le 2026-11-09) : ligne `MCX542B-ACAN | MT_0000000248 | ConnectX-5 EN network interface card for OCP; with host management; 25GbE dual-port SFP28`.
- L48 IMPRECISE corrigé : "nom interne" remplacé par "device MST", en précisant que `mt4119` identifie les ConnectX-5 et n'est pas un nom de modèle. Preuve : mstflint dev_mgt/tools_dev_types.c:149-155 @origin/master_devel (`DeviceConnectX5`, sw_dev_id 4119).
- L68 IMPRECISE corrigé : ajout de la vérification du PSID de l'image (`mstflint -i <image> q | grep PSID`) et de la note sur `-allow_psid_change`. Preuve : mstflint flint/subcommands.cpp:2727-2770 (`BurnSubCommand::checkPSID` : refus si PSID différent, sauf changement de PSID mineur autorisé ou `allow_psid_change`), flint/cmd_line_parser.cpp:192.
- L74 IMPRECISE corrigé (détail du finding inversé) : activation après reboot ou `mlxfwreset`/`mstfwreset` ajoutée. Le finding disait que `FW Version` montre l'ancienne version avant reset : c'est l'inverse, `FW Version` = image flashée (nouvelle), `FW Version(Running)` = version active (ancienne), imprimée seulement si elles diffèrent. Preuve : flint/subcommands.cpp:4746-4760 ; message `To load new configuration run mlxfwreset or reboot machine` (`mstfwreset` dans le build mstflint), subcommands.cpp:6244-6248 ; man/mstfwreset.md.

## En plus

- Typo "un recommence" -> "on recommence" dans la dernière phrase réécrite.

## Modernisation

- `mstflint -d 18:00.0 -i <image> burn` sans MFT ni `mst start` : appliqué (option `-d`/`-i`/`burn` vérifiées dans flint/cmd_line_parser.cpp:85, 176, 186).
- `mlxfwreset` : appliqué (avec l'équivalent mstflint `mstfwreset`).
- `mlxup` : non appliqué, outil fermé NVIDIA sans source à vérifier.

## Tests

- Aucun matériel Mellanox : lecture du source mstflint (clone créé dans ~/Documents/work/src/mstflint, branche origin/master_devel) et de la table NVIDIA.

## À signaler

- Le titre "Identifier and upgrade" mélange anglais et français ("and"), laissé tel quel.
- Le reset à chaud dépend de la carte et du driver (`mstfwreset -d <dev> q` donne les niveaux supportés) : non détaillé dans l'article.
