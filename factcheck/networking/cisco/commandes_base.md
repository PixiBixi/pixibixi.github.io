---
article: docs/networking/cisco/commandes_base.md
checked: '2026-11-10'
commit: 024368b4c442fa2c61c5f1b20039d50777cce76f
sources: []
unpinned: 4
---

# docs/networking/cisco/commandes_base.md

## Findings

- L83 ERROR corrigé : la config telnet est gardée (référence de base, lab) mais suivie d'un avertissement et d'un bloc SSH (ip domain-name, crypto key generate rsa modulus 2048, ip ssh version 2, username ... algorithm-type scrypt secret, login local, transport input ssh). Preuve : Cisco "Cisco Guide to Harden Cisco IOS Devices" (cisco.com/c/en/us/support/docs/ip/access-lists/13608-21.html) : "use transport input ssh instead of clear-text protocols, such as Telnet and rlogin", exemple `username <username> privilege 15 algorithm-type scrypt secret <secret>`. ip domain-name / crypto key / ip ssh version 2 : syntaxe IOS connue, non relue dans cette source.
- L90 ERROR corrigé : "Encrypter" devient "Masquer", paragraphe ajouté (type 7 = Vigenère réversible, protège seulement de la lecture par-dessus l'épaule, préférer secret). Preuve : même guide Cisco : "the algorithm used by the service password-encryption command is a simple Vigenère cipher", "must not be used for this purpose" ; Cisco "IOS Password Encryption Facts" (107614-64) : schéma "very weak", conçu contre le "snooping or sniffing".
- L66 OUTDATED corrigé : "mot de passe crypté" devient "hashé", phrase ajoutée (MD5 type 5 par défaut) et variante `enable algorithm-type scrypt secret`. Preuve : guide Cisco : "The enable secret command ... use Message Digest 5 (MD5)", "Use type 9 (scrypt) whenever possible". La version IOS d'introduction (15.3(3) selon le finding) n'a pas été trouvée dans les pages lues : je ne l'ai pas écrite, seulement "sur les IOS qui le supportent". La syntaxe `enable algorithm-type scrypt secret` n'apparaît pas telle quelle dans la partie lue du guide (seulement la forme `username ... algorithm-type scrypt secret`) : non vérifiée sur équipement.
- L52 IMPRECISE corrigé : phrase ajoutée sur TFTP en clair, alternative `copy running-config scp:` et `ip scp server enable`. Preuve : guide Cisco : "the use of the Secure Copy Protocol (SCP) in place of FTP or TFTP", "SCP relies on SSH", exemple `ip scp server enable`.

## En plus

- Aucun.

## Modernisation

- `enable algorithm-type scrypt secret` : appliqué (voir L66, syntaxe non testée).
- `username ... algorithm-type scrypt secret` + `transport input ssh` + `login local` : appliqué dans le bloc SSH.

## Tests

- Aucun équipement IOS disponible, rien testé. Sources : deux pages Cisco (cisco.com, 13608-21 lu sur ses 100000 premiers caractères, 107614-64).

## À signaler

- Les blocs restent en indentation (style du fichier, MD046 consistent).
- La version IOS minimale pour scrypt/sha256 est à confirmer par l'auteur s'il veut la citer.
