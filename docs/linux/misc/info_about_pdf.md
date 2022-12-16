# Obtenir des informations sur vos PDF

Pour obtenir des infos utiles sur vos PDF, petit trick bien sympa,
requiert un paquet :

``` bash
[[ $(uname) == Darwin ]] && brew install exiftool || apt install libimage-exiftool-perl
```

Puis on utilise simplement la commande :

``` bash
λ yann ~ →  exiftool -a -G1 TCL.pdf
[ExifTool]      ExifTool Version Number         : 12.00
[System]        File Name                       : TCL.pdf
[System]        Directory                       : .
[System]        File Size                       : 255 kB
[System]        File Modification Date/Time     : 2020:10:27 17:03:43+01:00
[System]        File Access Date/Time           : 2020:11:23 14:46:10+01:00
[System]        File Inode Change Date/Time     : 2020:10:27 17:03:51+01:00
[System]        File Permissions                : rw-r--r--
[File]          File Type                       : PDF
[File]          File Type Extension             : pdf
[File]          MIME Type                       : application/pdf
[PDF]           PDF Version                     : 1.4
[PDF]           Linearized                      : No
[PDF]           Modify Date                     : 2020:10:27 17:00:29+01:00
[PDF]           Create Date                     : 2020:10:27 17:00:29+01:00
[PDF]           Producer                        : iText 2.1.4 (by lowagie.com)
[PDF]           Page Count                      : 1
```

Diverses infos qui peuvent +/- être utiles, également dispo pour tout
type de média.
