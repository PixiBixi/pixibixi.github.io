---
description: Configuration VCL complète de Varnish — caching, compression, purge, cookies et optimisations WordPress
---

# Config varnish

Bonne config trouvée de Git que je reposte ici si jamais : [Gist](https://gist.github.com/davidthingsaker/6b0997b641fdd370a395)

??? example "Example : /etc/varnish/default.vcl"
    ```vcl
    #########################################################################
    # This is an example VCL file for Varnish 4.0.              #
    # From: <https://gist.github.com/davidthingsaker/6b0997b641fdd370a395>    #
    # LICENSE: If this could help you in any way, you are obliged to use it #
    # for free with no limitations.                     #
    #########################################################################

    # Marker to tell the VCL compiler that this VCL has been adapted to the
    # new 4.0 format.
    vcl 4.0;

    import std;

    # Default backend definition. Set this to point to your content server.
    backend default {
        .host = "127.0.0.1";
        .port = "8080";
    }

    sub vcl_recv {
        # Happens before we check if we have this in cache already.
        #
        # Typically you clean up the request here, removing cookies you dont need,
        # rewriting the request, etc.

        # Properly handle different encoding types
        if (req.http.Accept-Encoding) {
            if (req.url ~ "'.(jpg|jpeg|png|gif|gz|tgz|bz2|tbz|mp3|ogg|swf|woff)$") {
                    # No point in compressing these
                    unset req.http.Accept-Encoding;
            } elsif (req.http.Accept-Encoding ~ "gzip") {
                    set req.http.Accept-Encoding = "gzip";
            } elsif (req.http.Accept-Encoding ~ "deflate") {
                    set req.http.Accept-Encoding = "deflate";
            } else {
                    # unknown algorithm (aka crappy browser)
                unset req.http.Accept-Encoding;
            }
        }

        # Cache files with these extensions
        if (req.url ~ "'.(js|css|jpg|jpeg|png|gif|gz|tgz|bz2|tbz|mp3|ogg|swf|woff)$") {
            unset req.http.cookie;
            return (hash);
        }

        # Dont cache anything thats on the blog page or thats a POST request
        if (req.url ~ "^/blog" || req.method == "POST") {
                return (pass);
        }

        # This is Laravel specific, we have session-monster which sets a no-session header if we dont really need the set session cookie.
        # Check for this and unset the cookies if not required
        # Except if its a POST request
        if (req.http.X-No-Session ~ "yeah" && req.method != "POST") {
                unset req.http.cookie;
        }

        return (hash);
    }

    sub vcl_backend_response {
        # Happens after we have read the response headers from the backend.
        #
        # Here you clean the response headers, removing silly Set-Cookie headers
        # and other mistakes your backend does.

        # This is how long Varnish will cache content. Set at top for visibility.
        set beresp.ttl = 1d;

        if ((bereq.method == "GET" && bereq.url ~ "'.(css|js|xml|gif|jpg|jpeg|swf|png|zip|ico|img|wmf|txt)$") ||
                    bereq.url ~ "'.(minify).*'.(css|js).*" ||
                    bereq.url ~ "'.(css|js|xml|gif|jpg|jpeg|swf|png|zip|ico|img|wmf|txt)'?ver") {
                    unset beresp.http.Set-Cookie;
                    set beresp.ttl = 5d;
            }

        # Unset all cache control headers bar Age.
        unset beresp.http.etag;
        unset beresp.http.Cache-Control;
            unset beresp.http.Pragma;

        # Unset headers we never want someone to see on the front end
        unset beresp.http.Server;
            unset beresp.http.X-Powered-By;

            # Set how long the client should keep the item by default
            set beresp.http.cache-control = "max-age = 300";

            # Set how long the client should keep the item by default
            set beresp.http.cache-control = "max-age = 300";

            # Override browsers to keep styling and dynamics for longer
            if (bereq.url ~ ".minify.*'.(css|js).*") { set beresp.http.cache-control = "max-age = 604800"; }
            if (bereq.url ~ "'.(css|js).*") { set beresp.http.cache-control = "max-age = 604800"; }

            # Override the browsers to cache longer for images than for main content
            if (bereq.url ~ ".(xml|gif|jpg|jpeg|swf|css|js|png|zip|ico|img|wmf|txt)$") {
                    set beresp.http.cache-control = "max-age = 604800";
            }

        # Were done here, send the data to the browser
        return (deliver);
    }


    sub vcl_deliver {
        # Happens when we have all the pieces we need, and are about to send the
        # response to the client.
        #
        # You can do accounting or modifying the final object here.

        # Lets not tell the world we are using Varnish in the same principle we set server_tokens off in Nginx
        unset resp.http.Via;
        unset resp.http.X-Varnish;
    }
    ```

Cette autre config orientée pour WordPress est également bien [Gist](https://gist.github.com/dz0ny/1570859/05fa3a96b45ceb6a78e424be420bafdb9f072a7e)
:

??? example "Example 2 : /etc/varnish/default.vcl"
    ```vcl

    # Set the default backend (Nginx server for me)
    backend default {
      # My Nginx server listen on IP address 127.0.0.1 and TCP port 8080
      .host = "localhost";
      .port = "80";
      .first_byte_timeout = 300s;
    }

    # Purge ACL
    acl purge {
            "127.0.0.1";
    }

    # This function is used when a request is send by a HTTP client (Browser)
    # !!! Replace: blog.nicolargo.com by your own URL !!!
    sub vcl_recv {

      call detect_device;

      #nginx&php-fpm fix
      set req.http.X-Forwarded-For = client.ip;
      set req.http.Host = regsub(req.http.Host, ":[0-9]+", "");

      # Allow purging from ACL
      if (req.request == "PURGE") {
        # If not allowed then a error 405 is returned
        if (!client.ip ~ purge) {
          error 405 "This IP is not allowed to send PURGE requests.";
        }
        # If allowed, do a cache_lookup -> vlc_hit() or vlc_miss()
        return (lookup);
      }

      # Post requests will not be cached
      if (req.request == "POST") {
        return (pass);
      }

      # --- Wordpress specific configuration

      # Did not cache the RSS feed
      if (req.url ~ "/feed") {
          return (pass);
      }

      # Did not cache the admin and login pages
      if (req.url ~ "/wp-(login|admin)") {
        return (pass);
      }

      // server1 must handle file uploads
      if (req.url ~ "media-upload.php" || req.url ~ "file.php" || req.url ~ "async-upload.php") {
        return(pass);
      }

      // do not cache xmlrpc.php
      if (req.url ~ "xmlrpc.php") {
        return(pass);
      }

      // strip cookies from xmlrpc
      if (req.request == "GET" && req.url ~ "xmlrpc.php"){
          remove req.http.cookie;return(pass);
      }

      # Remove the "has_js" cookie
      set req.http.Cookie = regsuball(req.http.Cookie, "has_js=[^;]+(; )?", "");

      # Remove any Google Analytics based cookies
      set req.http.Cookie = regsuball(req.http.Cookie, "__utm.=[^;]+(; )?", "");

      # Remove the Quant Capital cookies (added by some plugin, all __qca)
      set req.http.Cookie = regsuball(req.http.Cookie, "__qc.=[^;]+(; )?", "");

      # Remove the wp-settings-1 cookie
      set req.http.Cookie = regsuball(req.http.Cookie, "wp-settings-1=[^;]+(; )?", "");

      # Remove the wp-settings-time-1 cookie
      set req.http.Cookie = regsuball(req.http.Cookie, "wp-settings-time-1=[^;]+(; )?", "");

      # Remove the wp test cookie
      set req.http.Cookie = regsuball(req.http.Cookie, "wordpress_test_cookie=[^;]+(; )?", "");

      # Are there cookies left with only spaces or that are empty?
      if (req.http.cookie ~ "^ *$") {
            unset req.http.cookie;
      }

      if (req.http.Accept-Encoding) {
        # Do no compress compressed files...
        if (req.url ~ "'.(jpg|png|gif|gz|tgz|bz2|tbz|mp3|ogg)$") {
              remove req.http.Accept-Encoding;
        } elsif (req.http.Accept-Encoding ~ "gzip") {
              set req.http.Accept-Encoding = "gzip";
        } elsif (req.http.Accept-Encoding ~ "deflate") {
              set req.http.Accept-Encoding = "deflate";
        } else {
          remove req.http.Accept-Encoding;
        }
      }

      # Cache the following files extensions
      if (req.url ~ "'.(css|js|png|gif|jp(e)?g)") {
        unset req.http.cookie;
      }

      # Check the cookies for wordpress-specific items
      if (req.http.Cookie ~ "wordpress_" || req.http.Cookie ~ "comment_") {
        return (pass);
      }
      if (!req.http.cookie) {
        unset req.http.cookie;
      }

      # --- End of Wordpress specific configuration

      # Did not cache HTTP authentication and HTTP Cookie
      if (req.http.Authorization || req.http.Cookie) {
        # Not cacheable by default
        return (pass);
      }

      # Cache all others requests
      return (lookup);
    }

    sub vcl_pipe {
      return (pipe);
    }

    sub vcl_pass {
      return (pass);
    }

    # The data on which the hashing will take place
    sub vcl_hash {
      hash_data(req.url);
      if (req.http.host) {
          hash_data(req.http.host);
      } else {
          hash_data(server.ip);
      }

      # ensure separate cache for mobile clients (WPTouch workaround)
      if (req.http.X-Device ~ "smart" || req.http.X-Device ~ "other") {
        hash_data(req.http.X-Device);
      }

      # If the client supports compression, keep that in a different cache
      if (req.http.Accept-Encoding) {
        hash_data(req.http.Accept-Encoding);
      }
      return (hash);
    }

    sub detect_device {
      # Define the desktop device and ipad
      set req.http.X-Device = "desktop";

      if (req.http.User-Agent ~ "iP(hone|od)" || req.http.User-Agent ~ "Android" ) {
        # Define smartphones and tablets
        set req.http.X-Device = "smart";
      }

      elseif (req.http.User-Agent ~ "SymbianOS" || req.http.User-Agent ~ "^BlackBerry" || req.http.User-Agent ~ "^SonyEricsson" || req.http.User-Agent ~ "^Nokia" || req.http.User-Agent ~ "^SAMSUNG" || req.http.User-Agent ~ "^LG") {
        # Define every other mobile device
        set req.http.X-Device = "other";
      }
    }

    sub vcl_hit {
      # Allow purges
      if (req.request == "PURGE") {
        purge;
        error 200 "Purged.";
      }

      return (deliver);
    }

    sub vcl_miss {
      # Allow purges
      if (req.request == "PURGE") {
        purge;
        error 200 "Purged.";
      }

      return (fetch);
    }

    # This function is used when a request is sent by our backend (Nginx server)
    sub vcl_fetch {
      # For static content related to the theme, strip all backend cookies
      if (req.url ~ "'.(css|js|png|gif|jp(e?)g)") {
        unset beresp.http.cookie;
      }

      # A TTL of 30 minutes
      set beresp.ttl = 1800s;

      return (deliver);
    }

    # The routine when we deliver the HTTP request to the user
    # Last chance to modify headers that are sent to the client
    sub vcl_deliver {

      set resp.http.X-Served-By = server.hostname;
      if (obj.hits > 0) {
        set resp.http.X-Cache = "HIT";
        set resp.http.X-Cache-Hits = obj.hits;
      } else {
        set resp.http.X-Cache = "MISS";
      }
      unset resp.http.Via;
      unset resp.http.X-Varnish;

      # Remove some headers: PHP version
      unset resp.http.X-Powered-By;

      return (deliver);
    }

    sub vcl_init {
      return (ok);
    }

    sub vcl_fini {
      return (ok);
    }
    ```
