/* 404 səhifəsi.
   - Adi 404: standart mətn.
   - Axtarışdan gələndə (?q=...): "No results for ..." mesajı + "Try another search" düyməsi. */
(() => {
  const $ = (id) => document.getElementById(id);
  const MAX_QUERY_LENGTH = 60;

  const q = (new URLSearchParams(location.search).get("q") || "").trim();
  if (!q) return;

  const shown = q.length > MAX_QUERY_LENGTH ? q.slice(0, MAX_QUERY_LENGTH) + "…" : q;

  document.title = "filmalisa - no results";
  $("nfBadge").textContent = "No results";
  $("nfTitle").textContent = "We couldn't find that movie";
  $("nfText").textContent =
    "Nothing matches your search. Check the spelling or try a different title.";

  /* textContent → istifadəçi yazdığı mətn HTML kimi yozulmur (XSS yoxdur) */
  $("nfQuery").textContent = shown;
  $("nfQueryBox").hidden = false;
  $("nfSearchBtn").hidden = false;

  /* Sidebar-da axtarış ikonu aktiv görünsün */
  const searchLink = document.querySelector('.sidebar-link[title="Movies Search"]');
  if (searchLink) {
    searchLink.classList.add("active");
    searchLink.querySelector("img").src = pageUrl("assets/icons/search-active.svg");
  }
})();
