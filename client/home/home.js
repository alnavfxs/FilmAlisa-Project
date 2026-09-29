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
  content.innerHTML = `<p class="empty-state">Loading…</p>`;

  let categories = [];
  try {
    categories = await api.categories();
  } catch (err) {
    content.innerHTML = emptyState(err.message || "Failed to load movies.");
    document.getElementById("hero").style.display = "none"; // boş 700px hero qalmasın
    return;
  }

  const withMovies = categories
    .filter((c) => c.movies && c.movies.length)
    .map((c) => Object.assign({}, c, { movies: shuffle(c.movies) }));

  if (!withMovies.length) {
    content.innerHTML = emptyState("No movies added yet.");
    document.getElementById("hero").style.display = "none";
    return;
  }

  renderHero(withMovies);
  renderRows(content, shuffle(withMovies));
}

/* Hero: təsadüfi 4 film avtomatik slayd kimi dəyişir.
   Vaxtı progress zolağının CSS animasiyası idarə edir (animationend → növbəti slayd),
   ona görə hover-də dayandırmaq və dot-a klikləmək sinxron qalır. */
const HERO_SLIDE_COUNT = 4;
const HERO_INTERVAL_MS = 2000;

function renderHero(categories) {
  const byId = new Map();
  categories.forEach((c) => {
    c.movies.forEach((m) => {
      if (!byId.has(m.id)) byId.set(m.id, Object.assign({}, m, { categoryName: c.name }));
    });
  });
  const picks = shuffle([...byId.values()]).slice(0, HERO_SLIDE_COUNT);
  if (!picks.length) return;

  const hero = document.getElementById("hero");
  const overlay = hero.querySelector(".hero-overlay");
  hero.style.setProperty("--hero-interval", `${HERO_INTERVAL_MS}ms`);

  /* Hər film üçün ayrıca arxa plan qatı → crossfade */
  document.getElementById("heroBg").remove();
  const slides = document.createElement("div");
  slides.className = "hero-slides";
  slides.innerHTML = picks
    .map(
      (m) => `
      <div class="hero-slide">
        <img class="hero-bg" src="${esc(m.cover_url || FALLBACK_IMG)}" alt="" />
      </div>`,
    )
    .join("");
  hero.prepend(slides);
  const slideEls = [...slides.children];

  let current = -1;
  let textTimer = null;

  const setText = (m) => {
    document.getElementById("heroTag").textContent = m.categoryName;
    const rating = document.getElementById("heroRating");
    rating.innerHTML = starsHtml(m.imdb);
    rating.setAttribute("role", "img");
    rating.setAttribute("aria-label", ratingLabel(m.imdb));
    document.getElementById("heroTitle").textContent = m.title;
    document.getElementById("heroDesc").textContent = m.overview || "";
  };

  document.getElementById("heroWatchBtn").onclick = () => {
    location.href = detailUrl(picks[current].id);
  };

  /* Tək film varsa slayd / dot lazım deyil */
  if (picks.length === 1) {
    current = 0;
    slideEls[0].classList.add("is-active");
    setText(picks[0]);
    return;
  }

  const dots = document.createElement("div");
  dots.className = "hero-dots";
  dots.innerHTML = picks
    .map(
      (m) =>
        `<button type="button" class="hero-dot" aria-label="Show ${esc(m.title)}"><span></span></button>`,
    )
    .join("");
  hero.append(dots);
  const dotEls = [...dots.children];

  function show(i) {
    const isFirst = current === -1;
    current = i;

    slideEls.forEach((el, k) => el.classList.toggle("is-active", k === i));
    dotEls.forEach((el, k) => {
      el.classList.toggle("is-active", k === i);
      el.classList.toggle("is-done", k < i);
      el.setAttribute("aria-current", k === i ? "true" : "false");
    });

    clearTimeout(textTimer);
    if (isFirst) {
      setText(picks[i]);
    } else {
      overlay.classList.add("is-changing");
      textTimer = setTimeout(() => {
        setText(picks[i]);
        overlay.classList.remove("is-changing");
      }, 250);
    }
  }

  dotEls.forEach((dot, k) => {
    dot.addEventListener("click", () => k !== current && show(k));
    dot.firstElementChild.addEventListener("animationend", () => {
      if (k === current) show((current + 1) % picks.length);
    });
  });

  show(0);
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
        <div class="movie-slider">
          <button type="button" class="slider-btn slider-btn--prev" aria-label="Previous movies" hidden>
            <i class="bi bi-chevron-left"></i>
          </button>
          <div class="movie-scroll">
            ${c.movies.map(cardHtml).join("")}
          </div>
          <button type="button" class="slider-btn slider-btn--next" aria-label="Next movies" hidden>
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </section>`,
    )
    .join("");

  initMovieCards(content);
  content.querySelectorAll(".movie-slider").forEach(initSlider);
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
