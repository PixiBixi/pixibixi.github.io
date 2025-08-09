# Benchmark avec une random query string

Pour benchmark, nous utilisons généralement l'outil `wrk`, un équivalent à ab.

Celui-ci peut être étendu via des scripts LUA.

Pour cela, voici le petit script LUA :

```lua
function getAlphaChar()
    selection = math.random(1, 3)
    if selection == 1 then return string.char(math.random(65, 90)) end
    if selection == 2 then return string.char(math.random(97, 122)) end
    return string.char(math.random(48, 57))
end


function getRandomString(length)
    length = length or 1
    if length < 1 then return nil end
    local array = {}
    for i = 1, length do
        array[i] = getAlphaChar()
    end
    return table.concat(array)
end

function removeTrailingSlash(s)
    return (s:gsub("(.-)/*$", "%1"))
end


-- add a random string to the original request path.
request = function()
    local path = wrk.path .. getRandomString(20)
    print(wrk.format(wrk.method, path, wrk.headers, wrk.body))
    return wrk.format(wrk.method, path, wrk.headers, wrk.body)
end
```

(Je ne l'ai pas écris moi, je l'ai récupéré [ici](https://github.com/RosarioGrosso/wrk-lua-random-requests/blob/master/add_random_alpha.lua))

Et pour l'utiliser, rien de plus simple :

```
wrk -t4 -c100 -d10s --timeout 1 -s add_random_alpha https://wiki.jdelgado.fr/
```

Ici, nous lancons un bench pendant 10s sur le wiki, en utilisant 4 threads et 100 connections par thread
