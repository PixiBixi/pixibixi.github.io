---
article: docs/networking/weathermap.md
checked: '2026-11-11'
commit: 4c6661b9bf2876ba35cafb6098997673a4be4c36
sources: []
unpinned: 10
---

# docs/networking/weathermap.md

## Findings

- L100 OUTDATED corrigé : lignes Sprint et TW Telecom supprimées, Level3 renommé "Level3 (Lumen)" (son lien répond toujours). Preuve : `dig @1.1.1.1` donne SERVFAIL pour <www.sprint.net> et lglass.twtelecom.net ; `curl -L https://lookingglass.level3.net/` -> 200.
- L62 IMPRECISE corrigé : liens morts retirés ou mis à jour. Preuve (curl -L avec UA navigateur + dig @1.1.1.1, le 2026-11-09) :
  - Supprimés, NXDOMAIN : 3T Systmes, Blizzard, DataUtama, Hafey, Ikoula (CNAME vers lg02.ikoula.com en NXDOMAIN), K-Net LG (lg.kwaoo.net), Neide Telecom, RamNode, SFR, Syringa, Telefonica, Trit, WorldStream ; lien K-Net k-net-stats.lafibre.info du tableau des weathermaps.
  - Supprimés, SERVFAIL : Bell MTS, Sprint, TW Telecom.
  - Supprimés, 404 : Adeli (404 même sur la racine), Vienna IX (page 404, aucun lien looking glass sur la home vix.at).
  - Supprimé : OVH looking glass (lg.ovh.net : HTTP 301 vers HTTPS, et le 443 répond en clair, `wrong version number`, donc injoignable dans un navigateur).
  - Mis à jour : Cogent -> <https://www.cogentco.com/en/looking-glass> (200), SFMIX -> <https://lg.sfmix.org/> (200), TelekomRS -> <https://lg.telekom.rs/> (200), NTT -> <https://www.gin.ntt.net/looking-glass-landing/> (cible de la redirection).
  - Passés en http:// (le 443 est fermé, le 80 répond 200) : OVH weathermap (`nc` 443 KO, 80 OK, titre "OVHcloud Network Weathermap"), traceroute.org, lg.les.net, Zayo lg.as8218.eu (titre "AS8218 Zayo Europe - Looking Glass").
  - Gardés malgré le 403 : ClearFly (challenge Cloudflare, `cf-mitigated: challenge`, passe dans un navigateur) ; Hivane LG (403 nginx, non concluant).
- L117 IMPRECISE corrigé : ligne OTI `telnet route-server.opentransit.net` supprimée. Preuve : le nom résout (193.251.142.112) mais `nc -z -w 6` sur le port 23 échoue, alors que route-server.he.net:23 répond.

## En plus

- `description` : "Weathermap pour Cacti" remplacé par une description du contenu réel (weathermaps publiques et looking glasses), l'article ne parle pas de Cacti.
- Hosteur supprimé du tableau des weathermaps : la page redirige vers la home du site.
- France-IX : "(compte membre)" ajouté aux deux liens, ils redirigent vers portal.franceix.net/en/login.
- Fautes corrigées : "Vérifié l'état" -> "Vérifier", "aider a vérifié" -> "aider à vérifier", "permet de vérifié l'État" -> "vérifier l'état".
- Phrase contradictoire "Bon nombre de Weathermap sont publics, mais il en existe quelques une publiques" réécrite en "Bon nombre de weathermaps sont privées, car elles montrent le réseau Internet d'une entreprise, mais il en existe quelques unes publiques".
- Tableaux réalignés après suppression des lignes.

## Modernisation

- Aucune suggestion.

## Tests

- curl 8.x (macOS) et dig contre 1.1.1.1, nc pour les ports 80/443/23, depuis le Mac le 2026-11-09.

## À signaler

- Gardés mais injoignables d'ici (timeout sur 80 et 443, DNS OK), non vérifié : Bussola (bussola.as21034.net), K-Net weathermap (as24904.kwaoo.net), IpTel (lg.iptel.by), Root SA (lg.root.lu), Silicon Valley Web Hosting (lg.sjc02.svwh.net). Probablement morts aussi, à retirer si l'auteur confirme depuis un autre réseau.
- Interprétation à valider : la phrase réécrite sur les weathermaps "privées" suppose que "publics" était une faute de frappe pour "privées".
