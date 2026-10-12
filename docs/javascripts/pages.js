/* Home hero search, 404 suggestions and tags filter/sort. Each block is a no-op on other pages. */
(function () {
  "use strict";

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
  function notFound() {
    var root = document.querySelector(".jd-404");
    if (!root || root.dataset.jdBound) return;
    root.dataset.jdBound = "1";

    var path = location.pathname.replace(/index\.html$/, "");
    var segs = path.split("/").filter(Boolean).map(function (s) { return decodeURIComponent(s).replace(/\.html$/, ""); });
    var words = [];
    segs.join(" ").split(/[^a-zA-Z0-9À-ſ]+/).forEach(function (w) {
      w = fold(w);
      if (w.length > 1 && words.indexOf(w) < 0) words.push(w);
    });

    root.querySelector("[data-jd-path]").textContent = path;
    var input = root.querySelector("[data-jd-search-input]");
    input.value = words.join(" ");
    root.querySelector("[data-jd-search-form]").addEventListener("submit", function (e) {
      e.preventDefault();
      openSearch(input.value);
    });

    var ref = document.referrer || "(aucune)";
    var title = "404 : " + path;
    var body = "URL demandée : " + path + "\nPage d'origine : " + ref + "\n";
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
    wordsEl.innerHTML = "On a cherché les mots du slug, " + words.map(function (w) { return "<code>" + esc(w) + "</code>"; }).join(", ") +
      ", dans l'index du wiki : voilà ce qui s'en rapproche le plus.";
    wordsEl.hidden = false;

    fetch(root.dataset.index).then(function (r) { return r.json(); }).then(function (idx) {
      var scored = [];
      idx.docs.forEach(function (d) {
        if (d.location.indexOf("#") >= 0 || !d.location) return;
        var loc = fold(d.location), t = fold(d.title), tx = fold(d.text || "");
        var score = 0;
        words.forEach(function (w) {
          if (loc.indexOf(w) >= 0) score += 3;
          if (t.indexOf(w) >= 0) score += 3;
          if (tx.indexOf(w) >= 0) score += 1;
        });
        if (score) scored.push({ d: d, score: score });
      });
      scored.sort(function (a, b) { return b.score - a.score; });
      var top = scored.slice(0, 3);
      if (!top.length) return;
      var list = root.querySelector("[data-jd-near-list]");
      list.innerHTML = top.map(function (s) {
        var d = s.d;
        var crumbs = d.location.split("/").filter(Boolean).slice(0, -1).map(pretty).join(" / ");
        var text = (d.text || "").replace(/\s+/g, " ").trim();
        if (text.length > 200) text = text.slice(0, 200).replace(/\s+\S*$/, "") + "...";
        return "<li><p class=\"jd-404__crumb\">" + mark(crumbs, words) + "</p>" +
          "<a href=\"" + root.dataset.home + esc(d.location) + "\">" + mark(d.title, words) + "</a>" +
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
    var views = root.querySelectorAll("[data-jd-tag-view]");
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
      featured.hidden = !!q && !featured.querySelector("a:not([hidden])");
      empty.hidden = shown > 0;
    }

    function sort(mode) {
      views.forEach(function (v) { v.hidden = v.dataset.jdTagView !== mode; });
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.jdTagSort === mode)); });
      apply();
    }

    filter.addEventListener("input", apply);
    buttons.forEach(function (b) { b.addEventListener("click", function () { sort(b.dataset.jdTagSort); }); });
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
