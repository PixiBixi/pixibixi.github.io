/* Long code blocks start folded with a fade and an expand button; the copy button still copies the whole block. */
(function () {
  "use strict";

  function tr(k) { return (window.jdI18n || {})[k] || k; }

  // Fold only when it hides a real chunk: a 32-line block stays open.
  var FOLD_OVER = 30;

  function lineCount(code) {
    var nums = code.querySelectorAll(".linenos");
    return nums.length || code.textContent.replace(/\n$/, "").split("\n").length;
  }

  function setFolded(block, btn, n, folded) {
    block.classList.toggle("jd-codefold--folded", folded);
    btn.setAttribute("aria-expanded", String(!folded));
    btn.textContent = folded ? tr("jd.codefold.expand").replace("{n}", n) : tr("jd.codefold.collapse");
  }

  // A line anchor (#__codelineno-…) inside a folded block must be visible.
  function revealHash() {
    if (!location.hash || location.hash.indexOf("#__codelineno-") !== 0) return;
    var target = document.getElementById(location.hash.slice(1));
    var block = target && target.closest(".jd-codefold--folded");
    if (block) block.querySelector(".jd-codefold__toggle").click();
  }

  function init() {
    document.querySelectorAll(".md-typeset div.highlight:not([data-jd-codefold])").forEach(function (block) {
      block.setAttribute("data-jd-codefold", "");
      var code = block.querySelector("pre > code");
      if (!code) return;
      var n = lineCount(code);
      if (n <= FOLD_OVER) return;

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "jd-codefold__toggle";
      btn.addEventListener("click", function () {
        var folding = !block.classList.contains("jd-codefold--folded");
        setFolded(block, btn, n, folding);
        // Collapsing from the bottom of a long block would leave the reader far below it.
        if (folding && block.getBoundingClientRect().top < 0) block.scrollIntoView({ block: "start" });
      });
      block.appendChild(btn);
      setFolded(block, btn, n, true);
    });
    revealHash();
  }

  window.addEventListener("hashchange", revealHash);
  if (typeof document$ !== "undefined") {
    document$.subscribe(init);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
