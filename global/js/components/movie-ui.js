/* =========================================================
   Filmalisa — client kart köməkçiləri (home, search, favourite, detail)
   api.js-dən SONRA yüklənməlidir.
   ========================================================= */

const FALLBACK_IMG =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='292' height='440'><rect width='292' height='440' fill='#1c1c24'/><path d='M116 200h60v60h-60z' fill='#2c2c3a'/></svg>",
  );


/* ===========================================
   FRAGMAN KÖMƏKÇİLƏRİ (kart hover önizləməsi + detail modalı ortaq istifadə edir)
   =========================================== */

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
    id,
    src: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1`,
  };
}

/* Film id → fragman mənbəyi. Siyahı datasında fragman yoxdursa bir dəfə detail sorğusu göndərilir və keşlənir. */
const trailerCache = new Map();
function loadTrailer(id) {
  if (!trailerCache.has(id)) {
    trailerCache.set(
      id,
      api
        .movie(id)
        .then((m) => getTrailerSource(m?.fragman))
        .catch(() => {
          trailerCache.delete(id); // xəta olduqda növbəti hoverdə yenidən cəhd
          return null;
        }),
    );
  }
  return trailerCache.get(id);
}

const canPreview =
  window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* YouTube ilə TCP/TLS əlaqəsini əvvəlcədən qurur → ilk hover-də iframe daha tez açılır */
(function warmUpYoutube() {
  if (!canPreview) return;
  ["https://www.youtube.com", "https://i.ytimg.com", "https://www.google.com"].forEach((href) => {
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = href;
    document.head.append(link);
  });
})();

/* Hover-dən ƏVVƏL fragman linkini hazır saxlayır: kart ekrana girəndə (siyahıda fragman yoxdursa)
   detail sorğusu arxa planda, eyni anda yalnız 2 dənə olmaqla göndərilir. */
const prefetchQueue = [];
let prefetchActive = 0;
function queuePrefetch(id) {
  if (trailerCache.has(id)) return;
  prefetchQueue.push(id);
  runPrefetch();
}
function runPrefetch() {
  while (prefetchActive < 2 && prefetchQueue.length) {
    const id = prefetchQueue.shift();
    if (trailerCache.has(id)) continue;
    prefetchActive++;
    loadTrailer(id).finally(() => {
      prefetchActive--;
      runPrefetch();
    });
  }
}

const prefetchObserver =
  "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            prefetchObserver.unobserve(entry.target);
            queuePrefetch(entry.target.dataset.id);
          });
        },
        { rootMargin: "200px" },
      )
    : null;

const PREVIEW_DELAY = 120; // ms — təsadüfi keçişdə yüklənməsin, amma hiss olunan gecikmə də olmasın

/* YouTube iframe-i həqiqətən oynamağa başlayanda xəbər verir (postMessage) */
function onYoutubePlaying(frame, callback) {
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    window.removeEventListener("message", onMessage);
    callback();
  };
  const onMessage = (e) => {
    if (e.source !== frame.contentWindow || typeof e.data !== "string") return;
    try {
      const data = JSON.parse(e.data);
      const state = data.info && typeof data.info === "object" ? data.info.playerState : data.info;
      if (data.event === "onStateChange" ? data.info === 1 : state === 1) finish();
    } catch {
      /* YouTube-un başqa mesajları */
    }
  };
  window.addEventListener("message", onMessage);
  frame.addEventListener("load", () => {
    frame.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1 }), "*");
  });
  setTimeout(finish, 2500); // ehtiyat: mesaj gəlməsə də önizləmə göstərilsin
  return () => {
    done = true;
    window.removeEventListener("message", onMessage);
  };
}

/* Kartın üzərinə gələndə fragman səssiz başlayır; kursor çıxanda poster əvvəlki vəziyyətinə qayıdır.
   Klik edilməyibsə və ya kursor tez keçibsə heç nə yüklənmir. */
function initCardPreview(card, wrap) {
  if (!canPreview || !wrap) return;

  let layer = null;
  let timer = null;
  let run = 0; // köhnə (gec cavab verən) sorğu nəticəsini ləğv etmək üçün
  let cleanup = null;

  const stop = () => {
    clearTimeout(timer);
    run++;
    cleanup?.();
    cleanup = null;
    if (layer) {
      layer.remove(); // iframe/video silinir → oynatma dayanır
      layer = null;
    }
    wrap.classList.remove("is-previewing");
  };

  const start = async () => {
    const my = ++run;
    const direct = getTrailerSource(card.dataset.trailer);
    const trailer = direct || (await loadTrailer(card.dataset.id));
    if (my !== run || !trailer || layer) return;

    layer = document.createElement("div");
    layer.className = "card-preview";
    layer.setAttribute("aria-hidden", "true");

    const ready = () => {
      if (my !== run || !layer) return;
      layer.classList.add("is-ready");
      wrap.classList.add("is-previewing");
    };

    if (trailer.type === "youtube") {
      const frame = document.createElement("iframe");
      const origin = /^https?:$/.test(location.protocol) ? `&origin=${encodeURIComponent(location.origin)}` : "";
      frame.src =
        `https://www.youtube.com/embed/${trailer.id}?autoplay=1&mute=1&controls=0&loop=1` +
        `&playlist=${trailer.id}&rel=0&playsinline=1&modestbranding=1&disablekb=1&iv_load_policy=3` +
        `&enablejsapi=1${origin}`;
      frame.title = "";
      frame.tabIndex = -1;
      frame.allow = "autoplay; encrypted-media";
      cleanup = onYoutubePlaying(frame, ready); // qara kadr yox, real oynama başlayanda görünür
      layer.append(frame);
    } else {
      const video = document.createElement("video");
      video.src = trailer.src;
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      video.tabIndex = -1;
      video.addEventListener("playing", ready);
      layer.append(video);
      video.play?.().catch(() => {});
    }

    const overlay = wrap.querySelector(".poster-overlay");
    wrap.insertBefore(layer, overlay); // başlıq və ulduzlar trailerin üstündə qalır
  };

  card.addEventListener("pointerenter", () => {
    clearTimeout(timer);
    if (!card.dataset.trailer) loadTrailer(card.dataset.id); // link sorğusu gözləmədən başlasın
    timer = setTimeout(start, PREVIEW_DELAY);
  });
  card.addEventListener("pointerleave", stop);
  card.addEventListener("pointerdown", stop); // klik / dartma başlayanda dayansın
  document.addEventListener("visibilitychange", () => document.hidden && stop());
}

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
    <div class="movie-card" data-id="${esc(m.id)}"${m.fragman ? ` data-trailer="${esc(m.fragman)}"` : ""}>
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

/* Hover → tilt + trailer önizləmə, klik / Enter / Space → detail səhifəsi.
   { preview: false } → hover-də trailer önizləməsi olmasın (detail səhifəsindəki oxşar filmlər) */
function initMovieCards(scope = document, { preview = true } = {}) {
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

    if (preview) {
      initCardPreview(card, wrap);
      if (canPreview && !card.dataset.trailer) prefetchObserver?.observe(card);
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
