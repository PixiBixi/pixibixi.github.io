/* Home hero search, 404 suggestions and tags filter/sort. Each block is a no-op on other pages. */
(function () {
  "use strict";

  function tr(k) { return (window.jdI18n || {})[k] || k; }

  // Opens the Cmd+K palette when present, else Material's search, prefilled with q.
  function openSearch(q) {
    if (window.jdPalette && typeof window.jdPalette.open === "function") {
      window.jdPalette.open(q);
      return;
    }
    var ev = new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true, bubbles: true, cancelable: true });
    if (!document.dispatchEvent(ev)) return;
    var toggle = document.querySelector("#__search");
    var input = document.querySelector(".md-search__input");
    if (!toggle || !input) return;
    toggle.checked = true;
    input.focus();
    if (q) {
      input.value = q;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function esc(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function fold(s) {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  function mark(text, words) {
    var re = new RegExp("(" + words.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")", "gi");
    return esc(text).replace(re, '<mark>$1</mark>');
  }

  function pretty(seg) {
    var s = seg.replace(/[-_]+/g, " ");
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ---- Home ----
  function home() {
    var input = document.querySelector("[data-jd-home-search]");
    if (!input || input.dataset.jdBound) return;
    input.dataset.jdBound = "1";
    var fire = function () { openSearch(input.value); };
    input.addEventListener("focus", fire);
    input.addEventListener("click", fire);
  }

  // ---- 404 ----
  var STOP = "not does the and for with you are was has have this that from les des une aux dans sur par pour avec sans est pas que qui son ses ces mon ton html index".split(" ");

  function notFound() {
    var root = document.querySelector(".jd-404");
    if (!root || root.dataset.jdBound) return;
    root.dataset.jdBound = "1";

    var path = location.pathname.replace(/index\.html$/, "");
    var segs = path.split("/").filter(Boolean).map(function (s) { return decodeURIComponent(s).replace(/\.html$/, ""); });
    var words = [];
    segs.join(" ").split(/[^a-zA-Z0-9À-ſ]+/).forEach(function (w) {
      w = fold(w);
      if (w.length > 2 && STOP.indexOf(w) < 0 && words.indexOf(w) < 0) words.push(w);
    });

    root.querySelector("[data-jd-path]").textContent = path;
    var input = root.querySelector("[data-jd-search-input]");
    input.value = words.join(" ");
    root.querySelector("[data-jd-search-form]").addEventListener("submit", function (e) {
      e.preventDefault();
      openSearch(input.value);
    });

    var ref = document.referrer || tr("jd.404.no_referrer");
    var title = tr("jd.404.issue_title").replace("{path}", path);
    var body = tr("jd.404.issue_body").replace("{path}", path).replace("{ref}", ref);
    var base = root.dataset.repo;
    root.querySelector("[data-jd-issue]").href = base + "/issues/new?template=missing-page.yml" +
      "&title=" + encodeURIComponent(title) + "&body=" + encodeURIComponent(body) +
      "&requested_url=" + encodeURIComponent(path) + "&referrer=" + encodeURIComponent(ref);
    var dir = segs.slice(0, -1).join("/");
    var file = (segs[segs.length - 1] || "page") + ".md";
    root.querySelector("[data-jd-pr]").href = base + "/new/" + root.dataset.branch + "/docs" +
      (dir ? "/" + dir : "") + "?filename=" + encodeURIComponent(file);

    if (!words.length) return;
    var wordsEl = root.querySelector("[data-jd-words]");
    wordsEl.innerHTML = tr("jd.404.words").replace("{words}", words.map(function (w) { return "<code>" + esc(w) + "</code>"; }).join(", "));
    wordsEl.hidden = false;

    // Same scoring as before Pagefind: a word in the path or the title weighs 3, in the body 1.
    var search = window.jdSearch;
    if (!search) return;
    var descsReq = fetch(root.dataset.descs).then(function (r) { return r.json(); }).then(function (j) { return j.descriptions || {}; }).catch(function () { return {}; });
    var hitsReq = search.pagefind().then(function (pf) {
      return Promise.all(words.map(function (w) { return pf.search(w); }));
    }).catch(function () { return []; });
    Promise.all([search.pages(), descsReq, hitsReq]).then(function (res) {
      var idx = res[0], descs = res[1], hits = {};
      res[2].forEach(function (r) {
        r.results.forEach(function (x) { hits[x.id] = hits[x.id] || { x: x, n: 0 }; hits[x.id].n++; });
      });
      return Promise.all(Object.keys(hits).map(function (id) {
        return hits[id].x.data().then(function (d) { return { loc: search.locOf(d.url), n: hits[id].n, d: d }; });
      })).then(function (body) {
        var byLoc = {};
        body.forEach(function (b) { byLoc[b.loc] = b; });
        var scored = [];
        Object.keys(idx.titles).forEach(function (l) {
          if (!l || l.indexOf("tags/") === 0) return;
          var loc = fold(l), t = fold(idx.titles[l]), score = byLoc[l] ? byLoc[l].n : 0;
          words.forEach(function (w) {
            if (loc.indexOf(w) >= 0) score += 3;
            if (t.indexOf(w) >= 0) score += 3;
          });
          if (score) scored.push({ loc: l, title: idx.titles[l], score: score, d: byLoc[l] && byLoc[l].d });
        });
        scored.sort(function (a, b) { return b.score - a.score; });
        return { top: scored.slice(0, 3), descs: descs };
      });
    }).then(function (r) {
      if (!r.top.length) return;
      var list = root.querySelector("[data-jd-near-list]");
      list.innerHTML = r.top.map(function (s) {
        var crumbs = s.loc.split("/").filter(Boolean).slice(0, -1).map(pretty).join(" / ");
        var text = r.descs[s.loc] || (s.d && s.d.content || "").replace(/\s+/g, " ").trim();
        if (text.length > 200) text = text.slice(0, 200).replace(/\s+\S*$/, "") + "...";
        return "<li><p class=\"jd-404__crumb\">" + mark(crumbs, words) + "</p>" +
          "<a href=\"" + root.dataset.home + esc(s.loc) + "\">" + mark(s.title, words) + "</a>" +
          (text ? "<p class=\"jd-404__excerpt\">" + mark(text, words) + "</p>" : "") + "</li>";
      }).join("");
      root.querySelector("[data-jd-near]").hidden = false;
    }).catch(function () {});
  }

  // ---- Tags ----
  function tags() {
    var root = document.querySelector(".jd-tags");
    if (!root || root.dataset.jdBound) return;
    root.dataset.jdBound = "1";
    var filter = root.querySelector("[data-jd-tag-filter]");
    var mode = "popular";
    var buttons = root.querySelectorAll("[data-jd-tag-sort]");
    var featured = root.querySelector("[data-jd-tag-featured]");
    var empty = root.querySelector("[data-jd-tag-empty]");

    function apply() {
      var q = fold(filter.value.trim());
      var shown = 0;
      root.querySelectorAll(".jd-tags__list a, .jd-tags__cards a").forEach(function (a) {
        var ok = !q || fold(a.dataset.name).indexOf(q) >= 0;
        a.hidden = !ok;
      });
      root.querySelectorAll(".jd-tags__group").forEach(function (g) {
        var any = g.querySelector("a:not([hidden])");
        g.hidden = !any;
        if (any && !g.closest("[hidden]")) shown++;
      });
      featured.hidden = mode !== "popular" || (!!q && !featured.querySelector("a:not([hidden])"));
      empty.hidden = shown > 0;
    }

    // The A-Z list stays in both modes; "Populaires" only adds the top cards above it.
    function sort(next) {
      mode = next;
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.jdTagSort === mode)); });
      apply();
    }

    filter.addEventListener("input", apply);
    buttons.forEach(function (b) { b.addEventListener("click", function () { sort(b.dataset.jdTagSort); }); });

    // #tag:<slug> shows that tag's panel alone; any other hash brings the index back.
    function panel() {
      var id = decodeURIComponent(location.hash.slice(1));
      var hit = null;
      root.querySelectorAll("[data-jd-tagpanel]").forEach(function (p) {
        p.hidden = p.id !== id;
        if (!p.hidden) hit = p;
      });
      root.classList.toggle("jd-tags--one", !!hit);
      if (hit) window.scrollTo(0, 0);
    }
    // Material's instant navigation moves in-page anchors with pushState, no hashchange: follow the clicks too.
    window.addEventListener("hashchange", panel);
    window.addEventListener("popstate", panel);
    root.addEventListener("click", function (e) {
      if (e.target.closest('a[href^="#"]')) setTimeout(panel, 0);
    });
    panel();
  }

  function init() {
    home();
    notFound();
    tags();
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(init);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
