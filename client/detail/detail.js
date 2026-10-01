requireClientAuth();

const $ = (id) => document.getElementById(id);
/* id yalnız hərf/rəqəm/-/_ ola bilər ("../admin/users" kimi dəyərlər rədd edilir) */
const rawId = new URLSearchParams(location.search).get("id");
const movieId = rawId && /^[\w-]+$/.test(rawId) ? rawId : null;

let movie = null;

async function init() {
  if (!movieId) return location.replace(pageUrl("client/home/home.html"));

  try {
    movie = await api.movie(movieId);
  } catch (err) {
    toast(err.message || "Movie not found.", "error");
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
  $("metaRuntime").textContent = movie.run_time_min ? `${movie.run_time_min} min` : "—";
  $("metaImdb").textContent = movie.imdb ?? "—";
  $("metaAdult").textContent = movie.adult ? "Yes" : "No";
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
      toast(err.message || "Operation failed.", "error");
    } finally {
      btn.disabled = false;
    }
  });
}

/* Modal açılanda yalnız cover şəkli + böyük Play düyməsi görünür (fragman hələ yüklənmir) */
function renderModalCover(box, canPlay, onPlay) {
  box.replaceChildren();

  const img = document.createElement("img");
  img.src = movie.cover_url || FALLBACK_IMG;
  img.alt = movie.title;
  box.append(img);

  if (canPlay) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "modal-play-overlay";
    btn.setAttribute("aria-label", `Play ${movie.title} trailer`);
    btn.innerHTML = '<i class="bi bi-play-fill"></i>';
    btn.addEventListener("click", onPlay);
    box.append(btn);
  }
}

/* Fragmanı yalnız Play basılandan sonra yükləyir və oynadır */
function renderModalTrailer(box, trailer) {
  box.replaceChildren();

  if (trailer.type === "youtube") {
    const frame = document.createElement("iframe");
    frame.src = trailer.src; // autoplay=1 → istifadəçi klikindən sonra səslə başlayır
    frame.title = `${movie.title} — trailer`;
    frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    box.append(frame);
  } else {
    const video = document.createElement("video");
    video.src = trailer.src;
    video.poster = movie.cover_url || "";
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    box.append(video);
    video.play?.().catch(() => {});
  }
}

/* Poster üzərinə klik → modal açılır, fragman isə yalnız Play-dən sonra oynayır */
function setupModal() {
  const modal = $("modal");
  const media = $("modalMedia");
  const playBtn = $("modalPlay");
  let trailer = null;

  /* Modal açıqkən arxa səhifə fokuslanmasın (Tab modaldan çıxmasın) */
  const setPageInert = (on) => {
    [...document.body.children].forEach((el) => {
      if (el === modal || el.tagName === "SCRIPT" || el.classList.contains("toast-container")) return;
      el.inert = on;
    });
  };

  /* Play: fragman varsa oynat; yoxdursa film linkini yeni tabda aç */
  const play = () => {
    if (trailer) {
      if (!media.querySelector("iframe, video")) renderModalTrailer(media, trailer);
      return;
    }
    if (movie.watch_url) window.open(movie.watch_url, "_blank", "noopener,noreferrer");
    else toast("No trailer or watch link for this movie.", "error");
  };

  const open = () => {
    trailer = getTrailerSource(movie.fragman);

    renderModalCover(media, Boolean(trailer), play);
    modal.classList.toggle("has-video", Boolean(trailer));
    $("modalTitle").textContent = movie.title;
    modal.hidden = false;
    setPageInert(true);
    $("modalClose").focus();
  };

  const close = () => {
    media.replaceChildren(); // iframe/video silinir → səs və video dayanır
    modal.hidden = true;
    setPageInert(false);
    $("posterBtn").focus();
  };

  playBtn.addEventListener("click", play);
  $("posterBtn").addEventListener("click", open);
  $("modalClose").addEventListener("click", close);
  modal.addEventListener("click", (e) => e.target === modal && close());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) close();
  });
}

/* Eyni kateqoriyadan digər filmlər — home-dakı kimi slider (scrollbar yox, ox düymələri + drag/swipe) */
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
    if (!similar.length) {
      list.innerHTML = emptyState("No similar movies.");
      return;
    }
    list.innerHTML = sliderHtml(similar.map(cardHtml).join(""), "movie-scroll-large");
    initMovieCards(list);
    initSlider(list.querySelector(".movie-slider"));
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
      toast(err.message || "Comment could not be sent.", "error");
    }
  });

  reload();
}

init();
