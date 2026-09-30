/* =========================================================
   Filmalisa — client kart köməkçiləri (home, search, favourite, detail)
   api.js-dən SONRA yüklənməlidir.
   ========================================================= */

const FALLBACK_IMG =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='292' height='440'><rect width='292' height='440' fill='#1c1c24'/><path d='M116 200h60v60h-60z' fill='#2c2c3a'/></svg>",
  );

const detailUrl = (id) => pageUrl("client/detail/detail.html?id=" + encodeURIComponent(id));

/* imdb (0–10) → 0–5 ulduz */
const starCount = (imdb) => Math.max(0, Math.min(5, Math.round(Number(imdb) / 2) || 0));

/* Ulduzlar bəzəkdir (alt=""); məna ekran oxuyucuya konteynerin aria-label-ı ilə verilir */
function starsHtml(imdb) {
  const star = `<img src="${pageUrl("assets/icons/star.svg")}" alt="" class="star-icon" />`;
  return star.repeat(starCount(imdb));
}

const ratingLabel = (imdb) => `Rating: ${starCount(imdb)} out of 5`;

function cardHtml(m) {
  const category = m.category?.name ? `<span class="category-tag">${esc(m.category.name)}</span>` : "";
  return `
    <div class="movie-card" data-id="${esc(m.id)}">
      <div class="poster-wrap">
        <img src="${esc(m.cover_url)}" alt="${esc(m.title)}" class="poster" loading="lazy"
             onerror="this.onerror=null;this.src=FALLBACK_IMG" />
        <div class="poster-overlay">
          ${category}
          <div class="rating" role="img" aria-label="${ratingLabel(m.imdb)}">${starsHtml(m.imdb)}</div>
          <h3 class="movie-title">${esc(m.title)}</h3>
        </div>
      </div>
    </div>`;
}

const canTilt = window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Hover → tilt + play ikonu, klik / Enter / Space → detail səhifəsi */
function initMovieCards(scope = document) {
  scope.querySelectorAll(".movie-card[data-id]").forEach((card) => {
    if (card.dataset.ready) return;
    card.dataset.ready = "1";
    card.classList.add("is-link");
    card.tabIndex = 0;
    card.setAttribute("role", "link");

    const wrap = card.querySelector(".poster-wrap");
    if (wrap && !wrap.querySelector(".play-hover")) {
      wrap.insertAdjacentHTML("beforeend", '<div class="play-hover"><i class="bi bi-play-fill"></i></div>');
    }

    /* Kursoru izləyən 3D tilt + spotlight (yalnız mouse, animasiya azaldılmayıbsa) */
    if (wrap && canTilt) {
      const setTilt = (rx, ry, mx, my) => {
        wrap.style.setProperty("--rx", rx);
        wrap.style.setProperty("--ry", ry);
        wrap.style.setProperty("--mx", mx);
        wrap.style.setProperty("--my", my);
      };
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect(); // card özü fırlanmır → sabit ölçü
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        setTilt(`${((0.5 - y) * 9).toFixed(2)}deg`, `${((x - 0.5) * 11).toFixed(2)}deg`, `${(x * 100).toFixed(1)}%`, `${(y * 100).toFixed(1)}%`);
      });
      card.addEventListener("pointerleave", () => setTilt("0deg", "0deg", "50%", "50%"));
    }

    const go = () => (location.href = detailUrl(card.dataset.id));
    card.addEventListener("click", go);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault(); // Space səhifəni sürüşdürməsin
        go();
      }
    });
  });
}

/* Slider sarğısı: ox düymələri + kartlar. home və detail eyni markup-dan istifadə edir. */
function sliderHtml(cardsHtml, trackClass = "") {
  return `
    <div class="movie-slider">
      <button type="button" class="slider-btn slider-btn--prev" aria-label="Previous movies" hidden>
        <i class="bi bi-chevron-left"></i>
      </button>
      <div class="movie-scroll ${trackClass}">${cardsHtml}</div>
      <button type="button" class="slider-btn slider-btn--next" aria-label="Next movies" hidden>
        <i class="bi bi-chevron-right"></i>
      </button>
    </div>`;
}

/* Sətir slider-i: ox düymələri (desktop), mouse ilə dartma, mobildə swipe */
function initSlider(slider) {
  const track = slider.querySelector(".movie-scroll");
  const prev = slider.querySelector(".slider-btn--prev");
  const next = slider.querySelector(".slider-btn--next");

  /* Başa/sona çatanda uyğun ox gizlənir; bütün filmlər sığırsa hər iki ox gizli qalır */
  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    prev.hidden = track.scrollLeft <= 4;
    next.hidden = track.scrollLeft >= max - 4;
  };

  /* Bir klik = görünən sahənin ~90%-i qədər sürüşmə */
  const page = (dir) =>
    track.scrollBy({ left: dir * track.clientWidth * 0.9, behavior: "smooth" });

  prev.addEventListener("click", () => page(-1));
  next.addEventListener("click", () => page(1));
  track.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);

  /* Mouse ilə dartma (touch cihazlarda brauzerin öz swipe-ı işləyir) */
  let dragging = false;
  let moved = false;
  let startX = 0;
  let startScroll = 0;

  track.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    dragging = true;
    moved = false;
    startX = e.clientX;
    startScroll = track.scrollLeft;
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) > 5) {
      moved = true;
      track.classList.add("is-dragging");
    }
    if (moved) track.scrollLeft = startScroll - dx;
  });

  window.addEventListener("mouseup", () => {
    dragging = false;
    track.classList.remove("is-dragging");
  });

  /* Dartmadan sonra kartın klikini (detail səhifəsinə keçid) dayandır */
  track.addEventListener(
    "click",
    (e) => {
      if (!moved) return;
      e.preventDefault();
      e.stopPropagation();
      moved = false;
    },
    true,
  );

  track.addEventListener("dragstart", (e) => e.preventDefault());

  update();
}

/* text server xətası da ola bilər → həmişə escape edilir */
function emptyState(text) {
  return `<p class="empty-state">${esc(text)}</p>`;
}
