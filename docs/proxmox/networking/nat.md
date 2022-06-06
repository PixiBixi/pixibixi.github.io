# NAT 
 
Pour ajouter un NAT sur Proxmox : 
 
``` linenums:1 
auto vmbr0 
iface vmbr0 inet static 
        address  10.10.10.254 
        netmask  255.255.255.0 
        bridge_ports none 
        bridge_stp off 
        bridge_fd 0 
 
        post-up echo 1 > /proc/sys/net/ipv4/ip_forward 
        post-up   iptables -t nat -A POSTROUTING -s 10.10.10.0/24 -o eno1 -j MASQUERADE 
        post-down iptables -t nat -D POSTROUTING -s 10.10.10.0/24 -o eno1 -j MASQUERADE 
``` 
 
On pense à changer l'interface de sortie selon notre système. 
Concernant la VM, il nous faut donc une IP dans le même /24 et en 
gateway 10.10.10.254 
