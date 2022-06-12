# Commandes HP Smart Array en CLI (Utilisable pour un ESX'...)

De nombreuses commandes utiles pour l'utilistaire hpssacli

**Show configuration**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl all show config
```

**Controller status**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl all show status
```

**Show detailed controller information for all controllers**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl all show detail
```

**Show detailed controller information for controller in slot 0**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl slot=0 show detail
```

**Rescan for New Devices**

``` bash
/opt/hp/hpssacli/bin/hpssacli rescan
```

**Physical disk status**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl slot=0 pd all show status
```

**Show detailed physical disk information**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl slot=0 pd all show detail
```

**Logical disk status**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl slot=0 ld all show status
```

**View Detailed Logical Drive Status**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl slot=0 ld 2 show
```

**Create New RAID 0 Logical Drive**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl slot=0 create type=ld drives=1I:1:2 raid=0
```

**Create New RAID 1 Logical Drive**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl slot=0 create type=ld drives=1I:1:1,1I:1:2 raid=1
```

**Create New RAID 5 Logical Drive**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl slot=0 create type=ld drives=1I:1:1,1I:1:2,2I:1:6,2I:1:7,2I:1:8 raid=5
```

**Delete Logical Drive**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl slot=0 ld 2 delete
```

**Add New Physical Drive to Logical Volume**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl slot=0 ld 2 add drives=2I:1:6,2I:1:7
```

**Add Spare Disks**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl slot=0 array all add spares=2I:1:6,2I:1:7
```

**Enable Drive Write Cache**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl slot=0 modify dwc=enable
```

**Disable Drive Write Cache**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl slot=0 modify dwc=disable
```

**Erase Physical Drive**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl slot=0 pd 2I:1:6 modify erase
```

**Turn on Blink Physical Disk LED**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl slot=0 ld 2 modify led=on
```

**Turn off Blink Physical Disk LED**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl slot=0 ld 2 modify led=off
```

**Modify smart array cache read and write ratio
(cacheratio=readratio/writeratio)**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl slot=0 modify cacheratio=100/0
```

**Enable smart array write cache when no battery is present (No-Battery
Write Cache option)**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl slot=0 modify nbwc=enable
```

**Disable smart array cache for certain Logical Volume**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl slot=0 logicaldrive 1 modify arrayaccelerator=disable
```

**Enable smart array cache for certain Logical Volume**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl slot=0 logicaldrive 1 modify arrayaccelerator=enable
```

**Enable SSD Smart Path**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl slot=0 array a modify ssdsmartpath=enable
```

**Disable SSD Smart Path**

``` bash
/opt/hp/hpssacli/bin/hpssacli ctrl slot=0 array a modify ssdsmartpath=disable
```
