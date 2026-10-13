/* Theme UI glue: closes the mobile table of contents panel on link click, Esc or outside click. */
(function () {
  "use strict";

  function tr(k) { return (window.jdI18n || {})[k] || k; }

  function bar() { return document.querySelector(".jd-toc-bar"); }

  // Caption bar: "lang" alone, or "lang · title" when the fence has a title= (as in the mock).
  function captions() {
    document.querySelectorAll(".md-typeset .highlight").forEach(function (box) {
      if (box.closest(".tabbed-set")) return;
      var lang = Array.from(box.classList).find(function (c) { return c.indexOf("language-") === 0; });
      if (!lang) return;
      lang = lang.replace("language-", "");
      // Plain-text fences get no bar: "text" says nothing to the reader.
      if (lang === "text" && !box.querySelector(".filename")) return;
      var bar = box.querySelector(".filename");
      if (bar) {
        if (!bar.dataset.jdLang && lang !== "text") {
          bar.dataset.jdLang = "1";
          bar.textContent = lang + " \u00b7 " + bar.textContent;
        }
        return;
      }
      bar = document.createElement("span");
      bar.className = "filename";
      bar.textContent = lang;
      box.insertBefore(bar, box.firstChild);
    });
  }

  // Break the H1 after "/" instead of mid-word (Chrome offers no break opportunity there).
  function titleBreaks() {
    var h = document.querySelector(".md-typeset h1");
    var t = h && h.firstChild;
    if (!t || t.nodeType !== 3 || h.dataset.jdWbr) return;
    h.dataset.jdWbr = "1";
    var parts = t.nodeValue.split("/");
    var frag = document.createDocumentFragment();
    parts.forEach(function (x, i) {
      if (i) { frag.appendChild(document.createTextNode("/")); frag.appendChild(document.createElement("wbr")); }
      frag.appendChild(document.createTextNode(x));
    });
    h.replaceChild(frag, t);
  }

  // Drawer theme buttons: active = the palette option Material left visible in the header.
  function themeState() {
    var seg = document.querySelector(".jd-seg:not([hidden])");
    var idx = seg ? String(Array.from(document.querySelectorAll(".jd-seg")).indexOf(seg)) : null;
    document.querySelectorAll(".jd-drawer-theme label").forEach(function (l) {
      l.classList.toggle("is-active", l.dataset.jdIdx === idx);
    });
  }

  // Sidebar fade under the sticky section title: only while the scroll container is scrolled.
  function navScroll() {
    document.querySelectorAll(".md-sidebar__scrollwrap").forEach(function (w) {
      w.classList.toggle("jd-scrolled", w.scrollTop > 0);
    });
  }

  // Sidebar fold: the class lives on <html> so it survives instant navigation, the choice in localStorage.
  var FOLDS = [
    { side: ".md-sidebar--primary", cls: "jd-nav-folded", key: "jd.fold.nav" },
    { side: ".md-sidebar--secondary", cls: "jd-toc-folded", key: "jd.fold.toc" },
  ];
  function setFold(f, folded) {
    document.documentElement.classList.toggle(f.cls, folded);
    try { localStorage.setItem(f.cls, folded ? "1" : "0"); } catch (e) { /* private mode */ }
    var btn = document.querySelector(f.side + " > .jd-fold");
    if (!btn) return;
    btn.setAttribute("aria-expanded", String(!folded));
    btn.setAttribute("aria-label", tr(f.key + (folded ? "_show" : "_hide")));
    btn.title = btn.getAttribute("aria-label") + " (" + tr("jd.fold.focus") + ")";
  }
  function sideFold(f) {
    var side = document.querySelector(f.side);
    if (!side || side.querySelector(".jd-fold")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "jd-fold";
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    btn.addEventListener("click", function () {
      setFold(f, !document.documentElement.classList.contains(f.cls));
    });
    side.insertBefore(btn, side.firstChild);
    setFold(f, document.documentElement.classList.contains(f.cls));
  }

  // Reading mode on "r" (Material already binds f, s and / to search): folds both sidebars, or unfolds them.
  document.addEventListener("keydown", function (e) {
    if (e.key !== "r" || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (!window.matchMedia("(min-width: 76.25em)").matches || !document.querySelector(".jd-fold")) return;
    var all = FOLDS.every(function (f) { return document.documentElement.classList.contains(f.cls); });
    FOLDS.forEach(function (f) { setFold(f, !all); });
  });

  // Heading anchors: the click still jumps to the section, and also copies its full URL.
  document.addEventListener("click", function (e) {
    var a = e.target.closest(".md-typeset .headerlink");
    if (!a || !navigator.clipboard) return;
    navigator.clipboard.writeText(a.href).then(function () {
      if (window.alert$) window.alert$.next(tr("jd.anchor.copied"));
    }, function () { /* clipboard denied: plain jump */ });
  });

  // "New" / "Updated" badges, computed on the reader's day so a site not rebuilt for weeks stays right.
  var FRESH_DAYS = 30;
  function fresh() {
    var now = Date.now();
    var age = function (d) { return d ? (now - Date.parse(d)) / 864e5 : Infinity; };
    document.querySelectorAll("[data-jd-fresh]").forEach(function (b) {
      var kind = age(b.dataset.jdCreated) < FRESH_DAYS ? "new" : age(b.dataset.jdUpdated) < FRESH_DAYS ? "updated" : null;
      b.hidden = !kind;
      if (!kind) return;
      b.textContent = tr("jd.fresh." + kind);
      b.className = "jd-fresh jd-fresh--" + kind;
    });
  }
  FOLDS.forEach(function (f) {
    try {
      if (localStorage.getItem(f.cls) === "1") document.documentElement.classList.add(f.cls);
    } catch (e) { /* private mode */ }
  });

  // Mobile TOC bar scrollspy: the last heading above the fold marks its link active, like the desktop TOC.
  function barSpy() {
    var b = bar();
    if (!b || !b.offsetParent) return;
    var links = b.querySelectorAll(".jd-toc-bar__panel a.md-nav__link");
    var current = null;
    links.forEach(function (a) {
      var h = document.getElementById(decodeURIComponent(a.hash.slice(1)));
      if (h && h.getBoundingClientRect().top < 96) current = a;
    });
    links.forEach(function (a) { a.classList.toggle("md-nav__link--active", a === current); });
  }
  document.addEventListener("toggle", function (e) {
    if (!e.target.classList || !e.target.classList.contains("jd-toc-bar") || !e.target.open) return;
    // Scroll the panel only: scrollIntoView would also move the page under it.
    var panel = e.target.querySelector(".jd-toc-bar__panel");
    var a = panel && panel.querySelector(".md-nav__link--active");
    if (a) panel.scrollTop = a.offsetTop - panel.offsetTop - panel.clientHeight / 2;
  }, true);
  var spyQueued = false;
  window.addEventListener("scroll", function () {
    if (spyQueued) return;
    spyQueued = true;
    requestAnimationFrame(function () { spyQueued = false; barSpy(); });
  }, { passive: true });

  function init() {
    barSpy();
    FOLDS.forEach(sideFold);
    navScroll();
    captions();
    titleBreaks();
    themeState();
    fresh();
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(init);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }

  document.addEventListener("scroll", function (e) {
    var w = e.target;
    if (w && w.classList && w.classList.contains("md-sidebar__scrollwrap")) {
      w.classList.toggle("jd-scrolled", w.scrollTop > 0);
    }
  }, true);

  document.addEventListener("click", function (e) {
    if (e.target.closest(".jd-drawer-theme")) setTimeout(themeState, 50);
  });

  document.addEventListener("click", function (e) {
    var b = bar();
    if (!b || !b.open) return;
    if (e.target.closest(".jd-toc-bar__panel a") || !e.target.closest(".jd-toc-bar summary, .jd-toc-bar__panel")) {
      b.open = false;
    }
  });

  document.addEventListener("keydown", function (e) {
    var b = bar();
    if (e.key === "Escape" && b && b.open) b.open = false;
  });
})();
