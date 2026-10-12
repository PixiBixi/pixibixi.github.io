/* Theme UI glue: closes the mobile "Sur cette page" panel on link click, Esc or outside click. */
(function () {
  "use strict";

  function bar() { return document.querySelector(".jd-toc-bar"); }

  // Caption bar for fences without title=: shows the language name (like the titled ones).
  function captions() {
    document.querySelectorAll(".md-typeset .highlight").forEach(function (box) {
      if (box.querySelector(".filename") || box.closest(".tabbed-set")) return;
      var lang = Array.from(box.classList).find(function (c) { return c.indexOf("language-") === 0; });
      if (!lang) return;
      var bar = document.createElement("span");
      bar.className = "filename";
      bar.textContent = lang.replace("language-", "");
      box.insertBefore(bar, box.firstChild);
    });
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(captions);
  } else {
    document.addEventListener("DOMContentLoaded", captions);
  }

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
