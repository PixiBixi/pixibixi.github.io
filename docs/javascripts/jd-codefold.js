/* The theme folds long code blocks (theme.code.fold) but leaves a linked line (#__codelineno-…) hidden: unfold its block. */
(function () {
  "use strict";

  function reveal() {
    if (location.hash.indexOf("#__codelineno-") !== 0) return;
    var target = document.getElementById(location.hash.slice(1));
    var block = target && target.closest(".md-code--collapsed");
    var toggle = block && block.nextElementSibling;
    if (!toggle || !toggle.classList.contains("md-code__toggle")) return;
    toggle.click();
    target.scrollIntoView({ block: "center" });
  }

  // The theme mounts the toggle on the same document$ tick: wait for it.
  function later() { setTimeout(reveal, 100); }

  window.addEventListener("hashchange", reveal);
  if (typeof document$ !== "undefined") {
    document$.subscribe(later);
  } else {
    document.addEventListener("DOMContentLoaded", later);
  }
})();
