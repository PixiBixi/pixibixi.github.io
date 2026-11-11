---
article: docs/hypervisor/proxmox/troubleshooting/vm_locked.md
checked: '2026-11-11'
commit: 420718a94f1a3dfc04693cbbd96e6b6635732924
sources:
- repo: pve-guest-common
  path: src/PVE/AbstractConfig.pm
  lines: 337-340
  ref: 42ac0f3
  commit: 42ac0f3c0e1618d597c233447a245143797015f5
- repo: qemu-server
  path: src/PVE/CLI/qm.pm
  lines: 389-405
  ref: afbc929c
  commit: afbc929c23ba002a648f4a9d322595fb7cea63a7
unpinned: 1
---

# docs/hypervisor/proxmox/troubleshooting/vm_locked.md

## Findings

- L16 ERROR corrigé : article réordonné, `qm config XXX | grep ^lock` puis `qm unlock XXX` ; le `rm` du fichier de lock n'est plus proposé, une phrase explique que ce fichier n'est que le flock qui sérialise les modifs de config. Preuve : pve-guest-common src/PVE/AbstractConfig.pm:337-340 @42ac0f3 (`check_lock` meurt sur `$conf->{lock}`, d'où "VM is locked (backup)") ; :295-306 (le fichier `config_file_lock` sert à `lock_file_full`) ; qemu-server src/PVE/QemuConfig.pm:61-65 et src/PVE/CLI/qm.pm:389-405 @afbc929c (`qm unlock` supprime `lock` de la config sous ce flock).
- L13 IMPRECISE corrigé : l'avertissement porte maintenant sur `qm unlock` (ne pas lever un lock backup/snapshot/migrate/clone tant que la tâche tourne, voir Tasks ou `/var/log/pve/tasks/active`). Preuve : pve-common src/PVE/INotify.pm:735 (`/var/log/pve/tasks/active`).

## En plus

- Ajout du cas `can't lock file '/var/lock/qemu-server/lock-XXX.conf' - got timeout` (flock tenu par un process), avec `lsof` pour trouver le process au lieu d'un rm. Preuve : pve-common src/PVE/Tools.pm:266.
- Typo "promxox" corrigée en Proxmox ; description du front matter mise à jour (ne cite plus la suppression du fichier).

## Modernisation

- Appliquée : vérification de la cause via `qm config | grep ^lock` avant `qm unlock` (grep plutôt que rg, rg n'est pas installé sur un PVE par défaut).

## Tests

- Aucun test sur un Proxmox réel ; vérification par le code source (clones qemu-server, pve-guest-common, pve-common créés sous ~/Documents/work/src).

## À signaler

- Rien.
