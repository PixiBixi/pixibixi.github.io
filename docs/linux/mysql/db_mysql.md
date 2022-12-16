# Restaurer DB installation MySQL

Si par très grosse inadvertance, vous effectuez un *rm -Rf
/var/lib/mysql*, nous pouvons recréer la DB initiale MySQL afin de le
faire démarrer :

```bash
mkdir /var/lib/mysql
mkdir /var/lib/mysql/mysql
chown -R mysql:mysql /var/lib/mysql
mysql_install_db
```

Puis un `systemctl start mysql` et il est démarré !
