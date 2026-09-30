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
  setupHoverPreview();
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

/* Fragman linkini təhlükəsiz player mənbəyinə çevirir.
   Dəstəklənir: youtube.com/watch?v=, youtu.be/, /embed/, /shorts/ və birbaşa .mp4/.webm/.ogg */
function getTrailerSource(url) {
  if (typeof url !== "string" || !url.trim()) return null;
  const value = url.trim();

  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(value)) return { type: "file", src: value };

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null; // yanlış format
  }

  const host = parsed.hostname.replace(/^(www|m)\./, "");
  let id = null;

  if (host === "youtu.be") {
    id = parsed.pathname.slice(1);
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (parsed.pathname === "/watch") id = parsed.searchParams.get("v");
    else id = (parsed.pathname.match(/^\/(?:embed|shorts|v)\/([\w-]{11})/) || [])[1];
  }

  if (!id || !/^[\w-]{11}$/.test(id)) return null;
  return {
    type: "youtube",
    src: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1`,
  };
}

/* Modalın media hissəsini doldurur: fragman varsa video, yoxdursa cover şəkli */
function renderModalMedia(box, trailer) {
  box.replaceChildren();

  if (trailer?.type === "youtube") {
    const frame = document.createElement("iframe");
    frame.src = trailer.src;
    frame.title = `${movie.title} — trailer`;
    frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    box.append(frame);
  } else if (trailer?.type === "file") {
    const video = document.createElement("video");
    video.src = trailer.src;
    video.poster = movie.cover_url || "";
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    box.append(video);
  } else {
    const img = document.createElement("img");
    img.src = movie.cover_url || FALLBACK_IMG;
    img.alt = movie.title;
    box.append(img);
  }
}

/* Poster üzərinə klik → fragman modalı */
function setupModal() {
  const modal = $("modal");
  const media = $("modalMedia");

  /* Modal açıqkən arxa səhifə fokuslanmasın (Tab modaldan çıxmasın) */
  const setPageInert = (on) => {
    [...document.body.children].forEach((el) => {
      if (el === modal || el.tagName === "SCRIPT" || el.classList.contains("toast-container")) return;
      el.inert = on;
    });
  };

  const open = () => {
    const trailer = getTrailerSource(movie.fragman);

    renderModalMedia(media, trailer);
    modal.classList.toggle("has-video", Boolean(trailer));
    $("modalTitle").textContent = movie.title;
    $("modalWatch").href = movie.watch_url || "#";
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

  $("posterBtn").addEventListener("click", open);
  $("modalClose").addEventListener("click", close);
  modal.addEventListener("click", (e) => e.target === modal && close());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) close();
  });
}

/* Hover önizləmə: mouse posterin üstünə gələndə fragman klik etmədən səssiz başlayır,
   çıxanda dayanır. Toxunma cihazlarında poster ekranda görünən kimi səssiz oynayır.
   Klik isə əvvəlki kimi tam modalı açır. */
function setupHoverPreview() {
  const btn = $("posterBtn");
  const trailer = getTrailerSource(movie.fragman);
  if (!trailer) return; // fragman yoxdursa önizləmə də yoxdur

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  let layer = null;
  let timer = null;

  const start = () => {
    if (layer || !modal_isClosed()) return;
    layer = document.createElement("span");
    layer.className = "detail-preview";
    layer.setAttribute("aria-hidden", "true");

    if (trailer.type === "youtube") {
      const id = new URL(trailer.src).pathname.split("/").pop();
      const frame = document.createElement("iframe");
      frame.src =
        `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1` +
        `&playlist=${id}&rel=0&playsinline=1&modestbranding=1&disablekb=1`;
      frame.title = "";
      frame.tabIndex = -1;
      frame.allow = "autoplay; encrypted-media";
      layer.append(frame);
    } else {
      const video = document.createElement("video");
      video.src = trailer.src;
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      video.tabIndex = -1;
      layer.append(video);
    }
    btn.append(layer);
    btn.classList.add("is-previewing");
  };

  const stop = () => {
    clearTimeout(timer);
    if (!layer) return;
    layer.remove(); // iframe/video silinir → oynatma dayanır
    layer = null;
    btn.classList.remove("is-previewing");
  };

  const modal_isClosed = () => $("modal").hidden;

  if (canHover) {
    btn.addEventListener("pointerenter", () => {
      clearTimeout(timer);
      timer = setTimeout(start, 250); // təsadüfi keçişdə yüklənməsin
    });
    btn.addEventListener("pointerleave", stop);
    btn.addEventListener("focus", () => (timer = setTimeout(start, 250)));
    btn.addEventListener("blur", stop);
  } else if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0.6 },
    ).observe(btn);
  }

  btn.addEventListener("click", stop); // modal açılanda səs iki dəfə gəlməsin
  document.addEventListener("visibilitychange", () => document.hidden && stop());
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
