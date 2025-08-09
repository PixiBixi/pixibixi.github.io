# Réduire la taille de son repository Git

J'étais entrain de modifier un script bash puis m'est venu l'envie de voir la taille du repository

```bash
root~ du -sh myscripts
242M    myscripts
```

Il s'agit d'un repository ne comprenant uniquement des scripts, je ne comprenais pas ce qui prenait tant de place...

```bash
root~ du -sh myscripts
880K    dedicated
 28K    img
```

Toujours rien, mais où sont donc cachés ces 242MB...

```bash
root~ du -sh myscripts
8.0K    .DS_Store
241M    .git
4.0K    .gitignore
```

242MB de .git pour un repository qui a moins de 5MB de scripts... J'ai donc compris qu'un fichier binaire devait trainer dans les commits et qui n'aurait peut être pas du être commit. C'est à partir de maintenant que l'on s'amuse.

La première étape est donc de lister les différents fichiers dans les différents commits. Plusieurs manières sont possibles, je préfère la manière native à git, sans surplus à installer

```bash
root~ git rev-list --objects --all \
| git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' \
| awk '/^blob/ {print substr($0,6)}' \
| sort --numeric-sort --key=2 \
| cut --complement --characters=13-40 \
| numfmt --field=2 --to=iec-i --suffix=B --padding=7 --round=nearest \
| tac \
| head -5
b4dfc33c1df6  149MiB my/path1/rescue.gz
14a488d39e0c   51MiB my/path2/jessie.gz
bf6f5aeda4b0   40MiB my/path3/wheezy.gz
bd49a5cf67a5   19KiB live/generic/file.a
c2959ad02037   11KiB ceph/profile
```

Il existe un plugin git qui va nous sortir concrêtement le même genre de résultat

```bash
root~ git filter-repo --analyze --report-dir=Analyze
Processed 44500 blob sizes
Processed 20392 commits
Writing reports to Analyze...done.
```

On regarde le fichier `Analyze/blob-shas-and-paths.txt` pour voir ce qui nous prend toute la place

Les 3 premiers fichiers occupent donc une grande majorité de notre repository, sans que ceux-ci ne nous soit utiles... Nous pouvons donc économiser près de 99% d'espace.

Pour les supprimer

```bash
~root git:(master) git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch  my/path1/rescue.gz' \
  --prune-empty --tag-name-filter cat -- --all
Proceeding with filter-branch...

Rewrite 24aeb26df8b58d590dbf4c44c68ea651c85bbf8d (4/245) (0 seconds passed, remaining 0 predicted)    rm ' my/path1/rescue.gz'
Rewrite 31820d367600be9061a9f9924393bc1ab1ae2025 (5/245) (0 seconds passed, remaining 0 predicted)    rm ' my/path1/rescue.gz'
Rewrite 716fc2741bc354bc257ab9ae17b5165374e64408 (6/245) (0 seconds passed, remaining 0 predicted)    rm ' my/path1/rescue.gz'
Rewrite a31edc1ee2988ff567703886e3bca02482ace23a (235/245) (15 seconds passed, remaining 0 predicted)
Ref 'refs/heads/master' was rewritten
Ref 'refs/remotes/origin/master' was rewritten
WARNING: Ref 'refs/remotes/origin/master' is unchanged
Ref 'refs/stash' was rewritten
```

Une fois que nous avons supprimé les différents fichiers, on va réécrire les logs afin de supprimer toute occurence de ces fichiers qui ne sont plus dans aucun commit

```bash
root~ rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now
git gc --aggressive --prune=now
```

Une fois cette dernière étape faites... tadam

```bash
root~ du -sh myscripts
1.5M    myscripts
```

En supprimant ces gros fichiers binaires, nous sommes passés de 242MB à 1.5MB ! ;)
