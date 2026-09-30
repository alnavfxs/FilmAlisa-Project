requireClientAuth();

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  const resultsGrid = document.getElementById("searchResults");
  const suggestedTitle = document.getElementById("suggestedTitle");

  let allMovies = [];
  let loaded = false; // filmlər gəlməmiş "tapılmadı" səhifəsinə yönləndirməyək
  let searchRequested = false; // sorğu göndərilib, amma filmlər hələ yüklənməyib
  let loadError = ""; // yükləmə uğursuz olubsa, axtarışda bu mesaj göstərilir

  // Grid-in həmin an neçə sütunu var (ekran enindən asılıdır) → dəqiq 1 sıra
  function columnCount() {
    const cols = getComputedStyle(resultsGrid).gridTemplateColumns;
    return Math.max(1, cols && cols !== "none" ? cols.split(" ").length : 1);
  }

  // Sorğu yoxdur: ən yüksək reytinqli filmlərdən 1 sıra təklif göstər
  function renderSuggested() {
    if (!loaded || !allMovies.length) {
      suggestedTitle.hidden = true;
      resultsGrid.innerHTML = "";
      return;
    }
    const top = [...allMovies]
      .sort((a, b) => (Number(b.imdb) || 0) - (Number(a.imdb) || 0))
      .slice(0, columnCount());
    suggestedTitle.hidden = false;
    resultsGrid.innerHTML = top.map(cardHtml).join("");
    initMovieCards(resultsGrid);
  }

  function renderResults(list) {
    suggestedTitle.hidden = true;
    resultsGrid.innerHTML = list.length
      ? list.map(cardHtml).join("")
      : emptyState("No results found.");
    initMovieCards(resultsGrid);
  }

  // Sorğu yoxdursa axtarış nəticəsi yoxdur → yalnız təklif sırası
  function clearResults() {
    renderSuggested();
  }

  function handleSearch() {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
      searchRequested = false;
      clearResults();
      return;
    }

    // Filmlər hələ gəlməyibsə: yüklənmə bitəndə axtarış avtomatik icra olunacaq
    if (!loaded && loadError) {
      suggestedTitle.hidden = true;
      resultsGrid.innerHTML = emptyState(loadError);
      return;
    }
    if (!loaded) {
      searchRequested = true;
      suggestedTitle.hidden = true;
      resultsGrid.innerHTML = `<p class="empty-state">Loading…</p>`;
      return;
    }
    searchRequested = false;
    const filtered = allMovies.filter((m) =>
      (m.title || "").toLowerCase().includes(query),
    );

    /* Heç nə tapılmadısa → 404 səhifəsi (axtarılan söz ilə birlikdə) */
    if (loaded && !filtered.length) {
      const rawQuery = searchInput.value.trim();
      location.href =
        pageUrl("client/404-error/404.html") + "?q=" + encodeURIComponent(rawQuery);
      return;
    }
    renderResults(filtered);
  }

  // Filmlər yüklənir; sorğu yoxdursa təklif sırası, varsa axtarış nəticəsi göstərilir
  async function loadMovies() {
    try {
      allMovies = await api.movies();
      loaded = true;
      if (searchRequested || searchInput.value.trim()) handleSearch();
      else renderSuggested();
    } catch (err) {
      loadError = err.message || "Failed to load movies.";
      if (searchRequested) {
        searchRequested = false;
        suggestedTitle.hidden = true;
        resultsGrid.innerHTML = emptyState(loadError);
      }
    }
  }

  // + düyməsi
  searchBtn.addEventListener("click", handleSearch);

  // Enter düyməsi
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSearch();
  });

  // İnput tam silinəndə nəticə sahəsi yenidən boşalır
  searchInput.addEventListener("input", () => {
    if (!searchInput.value.trim()) {
      searchRequested = false;
      clearResults();
    }
  });

  // Pəncərə ölçüsü dəyişəndə təklif sırası yenidən 1 sıraya uyğunlaşsın
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!searchInput.value.trim() && loaded) renderSuggested();
    }, 150);
  });

  loadMovies();
});
