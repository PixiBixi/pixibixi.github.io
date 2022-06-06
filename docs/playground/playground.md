# PlayGround 
 
``` bash 
logging { 
    channel security_file { 
        file "/var/log/bind/security.log" versions 3 size 30m; 
        severity dynamic; 
    }; 
``` 
