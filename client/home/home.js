requireClientAuth();

document.addEventListener("DOMContentLoaded", init);

/* Fisher–Yates — hər dəfə fərqli sıralama üçün */
function shuffle(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function init() {
  const content = document.getElementById("content");
  content.innerHTML = `<p class="empty-state">Yüklənir…</p>`;

  let categories = [];
  try {
    categories = await api.categories();
  } catch (err) {
    content.innerHTML = emptyState(err.message || "Filmlər yüklənmədi.");
    return;
  }

  const withMovies = categories
    .filter((c) => c.movies && c.movies.length)
    .map((c) => Object.assign({}, c, { movies: shuffle(c.movies) }));

  if (!withMovies.length) {
    content.innerHTML = emptyState("Hələ film əlavə olunmayıb.");
    document.getElementById("hero").style.display = "none";
    return;
  }

  renderHero(withMovies);
  renderRows(content, shuffle(withMovies));
}

/* Hər ziyarətdə təsadüfi bir film hero-da göstərilir */
function renderHero(categories) {
  const pool = [];
  categories.forEach((c) => {
    c.movies.forEach((m) => pool.push(Object.assign({}, m, { categoryName: c.name })));
  });
  if (!pool.length) return;

  const best = pool[Math.floor(Math.random() * pool.length)];

  document.getElementById("heroBg").src = best.cover_url || FALLBACK_IMG;
  document.getElementById("heroTag").textContent = best.categoryName;
  document.getElementById("heroRating").innerHTML = starsHtml(best.imdb);
  document.getElementById("heroTitle").textContent = best.title;
  document.getElementById("heroDesc").textContent = best.overview || "";
  document.getElementById("heroWatchBtn").onclick = () => {
    location.href = detailUrl(best.id);
  };
}

function renderRows(content, categories) {
  content.innerHTML = categories
    .map(
      (c) => `
      <section class="movie-row">
        <div class="row-header">
          <h2 class="row-title">
            ${esc(c.name)}
            <img src="${pageUrl("assets/icons/arrow.svg")}" alt="arrow" class="title-arrow" />
          </h2>
        </div>
        <div class="movie-scroll">
          ${c.movies.map(cardHtml).join("")}
        </div>
      </section>`,
    )
    .join("");

  initMovieCards(content);
}
