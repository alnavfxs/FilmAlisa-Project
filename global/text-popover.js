/* =========================================================
   YARIMÇIQ (…) MƏTNLƏRİ TAM OXUMAQ ÜÇÜN POPOVER
   Admin cədvəllərində uzun mətn kəsilib "…" ilə göstərilən
   xanalara (.truncate-cell) klik edəndə tam mətni kiçik
   pəncərədə göstərir. Yalnız HƏQİQƏTƏN kəsilmiş xanalarda açılır.
   ========================================================= */

(function () {
  let popoverEl = null;

  function ensurePopover() {
    if (popoverEl) return popoverEl;
    popoverEl = document.createElement("div");
    popoverEl.className = "text-popover";
    popoverEl.setAttribute("role", "dialog");
    popoverEl.innerHTML =
      '<button type="button" class="text-popover__close" aria-label="Close">&times;</button>' +
      '<div class="text-popover__body"></div>';
    popoverEl.querySelector(".text-popover__close").addEventListener("click", (e) => {
      e.stopPropagation();
      closePopover();
    });
    document.body.appendChild(popoverEl);
    return popoverEl;
  }

  function closePopover() {
    if (popoverEl) popoverEl.classList.remove("text-popover--open");
  }

  function isTruncated(el) {
    return el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
  }

  function openPopover(cell) {
    const text = (cell.getAttribute("title") || cell.textContent || "").trim();
    if (!text) return;

    const pop = ensurePopover();
    pop.querySelector(".text-popover__body").textContent = text;
    pop.classList.add("text-popover--open");

    // Xananın altına yerləşdir, ekrandan çıxmasın deyə mövqeyi düzəlt
    const rect = cell.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();
    let left = rect.left + window.scrollX;
    let top = rect.bottom + window.scrollY + 8;

    const maxLeft = window.scrollX + document.documentElement.clientWidth - popRect.width - 12;
    if (left > maxLeft) left = Math.max(12, maxLeft);

    const maxTop = window.scrollY + document.documentElement.clientHeight - popRect.height - 12;
    if (top > maxTop) top = rect.top + window.scrollY - popRect.height - 8;

    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }

  document.addEventListener("click", (e) => {
    const cell = e.target.closest(".truncate-cell");
    if (cell) {
      if (isTruncated(cell)) {
        e.stopPropagation();
        openPopover(cell);
      }
      return;
    }
    if (popoverEl && !popoverEl.contains(e.target)) closePopover();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePopover();
  });

  window.addEventListener("scroll", closePopover, true);
  window.addEventListener("resize", closePopover);
})();
