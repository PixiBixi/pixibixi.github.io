# sed

!!! warning "Mac / BSD sed"
    Sur macOS, `sed` est la version BSD. Installer **gnu-sed** via Homebrew :
    `brew install gnu-sed` — puis utiliser `gsed` ou ajuster le PATH.

sed (Stream EDitor) lit un flux ligne par ligne et applique des expressions.
Sa syntaxe de base :

```bash
sed [options] 'expression' fichier
```

---

## Options essentielles

| Option | Rôle |
|--------|------|
| `-i` | Édition en place (modifie le fichier) |
| `-i.bak` | Édition en place avec backup `.bak` |
| `-n` | Supprime l'affichage automatique (print explicite avec `p`) |
| `-e` | Permet plusieurs expressions |
| `-E` | Active les regex étendues (ERE) |

---

## Substitution

La commande `s` est la plus utilisée :

```bash
s/pattern/remplacement/flags
```

### Flags de substitution

| Flag | Effet |
|------|-------|
| `g` | Remplace toutes les occurrences (global) |
| `N` (chiffre) | Remplace la N-ième occurrence |
| `I` | Insensible à la casse |
| `p` | Affiche la ligne si substitution effectuée |

```bash
# Première occurrence uniquement
sed 's/foo/bar/' file

# Toutes les occurrences
sed 's/foo/bar/g' file

# 2ème occurrence uniquement
sed 's/foo/bar/2' file

# Insensible à la casse
sed 's/foo/bar/gI' file

# Édition en place
sed -i 's/old/new/g' file

# Avec backup
sed -i.bak 's/old/new/g' file
```

### Délimiteur alternatif

Utile quand le pattern contient des `/` (chemins, URLs) :

```bash
sed 's|/etc/old|/etc/new|g' file
sed 's#http://old.com#https://new.com#g' file
```

### Groupes de capture

```bash
# Inverser prénom et nom (ex: "John Doe" → "Doe, John")
sed -E 's/([A-Z][a-z]+) ([A-Z][a-z]+)/\2, \1/' file

# Encapsuler un mot entre crochets
sed -E 's/(error)/[\1]/gI' file
```

---

## Adresses

Sed peut cibler des lignes spécifiques avant d'appliquer une expression.

```bash
# Ligne 3 uniquement
sed '3s/foo/bar/' file

# Lignes 3 à 7
sed '3,7s/foo/bar/' file

# Dernière ligne
sed '$s/foo/bar/' file

# Ligne contenant un pattern
sed '/pattern/s/foo/bar/' file

# De la ligne contenant "start" jusqu'à "end"
sed '/start/,/end/s/foo/bar/' file

# Toutes les lignes sauf la 1ère
sed '1!s/foo/bar/' file
```

---

## Suppression de lignes

```bash
# Supprimer la ligne 5
sed '5d' file

# Supprimer les lignes vides
sed '/^$/d' file

# Supprimer les lignes contenant un pattern
sed '/pattern/d' file

# Supprimer les commentaires (lignes commençant par #)
sed '/^#/d' file

# Supprimer les lignes vides ET les commentaires
sed -e '/^$/d' -e '/^#/d' file

# Supprimer de la ligne 3 à la fin
sed '3,$d' file
```

---

## Affichage ciblé

Avec `-n`, sed n'affiche rien par défaut — `p` affiche explicitement :

```bash
# Afficher uniquement la ligne 5
sed -n '5p' file

# Afficher les lignes 3 à 7
sed -n '3,7p' file

# Afficher les lignes contenant un pattern (comme grep)
sed -n '/error/p' file

# Afficher les lignes entre deux patterns
sed -n '/start/,/end/p' file
```

---

## Insertion, ajout, remplacement de lignes

```bash
# Insérer une ligne AVANT la ligne 3
sed '3i\nouvelle ligne' file

# Ajouter une ligne APRÈS la ligne 3
sed '3a\nouvelle ligne' file

# Remplacer entièrement la ligne 3
sed '3c\ligne de remplacement' file

# Ajouter une ligne après chaque ligne contenant "pattern"
sed '/pattern/a\ligne ajoutée' file
```

---

## Cas pratiques

### Supprimer les espaces en début/fin de ligne

```bash
sed -E 's/^[[:space:]]+|[[:space:]]+$//g' file
```

### Supprimer les lignes dupliquées consécutives

```bash
sed '$!N; /^\(.*\)\n\1$/!P; D' file
```

### Afficher uniquement les N premières lignes

```bash
sed '10q' file   # equivalent à head -10
```

### Numéroter les lignes non vides

```bash
sed '/./=' file | sed '/./N; s/\n/\t/'
```

### Remplacer dans plusieurs fichiers

```bash
sed -i 's/old/new/g' *.conf
sed -i 's/old/new/g' $(find /etc -name "*.conf")
```

### Extraire une valeur de config

```bash
# Extraire la valeur après "key = "
sed -n 's/^key = //p' config.ini
```

### Commenter une ligne contenant un pattern

```bash
sed '/^ServerName/s/^/#/' nginx.conf
```

### Décommenter une ligne

```bash
sed 's/^#\(ServerName\)/\1/' nginx.conf
```

### Ajouter un préfixe à chaque ligne

```bash
sed 's/^/PREFIX: /' file
```

### Supprimer les séquences ANSI (couleurs terminal)

```bash
sed -E 's/\x1B\[[0-9;]*[mK]//g' file
```
