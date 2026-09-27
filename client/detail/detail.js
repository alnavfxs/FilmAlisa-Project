requireClientAuth();

const $ = (id) => document.getElementById(id);
const movieId = new URLSearchParams(location.search).get("id");

let movie = null;

async function init() {
  if (!movieId) return location.replace(pageUrl("client/home/home.html"));

  try {
    movie = await api.movie(movieId);
  } catch (err) {
    toast(err.message || "Film tapılmadı.", "error");
    location.replace(pageUrl("client/home/home.html"));
    return;
  }

  renderInfo();
  setupFavourite();
  setupModal();
  renderSimilar();
  setupComments();
}

function renderInfo() {
  document.title = `filmalisa - ${movie.title}`;

  $("detailCover").src = movie.cover_url || FALLBACK_IMG;
  $("detailPoster").src = movie.cover_url || FALLBACK_IMG;
  $("detailPoster").alt = movie.title;
  $("detailTitle").textContent = movie.title;
  $("detailCategory").textContent = movie.category ? movie.category.name : "";
  $("detailHeadline").textContent = movie.title;
  $("detailDesc").textContent = movie.overview || "";
  $("detailRating").textContent = movie.imdb ?? "—";

  $("metaCategory").textContent = movie.category ? movie.category.name : "—";
  $("metaRuntime").textContent = movie.run_time_min ? `${movie.run_time_min} dəq` : "—";
  $("metaImdb").textContent = movie.imdb ?? "—";
  $("metaAdult").textContent = movie.adult ? "Bəli" : "Xeyr";
  $("metaAdded").textContent = movie.created_at
    ? new Date(movie.created_at).toLocaleDateString()
    : "—";

  $("watchLink").href = movie.watch_url || "#";

  const actors = movie.actors || [];
  $("castList").innerHTML = actors.length
    ? actors
        .map(
          (a) => `
      <div class="cast-item">
        <img src="${esc(a.img_url) || FALLBACK_IMG}" alt="${esc(a.name)} ${esc(a.surname)}" />
        ${esc(a.name)} ${esc(a.surname)}
      </div>`,
        )
        .join("")
    : emptyState("No cast info.");
}

/* + düyməsi → favoritə əlavə / çıxar (real API) */
async function setupFavourite() {
  const btn = $("favBtn");
  let isOn = false;

  const paint = () => {
    btn.classList.toggle("active", isOn);
    btn.querySelector("i").className = isOn ? "bi bi-check-lg" : "bi bi-plus-lg";
    const label = isOn ? "Remove from favourites" : "Add to favourites";
    btn.title = label;
    btn.setAttribute("aria-label", label);
  };

  try {
    const favs = await api.favorites();
    isOn = favs.some((m) => String(m.id) === String(movieId));
  } catch {
    // favorit statusu yüklənməsə də səhifə işləməyə davam etsin
  }
  paint();

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      await api.toggleFavorite(movieId);
      isOn = !isOn;
      paint();
    } catch (err) {
      toast(err.message || "Əməliyyat uğursuz oldu.", "error");
    } finally {
      btn.disabled = false;
    }
  });
}

/* Poster üzərinə klik → preview modal */
function setupModal() {
  const modal = $("modal");
  const open = () => {
    $("modalCover").src = movie.cover_url || FALLBACK_IMG;
    $("modalTitle").textContent = movie.title;
    $("modalWatch").href = movie.watch_url || "#";
    modal.hidden = false;
    $("modalClose").focus();
  };
  const close = () => {
    modal.hidden = true;
    $("posterBtn").focus();
  };

  $("posterBtn").addEventListener("click", open);
  $("modalClose").addEventListener("click", close);
  modal.addEventListener("click", (e) => e.target === modal && close());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) close();
  });
}

/* Eyni kateqoriyadan digər filmlər */
async function renderSimilar() {
  const list = $("similarList");
  if (!movie.category) {
    list.innerHTML = emptyState("No similar movies.");
    return;
  }
  try {
    const categories = await api.categories();
    const cat = categories.find((c) => c.id === movie.category.id);
    const similar = (cat?.movies || []).filter((m) => String(m.id) !== String(movieId));
    list.innerHTML = similar.length
      ? similar.map(cardHtml).join("")
      : emptyState("No similar movies.");
    initMovieCards(list);
  } catch {
    list.innerHTML = emptyState("Could not load similar movies.");
  }
}

/* Şərhlər (real API) */
function setupComments() {
  function render(comments) {
    $("commentList").innerHTML = comments.length
      ? comments
          .map(
            (c) => `
        <div class="comment">
          <div class="comment-head"><span>${
            c.created_at ? new Date(c.created_at).toLocaleString() : ""
          }</span></div>
          <p>${esc(c.comment)}</p>
        </div>`,
          )
          .join("")
      : emptyState("No comments yet.");
  }

  async function reload() {
    try {
      render(await api.comments(movieId));
    } catch {
      $("commentList").innerHTML = emptyState("Comments could not be loaded.");
    }
  }

  $("commentForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = $("commentInput");
    const text = input.value.trim();
    if (!text) return;
    try {
      await api.addComment(movieId, text);
      input.value = "";
      reload();
    } catch (err) {
      toast(err.message || "Şərh göndərilmədi.", "error");
    }
  });

  reload();
}

init();
