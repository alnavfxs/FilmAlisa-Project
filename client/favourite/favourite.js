requireClientAuth();

const grid = document.getElementById("movieGrid");

async function renderFavourites() {
  grid.innerHTML = `<p class="empty-state">Loading…</p>`;

  let movies = [];
  try {
    movies = await api.favorites();
  } catch (err) {
    grid.innerHTML = emptyState(err.message || "Failed to load favorites.");
    return;
  }

  if (!movies.length) {
    grid.innerHTML = `
      <p class="empty-state">
        No favourite movies yet. Open a movie and press <strong>+</strong> to add it here.
        <br /><a href="../home/home.html">Browse movies</a>
      </p>`;
    return;
  }

  grid.innerHTML = movies.map(cardHtml).join("");
  initMovieCards(grid);
}

renderFavourites();
// Detail-dən geri qayıdanda (bfcache) siyahı yenilənsin
window.addEventListener("pageshow", renderFavourites);
