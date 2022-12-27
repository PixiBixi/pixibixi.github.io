# Luter contre un DDOS

Très intéressant de luter contre un DDOS L7. Voici des pistes à check :

  * Page fixe ? (/login par exemple) -> Pool FPM dédié du coup
  * User-agent fixe ? -> Drop de l'user agent
  * Pays SRC -> Drop ipset des pays
  * Protocole HTTP1.1/HTTP2.0 -> Si pas 2.0, drop du HTTP 1.1
  * TLS v1.3 / Ciphers ? -> On drop les anciens
  * Jouer sur les timeout pour voir ce qui sature et bien paramétrer les maxconn de toute la stack (HAproxy -> NGINX -> PHP-FPM)
