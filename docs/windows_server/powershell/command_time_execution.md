# Connaitre le temps d'exécution d'une commande PowerShell 
 
Une nouvelle fois, grace à notre amis Stack Overflow, nous pouvons 
savoir combien de temps a durée une commande : 
 
``` powershell 
.'do_something.ps1   
$command = Get-History -Count 1   
$command.EndExecutionTime - $command.StartExecutionTime 
``` 
 
Cette commande compare la date d'exécution du début - la date 
d'exécution de fin. 
 
Il existe également une function pour ceci 
 
``` powershell 
function time($block) { 
    $sw = [Diagnostics.Stopwatch]::StartNew() 
    &$block 
    $sw.Stop() 
    $sw.Elapsed 
} 
``` 
 
Et voici comment l'exéctuer : 
 
``` powershell 
time { .'some_command } 
``` 
