/* =========================================================
   ADMIN CƏDVƏL SƏHİFƏLƏMƏSİ (pagination)
   Uzun siyahılarda scroll yaranmasın deyə, cədvəl bir dəfəyə
   yalnız `pageSize` qədər sətir göstərir; altında 1,2,3…
   səhifə nömrələri və Previous/Next düymələri çıxır.
   Bütün məlumat yenə də bir dəfəyə yüklənir (API dəyişmir) —
   yalnız EKRANDA göstərilən hissə səhifələnir.
   ========================================================= */

function createTablePaginator({ tableBody, pagerEl, colSpan, pageSize = 8, emptyText = "No records yet.", renderRow }) {
  let items = [];
  let page = 1;

  function totalPages() {
    return Math.max(1, Math.ceil(items.length / pageSize));
  }

  function clampPage() {
    const tp = totalPages();
    if (page > tp) page = tp;
    if (page < 1) page = 1;
  }

  // Cəmi 7-dən çox səhifə olanda ortada "…" ilə qısaldır: 1 … 4 5 6 … 12
  function pageList(cur, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const list = [1];
    if (cur > 3) list.push("…");
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) list.push(i);
    if (cur < total - 2) list.push("…");
    list.push(total);
    return list;
  }

  function renderPager() {
    pagerEl.innerHTML = "";
    const tp = totalPages();

    if (!items.length || tp <= 1) {
      pagerEl.classList.add("d-none");
      return;
    }
    pagerEl.classList.remove("d-none");

    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "pager-btn pager-btn--nav";
    prev.textContent = "Previous";
    prev.disabled = page === 1;
    prev.addEventListener("click", () => {
      page -= 1;
      renderPage();
    });
    pagerEl.appendChild(prev);

    pageList(page, tp).forEach((n) => {
      if (n === "…") {
        const dots = document.createElement("span");
        dots.className = "pager-ellipsis";
        dots.textContent = "…";
        pagerEl.appendChild(dots);
        return;
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pager-btn" + (n === page ? " pager-btn--active" : "");
      btn.textContent = String(n);
      btn.addEventListener("click", () => {
        page = n;
        renderPage();
      });
      pagerEl.appendChild(btn);
    });

    const next = document.createElement("button");
    next.type = "button";
    next.className = "pager-btn pager-btn--nav";
    next.textContent = "Next";
    next.disabled = page === tp;
    next.addEventListener("click", () => {
      page += 1;
      renderPage();
    });
    pagerEl.appendChild(next);
  }

  function renderPage() {
    clampPage();
    tableBody.innerHTML = "";

    if (!items.length) {
      tableBody.innerHTML = `<tr><td colspan="${colSpan}" class="table-empty">${emptyText}</td></tr>`;
      renderPager();
      return;
    }

    const start = (page - 1) * pageSize;
    items.slice(start, start + pageSize).forEach((item) => {
      tableBody.appendChild(renderRow(item));
    });
    renderPager();
  }

  return {
    // Yeni siyahı yükləndikdə (ilk yükləmə/yenilənmə) — 1-ci səhifəyə qayıdır
    setItems(newItems) {
      items = newItems || [];
      page = 1;
      renderPage();
    },
    // Yeni element əlavə olunanda (Create) — 1-ci sırada, 1-ci səhifədə göstərir
    addItem(item) {
      items.unshift(item);
      page = 1;
      renderPage();
    },
    // Mövcud elementi yeniləyir (Update), səhifə dəyişmir
    updateItem(id, patch) {
      const idx = items.findIndex((it) => String(it.id) === String(id));
      if (idx > -1) items[idx] = { ...items[idx], ...patch };
      renderPage();
    },
    // Silinən elementi çıxarır, lazım gələrsə səhifəni geri çəkir
    removeItem(id) {
      items = items.filter((it) => String(it.id) !== String(id));
      renderPage();
    },
    getItems() {
      return items;
    },
  };
}
