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
  /* Kateqoriyalar film sayına görə çoxdan aza doğru sıralanır (bərabər olanda ada görə) */
  const sorted = withMovies
    .slice()
    .sort(
      (a, b) =>
        b.movies.length - a.movies.length ||
        String(a.name).localeCompare(String(b.name)),
    );
  renderRows(content, sorted);
}

/* Hero: təsadüfi 4 film avtomatik slayd kimi dəyişir.
   Vaxtı sadə taymer idarə edir; mouse üstünə gələndə də dayanmır. */
const HERO_SLIDE_COUNT = 4;
const HERO_INTERVAL_MS = 3000;

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
      (m, i) => `
      <div class="hero-slide">
        <img class="hero-bg" src="${esc(m.cover_url || FALLBACK_IMG)}" alt=""
             decoding="async"${i === 0 ? ' fetchpriority="high"' : ""}
             onerror="this.onerror=null;this.src=FALLBACK_IMG" />
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

  /* Tək film varsa slayd lazım deyil */
  if (picks.length === 1) {
    current = 0;
    slideEls[0].classList.add("is-active");
    setText(picks[0]);
    return;
  }

  function show(i) {
    const isFirst = current === -1;
    current = i;

    slideEls.forEach((el, k) => el.classList.toggle("is-active", k === i));

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

  /* Avtomatik keçid: hər 3 saniyədən bir növbəti slayd */
  let autoTimer = null;
  const stopAuto = () => clearTimeout(autoTimer);
  const startAuto = () => {
    stopAuto();
    autoTimer = setTimeout(() => {
      show((current + 1) % picks.length);
      startAuto();
    }, HERO_INTERVAL_MS);
  };

  /* Tab gizlidirsə dayansın ki, qayıdanda sürətli keçidlər olmasın */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAuto();
    else startAuto();
  });

  show(0);

  /* Bütün şəkillər tam yüklənib dekod olunandan sonra keçid başlasın:
     yarımçıq yüklənmiş (bulanıq/kəsik) şəkil görünməsin */
  const imgs = [...slides.querySelectorAll("img")];
  Promise.allSettled(
    imgs.map((img) => (img.decode ? img.decode() : Promise.resolve())),
  ).then(startAuto);
}

function renderRows(content, categories) {
  content.innerHTML = categories
    .map(
      (c) => `
      <section class="movie-row">
        <div class="row-header">
          <h2 class="row-title">
            ${esc(c.name)}
            <img src="${pageUrl("assets/icons/arrow-neon.svg")}" alt="arrow" class="title-arrow" />
          </h2>
        </div>
        ${sliderHtml(c.movies.map(cardHtml).join(""))}
      </section>`,
    )
    .join("");

  initMovieCards(content);
  content.querySelectorAll(".movie-slider").forEach(initSlider);
}
