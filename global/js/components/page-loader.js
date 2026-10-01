/* =========================================================
   Filmalisa — Səhifə yüklənmə ekranı (kino filmi mövzusu)
   <head> daxilində, mümkün qədər tez yüklənməlidir ki, ağ/boş
   ekran görünməsin:
     <script src="../../global/js/components/page-loader.js"></script>

   Nə vaxt gizlənir: səhifə (window load) bitəndə VƏ api.js-dən gedən
   bütün sorğular cavab alanda (PageLoader.begin/end api.js-də çağırılır).
   Səhifədən çıxarkən (başqa səhifəyə keçid) yavaş olarsa yenidən görünür.
   ========================================================= */
(() => {
  if (window.PageLoader) return;

  const MIN_SHOW = 700; // çox sürətli yükləmədə də loader "yanıb-sönməsin"
  const SETTLE = 220; // son sorğudan sonra yeni sorğu gəlməsini gözləyir
  const MAX_WAIT = 15000; // nə olursa olsun, loader əbədi qalmasın
  const LEAVE_DELAY = 180; // keçid bundan tez olsa loader görünmür

  const CSS = `
    html.fa-loading { overflow: hidden; }
    .fa-loader {
      position: fixed; inset: 0; z-index: 2147483000;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 26px; color: #fff;
      background:
        radial-gradient(ellipse at 50% 42%, rgba(15,239,253,.10), transparent 55%),
        radial-gradient(ellipse at 50% 50%, #17171c 0%, #0a0a0d 75%);
      font-family: "Raleway", system-ui, sans-serif;
      opacity: 1; visibility: visible;
      transition: opacity .55s ease, visibility .55s ease;
    }
    .fa-loader.is-hide { opacity: 0; visibility: hidden; pointer-events: none; }
    .fa-loader::after { /* yüngül film dənəsi / vinyetka */
      content: ""; position: absolute; inset: 0; pointer-events: none;
      background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.65) 100%);
    }

    .fa-reel-wrap { position: relative; width: 120px; height: 120px; }
    .fa-reel-wrap::before { /* proyektor işığı */
      content: ""; position: absolute; inset: -30px; border-radius: 50%;
      background: radial-gradient(circle, rgba(15,239,253,.28), transparent 65%);
      animation: faGlow 2.4s ease-in-out infinite;
    }
    .fa-reel { position: relative; width: 100%; height: 100%; animation: faSpin 2.2s linear infinite;
      filter: drop-shadow(0 0 10px rgba(15,239,253,.55)); }

    .fa-brand {
      font-weight: 800; font-size: 26px; letter-spacing: .5em; padding-left: .5em;
      text-transform: uppercase;
      background: linear-gradient(100deg, #8a8a94 20%, #0feffd 45%, #fff 50%, #0feffd 55%, #8a8a94 80%);
      background-size: 250% 100%;
      -webkit-background-clip: text; background-clip: text; color: transparent;
      animation: faShine 2.6s linear infinite;
    }

    .fa-strip { /* perforasiyalı kino lenti + axan işıq */
      position: relative; width: min(260px, 70vw); height: 22px; overflow: hidden;
      background: #15151a; border-radius: 3px;
      box-shadow: 0 0 0 1px rgba(255,255,255,.08), 0 6px 24px rgba(0,0,0,.6);
    }
    .fa-strip::before, .fa-strip::after {
      content: ""; position: absolute; left: 0; right: 0; height: 5px;
      background-image: linear-gradient(90deg, rgba(255,255,255,.78) 0 8px, transparent 8px 16px);
      background-size: 16px 5px; animation: faFilm .9s linear infinite;
    }
    .fa-strip::before { top: 2px; }
    .fa-strip::after { bottom: 2px; }
    .fa-strip i {
      position: absolute; top: 8px; bottom: 8px; left: 0; width: 40%; border-radius: 2px;
      background: linear-gradient(90deg, transparent, #0feffd, transparent);
      box-shadow: 0 0 14px #0feffd; animation: faSweep 1.4s ease-in-out infinite;
    }

    .fa-hint { font-size: 12px; letter-spacing: .28em; text-transform: uppercase; color: #8d8d98;
      min-height: 1em; z-index: 1; }
    .fa-hint::after { content: ""; animation: faDots 1.4s steps(4, end) infinite; }

    @keyframes faSpin { to { transform: rotate(360deg); } }
    @keyframes faGlow { 0%,100% { opacity: .55; transform: scale(.92); } 50% { opacity: 1; transform: scale(1.08); } }
    @keyframes faShine { to { background-position: -250% 0; } }
    @keyframes faFilm { to { background-position-x: -16px; } }
    @keyframes faSweep { 0% { left: -40%; } 100% { left: 100%; } }
    @keyframes faDots { 0% { content: ""; } 25% { content: "."; } 50% { content: ".."; } 75%,100% { content: "..."; } }

    @media (prefers-reduced-motion: reduce) {
      .fa-reel, .fa-brand, .fa-strip::before, .fa-strip::after, .fa-strip i, .fa-hint::after { animation: none; }
      .fa-reel-wrap::before { animation: none; opacity: .8; }
      .fa-strip i { left: 30%; }
      .fa-hint::after { content: "..."; }
      .fa-loader { transition-duration: .01s; }
    }
  `;

  const HINTS = ["Rolling the film", "Preparing the screen", "Dimming the lights", "Setting up the scene"];

  const REEL_SVG = `
    <svg class="fa-reel" viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <circle cx="50" cy="50" r="45" stroke="#0feffd" stroke-width="3"/>
      <circle cx="50" cy="50" r="38" stroke="#0feffd" stroke-opacity=".35" stroke-width="1"/>
      <g fill="#0a0a0d" stroke="#0feffd" stroke-width="2.5">
        <circle cx="50" cy="23" r="9"/><circle cx="73.4" cy="36.5" r="9"/><circle cx="73.4" cy="63.5" r="9"/>
        <circle cx="50" cy="77" r="9"/><circle cx="26.6" cy="63.5" r="9"/><circle cx="26.6" cy="36.5" r="9"/>
      </g>
      <circle cx="50" cy="50" r="8" fill="#0feffd"/>
      <circle cx="50" cy="50" r="3" fill="#0a0a0d"/>
    </svg>`;

  const root = document.documentElement;
  const startedAt = Date.now();
  let pending = 0;
  let loaded = document.readyState === "complete";
  let settleTimer = null;
  let hidden = false;
  let el = null;
  let hintTimer = null;

  const style = document.createElement("style");
  style.textContent = CSS;
  (document.head || root).appendChild(style);

  function build() {
    el = document.createElement("div");
    el.className = "fa-loader";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-label", "Loading");
    el.innerHTML = `
      <div class="fa-reel-wrap">${REEL_SVG}</div>
      <div class="fa-brand">Filmalisa</div>
      <div class="fa-strip"><i></i></div>
      <div class="fa-hint"></div>`;
    root.appendChild(el);
    root.classList.add("fa-loading");

    const hint = el.querySelector(".fa-hint");
    let i = Math.floor(Math.random() * HINTS.length);
    hint.textContent = HINTS[i];
    hintTimer = setInterval(() => {
      i = (i + 1) % HINTS.length;
      hint.textContent = HINTS[i];
    }, 1800);
  }

  function hide() {
    if (hidden || !el) return;
    hidden = true;
    clearInterval(hintTimer);
    el.classList.add("is-hide");
    root.classList.remove("fa-loading");
    const node = el;
    setTimeout(() => node.remove(), 700);
  }

  function check() {
    clearTimeout(settleTimer);
    if (hidden || !loaded || pending > 0) return;
    settleTimer = setTimeout(() => {
      if (pending > 0) return;
      const wait = Math.max(0, MIN_SHOW - (Date.now() - startedAt));
      setTimeout(hide, wait);
    }, SETTLE);
  }

  /* api.js hər sorğuda çağırır; loader gizləndikdən sonra təsiri yoxdur */
  function begin() {
    pending++;
  }
  function end() {
    pending = Math.max(0, pending - 1);
    check();
  }

  build();
  setTimeout(hide, MAX_WAIT);

  if (loaded) check();
  else window.addEventListener("load", () => { loaded = true; check(); }, { once: true });

  /* Başqa səhifəyə keçid yavaş olarsa, loader yenidən görünsün */
  let leaveTimer = null;
  window.addEventListener("beforeunload", () => {
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => {
      if (!el) build();
      else {
        el.classList.remove("is-hide");
        root.classList.add("fa-loading");
        if (!el.isConnected) root.appendChild(el);
      }
      hidden = false;
    }, LEAVE_DELAY);
  });

  /* Geri düyməsi (bfcache) ilə qayıdanda loader qalmasın */
  window.addEventListener("pageshow", (e) => {
    clearTimeout(leaveTimer);
    if (e.persisted) {
      pending = 0;
      hidden = false;
      hide();
    }
  });

  window.PageLoader = { begin, end, hide };
})();
