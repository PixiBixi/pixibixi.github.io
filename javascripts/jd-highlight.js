/* Search highlight bar: when Material's search.highlight marks the terms of `?h=`, show a count with next/clear. */
(function () {
  "use strict";

  function tr(k) { return (window.jdI18n || {})[k] || k; }

  var obs = null;
  function tn(k, n) { return tr(k + (n === 1 ? "_one" : "_other")).replace("{n}", n); }

  function marks(root) {
    // data-md-highlight is set by Material, so authored <mark> elements are left alone.
    return Array.prototype.filter.call(root.querySelectorAll("mark[data-md-highlight]"), function (m) {
      return !m.closest(".jd-hl") && !m.closest(".jd-pal");
    });
  }

  function build(root, term, list) {
    var bar = document.createElement("div");
    bar.className = "jd-hl";
    bar.setAttribute("role", "status");
    var label = document.createElement("span");
    label.className = "jd-hl__label";
    label.appendChild(document.createTextNode(tr("jd.hl.terms") + " "));
    var t = document.createElement("mark");
    t.textContent = term;
    label.appendChild(t);
    var count = document.createElement("span");
    count.textContent = " · " + tn("jd.hl.occurrence", list.length);
    label.appendChild(count);

    var next = document.createElement("button");
    next.type = "button";
    next.className = "jd-hl__next";
    next.textContent = tr("jd.hl.next");
    var clear = document.createElement("button");
    clear.type = "button";
    clear.className = "jd-hl__clear";
    clear.textContent = tr("jd.hl.clear");
    bar.appendChild(label);
    bar.appendChild(next);
    bar.appendChild(clear);

    var cur = -1;
    next.addEventListener("click", function () {
      if (cur >= 0) list[cur].classList.remove("jd-hl-current");
      cur = (cur + 1) % list.length;
      list[cur].classList.add("jd-hl-current");
      var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      list[cur].scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
    });
    clear.addEventListener("click", function () {
      list.forEach(function (m) {
        var parent = m.parentNode;
        if (!parent) return;
        parent.replaceChild(document.createTextNode(m.textContent), m);
        parent.normalize();
      });
      bar.remove();
      try {
        var u = new URL(location.href);
        u.searchParams.delete("h");
        history.replaceState(history.state, "", u.pathname + u.search + u.hash);
      } catch (e) { /* history blocked */ }
    });
    root.insertBefore(bar, root.firstChild);
  }

  function init() {
    if (obs) { obs.disconnect(); obs = null; }
    var term = new URLSearchParams(location.search).get("h");
    var root = document.querySelector(".md-content__inner");
    if (!term || !root) return;

    // Marks arrive once the search index loads (give up after 5s); the bar waits for mutations to settle,
    // else Material would highlight the bar itself.
    var settle = null, giveUp = null;
    function stop() {
      if (obs) { obs.disconnect(); obs = null; }
      clearTimeout(settle);
      clearTimeout(giveUp);
    }
    function check() {
      clearTimeout(settle);
      if (!marks(root).length) return;
      settle = setTimeout(function () {
        stop();
        build(root, term.trim(), marks(root));
      }, 250);
    }
    obs = new MutationObserver(check);
    obs.observe(root, { childList: true, subtree: true });
    giveUp = setTimeout(stop, 5000);
    check();
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(init);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
