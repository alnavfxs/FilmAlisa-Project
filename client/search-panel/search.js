requireClientAuth();

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  const resultsGrid = document.getElementById("searchResults");

  let allMovies = [];

  function renderResults(list) {
    resultsGrid.innerHTML = list.length
      ? list.map(cardHtml).join("")
      : emptyState("No results found.");
    initMovieCards(resultsGrid);
  }

  function handleSearch() {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
      renderResults(allMovies);
      return;
    }
    const filtered = allMovies.filter((m) =>
      (m.title || "").toLowerCase().includes(query),
    );
    renderResults(filtered);
  }

  async function loadMovies() {
    resultsGrid.innerHTML = `<p class="empty-state">Loading…</p>`;
    try {
      allMovies = await api.movies();
      renderResults(allMovies);
    } catch (err) {
      resultsGrid.innerHTML = emptyState(err.message || "Failed to load movies.");
    }
  }

  // + düyməsi
  searchBtn.addEventListener("click", handleSearch);

  // Enter düyməsi
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSearch();
  });

  // İnput silinərkən bütün siyahı geri qayıtsın
  searchInput.addEventListener("input", () => {
    if (!searchInput.value.trim()) renderResults(allMovies);
  });

  loadMovies();
});
