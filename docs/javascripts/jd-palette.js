/* Cmd+K command palette over the Pagefind index. Material search stays as keyboard fallback (s / f). */
(function () {
  "use strict";

  function tr(k) { return (window.jdI18n || {})[k] || k; }
  function tn(k, n) { return tr(k + (n === 1 ? "_one" : "_other")).replace("{n}", n); }

  var IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  var MOD = IS_MAC ? "⌘" : "Ctrl+";
  var MAX_PAGES = 3;
  // Pagefind ranks on body text: fetch a few more than shown so title hits can move up.
  var FETCH_PAGES = 10;
  var DEBOUNCE_MS = 90;

  var state = {
    index: null, loading: null, open: false, rows: [], sel: 0, lastFocus: null,
    found: {}, timer: null, enterQueued: null
  };
  var ui = null;

  /* ---------- helpers ---------- */

  function norm(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function tokensOf(q) { return norm(q).split(/\s+/).filter(Boolean); }
  function pretty(seg) {
    var s = decodeURIComponent(seg).replace(/[-_]+/g, " ").trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function scope() {
    if (typeof __md_scope !== "undefined") return __md_scope;
    return new URL("/", location.href);
  }
  function url(path) { return new URL(path, scope()).href; }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function svg(path, extra) {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("width", "18");
    s.setAttribute("height", "18");
    s.setAttribute("fill", "none");
    s.setAttribute("stroke", "currentColor");
    s.setAttribute("stroke-width", "1.8");
    s.setAttribute("stroke-linejoin", "round");
    s.setAttribute("stroke-linecap", "round");
    s.setAttribute("aria-hidden", "true");
    s.setAttribute("class", "jd-pal__ico");
    path.split("|").forEach(function (d) {
      var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", d);
      s.appendChild(p);
    });
    if (extra) {
      var c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", "7.5"); c.setAttribute("cy", "8.5"); c.setAttribute("r", "1.2");
      s.appendChild(c);
    }
    return s;
  }
  var ICON_PAGE = "M6 3h9l4 4v14H6z|M14 3v5h5";
  var ICON_FOLDER = "M3 6h7l2 2h9v11H3z";
  var ICON_TAG = "M3 12V4h8l10 10-8 8z";

  /* ---------- Pagefind ---------- */

  var pf = null;
  // One module per page life: Pagefind loads its wasm and index chunks lazily, on the first query.
  function pagefind() {
    if (!pf) {
      pf = import(url("search/pagefind.js")).then(function (m) {
        return m.options({ baseUrl: scope().pathname, excerptLength: 22 }).then(function () { return m.init(); })
          .then(function () { return m; });
      });
      pf.catch(function () { pf = null; });
    }
    return pf;
  }
  // Site path of a Pagefind result URL, the key of jd-pages.json ("linux/cli/sed/").
  function locOf(u) {
    var path = new URL(u, scope()).pathname, base = scope().pathname;
    return path.indexOf(base) === 0 ? path.slice(base.length) : path.replace(/^\//, "");
  }
  // Pagefind excerpts are escaped text with <mark>: rebuild them as nodes, never through innerHTML.
  function excerptNodes(html) {
    var t = document.createElement("template");
    t.innerHTML = html || "";
    var frag = document.createDocumentFragment();
    Array.prototype.forEach.call(t.content.childNodes, function (n) {
      frag.appendChild(n.nodeName === "MARK" ? el("mark", null, n.textContent) : document.createTextNode(n.textContent));
    });
    return frag;
  }

  /* ---------- page kinds, sections and tags ---------- */

  function loadIndex() {
    if (state.index) return Promise.resolve(state.index);
    if (state.loading) return state.loading;
    // jd-pages.json (hooks/article_meta.py) holds titles, tags and the article list: Pagefind only answers queries.
    state.loading = fetch(url("search/jd-pages.json"))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { state.index = build(j); return state.index; })
      .catch(function () { state.loading = null; state.index = build({}); return state.index; });
    return state.loading;
  }

  function build(meta) {
    var pages = meta.pages || {};
    var titles = {};
    Object.keys(pages).forEach(function (loc) { titles[loc] = pages[loc].title; });
    var locs = Object.keys(pages).filter(function (l) { return titles[l] && l.indexOf("tags/") !== 0; });
    function crumb(loc) {
      var segs = loc.split("/").filter(Boolean), out = [];
      for (var k = 1; k < segs.length; k++) out.push(titles[segs.slice(0, k).join("/") + "/"] || pretty(segs[k - 1]));
      return out.join(" › ");
    }

    // Articles only, like hooks/home.py: no home, about, tags, nor folder indexes.
    var articles = meta.articles || locs.filter(function (l) {
      return l && l !== "about/" && !locs.some(function (o) { return o !== l && o.indexOf(l) === 0; });
    });
    var secs = {}, tags = {};
    locs.forEach(function (l) {
      var seg = l.split("/")[0];
      if (seg && l.indexOf("/") > 0) secs[seg] = secs[seg] || { seg: seg, count: 0 };
      (pages[l].tags || []).forEach(function (t) { tags[t] = (tags[t] || 0) + 1; });
    });
    articles.forEach(function (l) {
      var seg = l.split("/")[0];
      if (secs[seg]) secs[seg].count++;
    });
    var sections = Object.keys(secs).map(function (s) {
      var t = titles[s + "/"] || pretty(s);
      return { seg: s, title: t, nTitle: norm(t), nSeg: norm(s), count: secs[s].count };
    }).sort(function (a, b) { return b.count - a.count; });
    var tagList = Object.keys(tags).map(function (t) { return { tag: t, nTag: norm(t), count: tags[t] }; });
    return { titles: titles, crumb: crumb, sections: sections, tags: tagList, count: articles.length };
  }

  /* ---------- search ---------- */

  function shape(d, idx, tokens) {
    var loc = locOf(d.url);
    var title = idx.titles[loc] || (d.meta && d.meta.title) || loc;
    // Deep link only to a heading that matches (old palette rule); the H1 section is the page itself.
    var h1 = norm((d.meta && d.meta.title) || title);
    var head = (d.sub_results || []).filter(function (x) {
      var t = norm(x.title);
      return t !== h1 && x.url.indexOf("#") > 0 && tokens.some(function (k) { return t.indexOf(k) >= 0; });
    })[0];
    var hash = head ? head.url.slice(head.url.indexOf("#")) : "";
    return { loc: loc, title: title, path: idx.crumb(loc), anchor: hash, ex: (head && head.excerpt) || d.excerpt, nTitle: norm(title) };
  }

  function searchPages(q, tokens) {
    return Promise.all([pagefind(), loadIndex()]).then(function (r) {
      var idx = r[1];
      return r[0].search(q).then(function (res) {
        return Promise.all(res.results.slice(0, FETCH_PAGES).map(function (x) { return x.data(); }));
      }).then(function (datas) {
        var out = datas.map(function (d) { return shape(d, idx, tokens); }).filter(function (p) {
          return p.loc.indexOf("tags/") !== 0 && p.loc !== "404.html";
        });
        // Old palette rule kept: a page whose title holds every word beats a body-only hit.
        var inTitle = out.filter(function (p) { return tokens.every(function (t) { return p.nTitle.indexOf(t) >= 0; }); });
        var rest = out.filter(function (p) { return inTitle.indexOf(p) < 0; });
        return inTitle.concat(rest).slice(0, MAX_PAGES);
      });
    });
  }

  function schedule(q, key, tokens) {
    clearTimeout(state.timer);
    state.timer = setTimeout(function () {
      searchPages(q, tokens).then(function (list) {
        state.found[key] = list;
      }, function () {
        state.found[key] = { failed: true };
      }).then(function () {
        if (!state.open || tokensOf(ui.input.value).join(" ") !== key) return;
        render();
        var queued = state.enterQueued;
        state.enterQueued = null;
        if (queued) activate(state.rows[state.sel], queued.newTab);
      });
    }, DEBOUNCE_MS);
  }

  /* ---------- actions ---------- */

  function actions() {
    var list = [];
    list.push({
      id: "theme", label: tr("jd.pal.act_theme"), key: MOD + "⇧L", words: tr("jd.pal.act_theme_words"),
      run: function () {
        var cur = document.body.getAttribute("data-md-color-scheme");
        var want = cur === "slate" ? "default" : "slate";
        var inputs = Array.prototype.slice.call(document.querySelectorAll('input[name="__palette"]'));
        var t = inputs.filter(function (i) { return i.getAttribute("data-md-color-scheme") === want && i.getAttribute("data-md-color-media") !== "(prefers-color-scheme)"; })[0];
        if (t) t.click();
      }
    });
    if (document.querySelector(".copy-llm-btn")) {
      list.push({
        id: "copy", label: tr("jd.pal.act_copy"), key: MOD + "⇧C", words: tr("jd.pal.act_copy_words"),
        run: function () { var b = document.querySelector(".copy-llm-btn"); if (b) b.click(); }
      });
    }
    var edit = document.querySelector('a[rel="edit"]');
    if (edit) {
      list.push({
        id: "edit", label: tr("jd.pal.act_edit"), key: "E", words: tr("jd.pal.act_edit_words"),
        run: function () { window.open(edit.href, "_blank", "noopener"); }
      });
    }
    return list;
  }

  /* ---------- UI ---------- */

  function build_ui() {
    var root = el("div", "jd-pal");
    root.id = "jd-pal";
    root.hidden = true;
    var scrim = el("div", "jd-pal__scrim");
    var dlg = el("div", "jd-pal__dlg");
    dlg.setAttribute("role", "dialog");
    dlg.setAttribute("aria-modal", "true");
    dlg.setAttribute("aria-label", tr("jd.pal.label"));

    var label = el("label", "jd-pal__in");
    var loupe = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    loupe.setAttribute("viewBox", "0 0 24 24"); loupe.setAttribute("width", "20"); loupe.setAttribute("height", "20");
    loupe.setAttribute("fill", "none"); loupe.setAttribute("stroke", "currentColor"); loupe.setAttribute("stroke-width", "2");
    loupe.setAttribute("stroke-linecap", "round"); loupe.setAttribute("aria-hidden", "true");
    loupe.innerHTML = '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path>';
    var sr = el("span", "jd-pal__sr", tr("jd.pal.search_label"));
    var input = el("input");
    input.type = "search";
    input.placeholder = tr("jd.pal.placeholder");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("enterkeyhint", "go");
    var esc = el("kbd", "jd-pal__esc", "esc");
    var cancel = el("button", "jd-pal__cancel", tr("jd.pal.cancel"));
    cancel.type = "button";
    label.appendChild(loupe); label.appendChild(sr); label.appendChild(input); label.appendChild(esc); label.appendChild(cancel);

    var list = el("div", "jd-pal__list");
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", tr("jd.pal.results"));

    var foot = el("div", "jd-pal__foot");
    function hint(k, t) {
      var s = el("span");
      s.appendChild(el("kbd", null, k));
      s.appendChild(document.createTextNode(" " + t));
      return s;
    }
    foot.appendChild(hint("↑↓", tr("jd.pal.hint_nav")));
    foot.appendChild(hint("↵", tr("jd.pal.hint_open")));
    foot.appendChild(hint(MOD + "↵", tr("jd.pal.hint_tab")));
    foot.appendChild(el("span", "jd-pal__spacer"));
    var count = el("span", "jd-pal__count");
    foot.appendChild(count);

    dlg.appendChild(label); dlg.appendChild(list); dlg.appendChild(foot);
    root.appendChild(scrim); root.appendChild(dlg);
    document.body.appendChild(root);

    scrim.addEventListener("click", close);
    cancel.addEventListener("click", close);
    input.addEventListener("input", function () { state.enterQueued = null; render(); });
    list.addEventListener("mousemove", function (e) {
      var r = e.target.closest(".jd-pal__row");
      if (r) select(state.rows.indexOf(r), false);
    });
    list.addEventListener("click", function (e) {
      var r = e.target.closest(".jd-pal__row");
      if (!r) return;
      if (r.tagName === "A") {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        close(true);
      } else {
        e.preventDefault();
        activate(r, false);
      }
    });
    dlg.addEventListener("keydown", onKeys);
    return { root: root, input: input, list: list, count: count };
  }

  function group(label) {
    var p = el("p", "jd-pal__group", label);
    p.setAttribute("role", "presentation");
    ui.list.appendChild(p);
  }

  function addRow(row, a) {
    row.classList.add("jd-pal__row");
    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", "false");
    ui.list.appendChild(row);
    state.rows.push(row);
    if (a) row._jd = a;
    return row;
  }
  function enter() { return el("kbd", "jd-pal__enter", "↵"); }

  function render() {
    var q = ui.input.value.trim();
    var tokens = tokensOf(q);
    ui.list.textContent = "";
    state.rows = [];
    var idx = state.index;
    if (!idx) {
      ui.list.appendChild(el("p", "jd-pal__empty", tr("jd.pal.loading")));
      return;
    }
    ui.count.textContent = idx.count ? tr("jd.pal.indexed").replace("{n}", idx.count) : "";

    var any = false, pending = false, failed = false;
    if (tokens.length) {
      var key = tokens.join(" ");
      var found = state.found[key];
      if (!found) { pending = true; schedule(q, key, tokens); found = []; }
      else if (found.failed) { failed = true; found = []; }
      if (found.length) {
        any = true;
        group(tr("jd.pal.group_pages"));
        found.forEach(function (r) {
          var a = el("a");
          // ?h= hands the words to search.highlight on the target page (jd-highlight.js shows the count).
          a.href = url(r.loc) + "?h=" + encodeURIComponent(q) + r.anchor;
          a.appendChild(svg(ICON_PAGE));
          var body = el("span", "jd-pal__body");
          body.appendChild(el("span", "jd-pal__title", r.title));
          if (r.path) body.appendChild(el("span", "jd-pal__path", r.path));
          if (r.ex) {
            var ex = el("span", "jd-pal__ex");
            ex.appendChild(excerptNodes(r.ex));
            body.appendChild(ex);
          }
          a.appendChild(body);
          a.appendChild(enter());
          addRow(a);
        });
      }
    }

    var secs = idx.sections.filter(function (s) {
      return !tokens.length || tokens.every(function (t) { return s.nTitle.indexOf(t) >= 0 || s.nSeg.indexOf(t) >= 0; });
    }).slice(0, tokens.length ? 3 : 8);
    var tags = tokens.length ? idx.tags.filter(function (t) {
      return tokens.every(function (k) { return t.nTag.indexOf(k) >= 0; });
    }).sort(function (a, b) { return b.count - a.count; }).slice(0, 3) : [];
    if (secs.length || tags.length) {
      any = true;
      group(tokens.length ? tr("jd.pal.group_sections_tags") : tr("jd.pal.group_sections"));
      secs.forEach(function (s) {
        var a = el("a"); a.href = url(s.seg + "/");
        a.appendChild(svg(ICON_FOLDER));
        var b = el("span", "jd-pal__body");
        var line = el("span", "jd-pal__line", s.title + " ");
        line.appendChild(el("span", "jd-pal__muted", "· " + tn("jd.count.article", s.count)));
        b.appendChild(line); a.appendChild(b); a.appendChild(enter());
        addRow(a);
      });
      tags.forEach(function (t) {
        var a = el("a"); a.href = url("tags/#tag:" + encodeURIComponent(t.tag.toLowerCase().replace(/\s+/g, "-")));
        a.appendChild(svg(ICON_TAG, true));
        var b = el("span", "jd-pal__body");
        var line = el("span", "jd-pal__line", tr("jd.pal.tag").replace("{tag}", t.tag) + " ");
        line.appendChild(el("span", "jd-pal__muted", "· " + tn("jd.count.article", t.count)));
        b.appendChild(line); a.appendChild(b); a.appendChild(enter());
        addRow(a);
      });
    }

    // Actions narrow down when the query matches one, otherwise all stay available.
    var all = actions();
    var acts = all.filter(function (a) {
      var hay = norm(a.label + " " + a.words);
      return tokens.length && tokens.every(function (t) { return hay.indexOf(t) >= 0; });
    });
    if (!acts.length) acts = all;
    if (acts.length) {
      any = true;
      group(tr("jd.pal.group_actions"));
      acts.forEach(function (a) {
        var b = el("button"); b.type = "button";
        b.appendChild(el("span", "jd-pal__chev", "›"));
        b.appendChild(el("span", "jd-pal__line", a.label));
        b.appendChild(el("kbd", "jd-pal__key", a.key));
        addRow(b, a);
      });
    }
    if (pending && !state.rows.length) {
      ui.list.appendChild(el("p", "jd-pal__empty", tr("jd.pal.loading")));
    } else if (failed && !any) {
      ui.list.appendChild(el("p", "jd-pal__empty", tr("jd.pal.no_index")));
    } else if (!any) {
      ui.list.appendChild(el("p", "jd-pal__empty", tr("jd.pal.no_result").replace("{q}", q)));
    }
    select(0, true);
  }

  function select(i, scroll) {
    if (!state.rows.length) return;
    i = Math.max(0, Math.min(state.rows.length - 1, i));
    state.rows.forEach(function (r, k) {
      r.setAttribute("aria-selected", k === i ? "true" : "false");
    });
    state.sel = i;
    if (scroll) state.rows[i].scrollIntoView({ block: "nearest" });
  }

  function activate(row, newTab) {
    if (!row) return;
    if (row.tagName === "A") {
      if (newTab) { window.open(row.href, "_blank", "noopener"); return; }
      close(true);
      row.click();
    } else if (row._jd) {
      close(true);
      row._jd.run();
    }
  }

  function runAction(id) {
    var a = actions().filter(function (x) { return x.id === id; })[0];
    if (a) { close(true); a.run(); }
  }

  function onKeys(e) {
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); select(state.sel + 1, true); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); select(state.sel - 1, true); return; }
    if (e.key === "Tab") { e.preventDefault(); select(state.sel + (e.shiftKey ? -1 : 1), true); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      // Results still on their way: open the first row once they land, not a stale action.
      var key = tokensOf(ui.input.value).join(" ");
      if (key && !state.found[key]) { state.enterQueued = { newTab: e.metaKey || e.ctrlKey }; return; }
      activate(state.rows[state.sel], e.metaKey || e.ctrlKey);
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
      var k = e.key.toLowerCase();
      if (k === "l") { e.preventDefault(); runAction("theme"); }
      else if (k === "c") { e.preventDefault(); runAction("copy"); }
    }
  }

  function open(initial) {
    if (!ui || !document.body.contains(ui.root)) ui = build_ui();
    if (state.open) { ui.input.focus(); return; }
    state.open = true;
    state.lastFocus = document.activeElement;
    ui.root.hidden = false;
    document.documentElement.classList.add("jd-pal-open");
    ui.input.value = initial || "";
    render();
    ui.input.focus();
    loadIndex().then(function () { if (state.open) render(); });
  }

  function close(keepFocus) {
    if (!ui || !state.open) return;
    state.open = false;
    ui.root.hidden = true;
    document.documentElement.classList.remove("jd-pal-open");
    if (keepFocus !== true && state.lastFocus && state.lastFocus.focus) {
      try { state.lastFocus.focus(); } catch (e) { /* element gone */ }
    }
  }

  /* ---------- global wiring (once) ---------- */

  function typing(t) {
    return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  }

  window.addEventListener("keydown", function (e) {
    if (e.defaultPrevented) return;
    var k = e.key;
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && k.toLowerCase() === "k") {
      e.preventDefault(); e.stopImmediatePropagation();
      if (state.open) close(); else open();
      return;
    }
    if (state.open || typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (k === "/") {
      e.preventDefault(); e.stopImmediatePropagation();
      open();
    } else if (k === "e" || k === "E") {
      var a = document.querySelector('a[rel="edit"]');
      if (a) { e.preventDefault(); window.open(a.href, "_blank", "noopener"); }
    }
  }, true);

  // Header search field and mobile icon open the palette instead of Material's overlay.
  function hijack(e) {
    if (!e.target.closest) return;
    var hit = e.target.closest(".md-search__form, .md-search__input, .jd-search-toggle, label[for='__search']");
    if (!hit || e.target.closest(".md-search__output")) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.type === "click") open();
  }
  document.addEventListener("mousedown", hijack, true);
  document.addEventListener("click", hijack, true);

  // pages.js opens the palette prefilled (home hero, 404) and reuses the Pagefind module for its suggestions.
  window.jdPalette = { open: open };
  window.jdSearch = { pagefind: pagefind, pages: loadIndex, locOf: locOf };

  function init() {
    if (state.open) close(true);
    if (ui && !document.body.contains(ui.root)) ui = null;
    // Prefetch is lazy on purpose: the index is only fetched on first open.
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(init);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
