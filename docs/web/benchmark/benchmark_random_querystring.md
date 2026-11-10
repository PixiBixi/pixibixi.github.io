---
description: Effectuer des tests de charge avec wrk en générant des query strings aléatoires pour simuler du trafic réaliste
tags:
  - wrk
  - Benchmark
tested_with:
  - "wrk 4.2.0 (LuaJIT 2.1)"
---

# Benchmark avec une random query string

Pour benchmark, nous utilisons généralement l'outil `wrk`. Il joue dans la même cour que ab, mais il est multi-thread et asynchrone (epoll), donc bien plus capable de saturer un serveur, et il sort la latence avec sa distribution.

Celui-ci peut être étendu via des scripts Lua.

Une query string aléatoire à chaque requête force un cache miss côté CDN ou reverse proxy : on mesure le backend, pas le cache. Pour cela, voici le petit script Lua :

```lua
local counter = 0

function setup(thread)
    counter = counter + 1
    thread:set("id", counter)
end

function init(args)
    -- one seed per thread, otherwise every thread replays the same sequence
    math.randomseed(os.time() + id)
end

function getAlphaChar()
    local selection = math.random(1, 3)
    if selection == 1 then return string.char(math.random(65, 90)) end
    if selection == 2 then return string.char(math.random(97, 122)) end
    return string.char(math.random(48, 57))
end

function getRandomString(length)
    local array = {}
    for i = 1, length do
        array[i] = getAlphaChar()
    end
    return table.concat(array)
end

-- add a random query string to the original request path
request = function()
    local path = wrk.path .. "?" .. getRandomString(20)
    return wrk.format(wrk.method, path, wrk.headers, wrk.body)
end
```

(Je ne l'ai pas écrit moi, il est adapté de [celui-ci](https://github.com/RosarioGrosso/wrk-lua-random-requests/blob/master/add_random_alpha.lua).) 2 différences avec l'original :

- l'original colle les 20 caractères directement au chemin (`/6tRtoB7ZJruefd5VVvG3`), ce qui donne des 404 en série : ici on ajoute un `?` pour avoir une vraie query string
- sans `math.randomseed`, LuaJIT part toujours de la même graine : chaque thread de wrk rejoue la même séquence, et chaque run aussi, donc des hits cache apparaissent. On seed par thread dans `init()`

On évite aussi tout `print()` dans `request()` : il écrit chaque requête sur stdout et plombe le débit mesuré.

Et pour l'utiliser, rien de plus simple, avec le script enregistré sous `add_random_alpha.lua` dans le dossier courant (wrk prend le chemin tel quel, sans ajouter l'extension) :

```bash
wrk -t4 -c100 -d10s --timeout 1 -s add_random_alpha.lua https://wiki.jdelgado.fr/
```

Ici, nous lançons un bench pendant 10s sur le wiki, en utilisant 4 threads et 100 connexions au total, réparties entre les threads (25 par thread). Pour 100 connexions par thread, on passe `-c400`.

`wrk` n'a plus bougé depuis 2021 (4.2.0). Pour un débit constant plutôt que maximal, on regarde wrk2, oha ou k6.
