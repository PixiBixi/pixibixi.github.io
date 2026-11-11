---
article: docs/linux/misc/info_about_pdf.md
checked: '2026-11-11'
commit: 9e4ffc568e85530c9fd3f5981946e83b47b07b10
sources: []
unpinned: 1
---

# docs/linux/misc/info_about_pdf.md

## Findings

- Aucun finding. Commande et paquets confirmés.

## En plus

- Front matter `description` : "informations de compression" remplacé par "logiciel producteur et nombre de pages", exiftool ne sort pas d'info de compression sur un PDF (ni dans l'exemple de l'article ni dans mon test). Preuve : `exiftool -a -G1 t.pdf` (13.55) ne sort que les groupes ExifTool/System/File/PDF.

## Modernisation

- Aucune suggestion.

## Tests

- exiftool 13.55 local sur un PDF minimal ; `docker run --rm debian:13` : `apt-cache policy libimage-exiftool-perl` candidat 13.25+dfsg-1.

## À signaler

- La ligne d'install fait `apt install` sans `sudo`, et `A && B || C` lance apt si `brew install` échoue sur macOS. Laissé tel quel.
