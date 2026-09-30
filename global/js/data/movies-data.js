/* =========================================================
   Filmalisa — Ortaq film datası + Favorite (localStorage)
   home, search, favourite və detail səhifələri bu fayldan oxuyur.
   Backend hazır olanda MOVIES obyekti API cavabı ilə əvəz olunacaq.
   ========================================================= */

const IMG = "assets/images/";
const ytSearch = (q) =>
  "https://www.youtube.com/results?search_query=" + encodeURIComponent(q + " full movie");

const MOVIES = {
  "lost-in-space": {
    title: "Lost in Space",
    headline: "Have you seen our robot?",
    poster: "lost-in-space-poster.svg",
    cover: "lost-in-space-banner.svg",
    category: "Sci-Fi & Fantasy",
    type: "TV Show",
    status: "Returning Series",
    episodes: "20",
    firstDate: "2018-04-13",
    lastDate: "2019-04-24",
    runtime: "56 min",
    genres: "Action & Adventure, Sci-Fi & Fantasy, Drama",
    rating: 8.1,
    desc: "The mission to save Scarecrow takes an unexpected turn, throwing the Resolute into chaos. Judy hatches a plan to get a ship to Alpha Centauri.",
    watchUrl: ytSearch("Lost in Space"),
    cast: ["Maxwell Jenkins", "Toby Stephens", "Molly Parker", "Taylor Russell"],
    similar: ["wonder-woman", "justice-league", "mortal-kombat"],
  },
  "godzilla-vs-kong": {
    title: "Godzilla vs. Kong",
    poster: "godzilla-vs-kong.svg",
    cover: "godzilla-vs-kong.svg",
    category: "Science Fiction",
    type: "Movie",
    status: "Released",
    episodes: "1",
    firstDate: "2021-03-31",
    lastDate: "2021-03-31",
    runtime: "113 min",
    genres: "Science Fiction, Action",
    rating: 6.3,
    desc: "In a time when monsters walk the Earth, humanity's fight for its future sets Godzilla and Kong on a collision course that will see the two most powerful forces of nature on the planet collide in a spectacular battle for the ages.",
    watchUrl: ytSearch("Godzilla vs Kong"),
    cast: ["Alexander Skarsgård", "Millie Bobby Brown", "Rebecca Hall", "Brian Tyree Henry"],
    similar: ["lost-in-space", "wonder-woman", "mortal-kombat"],
  },
  "wonder-woman": {
    title: "Wonder Woman 1984",
    poster: "wonder-woman.svg",
    cover: "wonder-woman.svg",
    category: "Fantasy",
    type: "Movie",
    status: "Released",
    episodes: "1",
    firstDate: "2020-12-16",
    lastDate: "2020-12-25",
    runtime: "151 min",
    genres: "Action & Adventure, Fantasy",
    rating: 5.4,
    desc: "Diana Prince lives quietly among mortals in the 1980s, but a new threat forces her back into action.",
    watchUrl: ytSearch("Wonder Woman 1984"),
    cast: ["Gal Gadot", "Chris Pine", "Kristen Wiig", "Pedro Pascal"],
    similar: ["justice-league", "mortal-kombat", "the-courier"],
  },
  "justice-league": {
    title: "Zack Snyder's Justice League",
    poster: "justice-league.svg",
    cover: "justice-league.svg",
    category: "Fantasy",
    type: "Movie",
    status: "Released",
    episodes: "1",
    firstDate: "2021-03-18",
    lastDate: "2021-03-18",
    runtime: "242 min",
    genres: "Action, Fantasy",
    rating: 8.0,
    desc: "Bruce Wayne and Diana Prince assemble a team of metahumans to face a world-ending threat.",
    watchUrl: ytSearch("Zack Snyder's Justice League"),
    cast: ["Ben Affleck", "Henry Cavill", "Gal Gadot", "Ezra Miller"],
    similar: ["wonder-woman", "mortal-kombat", "the-courier"],
  },
  "mortal-kombat": {
    title: "Mortal Kombat",
    poster: "mortal-kombat.svg",
    cover: "mortal-kombat.svg",
    category: "Fantasy",
    type: "Movie",
    status: "Released",
    episodes: "1",
    firstDate: "2021-04-07",
    lastDate: "2021-04-23",
    runtime: "110 min",
    genres: "Action, Fantasy",
    rating: 6.1,
    desc: "MMA fighter Cole Young is drawn into a deadly tournament to defend Earthrealm.",
    watchUrl: ytSearch("Mortal Kombat 2021"),
    cast: ["Lewis Tan", "Jessica McNamee", "Josh Lawson", "Tadanobu Asano"],
    similar: ["wonder-woman", "justice-league", "the-courier"],
  },
  "the-courier": {
    title: "The Courier",
    poster: "the-courier.svg",
    cover: "the-courier.svg",
    category: "Drama",
    type: "Movie",
    status: "Released",
    episodes: "1",
    firstDate: "2021-03-19",
    lastDate: "2021-03-19",
    runtime: "112 min",
    genres: "Drama, Thriller",
    rating: 7.1,
    desc: "A British businessman becomes an unlikely spy during the Cold War.",
    watchUrl: ytSearch("The Courier 2020"),
    cast: ["Benedict Cumberbatch", "Merab Ninidze", "Rachel Brosnahan"],
    similar: ["wonder-woman", "justice-league", "mortal-kombat"],
  },
};

/* Yollar: bu fayl global/js/data/ içindədir → kök = "../../../".
   Səhifə hansı qovluqdadır fərqi yoxdur, deploy alt-qovluqda olsa da işləyir. */
const assetUrl = (file) => SITE_ROOT + IMG + file;
const detailUrl = (id) => SITE_ROOT + "client/detail/detail.html?id=" + encodeURIComponent(id);

/* ---------- Favorites ---------- */
const FAV_KEY = "filmalisa-favourites";

function getFavs() {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY)) || [];
  } catch {
    return [];
  }
}
function isFav(id) {
  return getFavs().includes(id);
}
/* true qaytarırsa → favoritə əlavə olundu, false → çıxarıldı */
function toggleFav(id) {
  const favs = getFavs();
  const i = favs.indexOf(id);
  if (i === -1) favs.push(id);
  else favs.splice(i, 1);
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
  return i === -1;
}

/* ---------- Ortaq kart davranışı (home, search, favourite, similar) ----------
   Hər .movie-card:
   - poster üzərinə hover → play ikonu (CSS)
   - klik / Enter → detail.html?id=...
   id posterin fayl adından götürülür: wonder-woman.svg → "wonder-woman" */
function initMovieCards(scope = document) {
  scope.querySelectorAll(".movie-card").forEach((card) => {
    if (card.dataset.ready) return;
    const img = card.querySelector(".poster");
    if (!img) return;
    const id = card.dataset.id || img.getAttribute("src").split("/").pop().replace(/\.\w+$/, "");
    if (!MOVIES[id]) return;

    card.dataset.id = id;
    card.dataset.ready = "1";
    card.classList.add("is-link");
    card.tabIndex = 0;
    card.setAttribute("role", "link");
    card.setAttribute("aria-label", MOVIES[id].title);

    const wrap = card.querySelector(".poster-wrap");
    if (wrap && !wrap.querySelector(".play-hover")) {
      wrap.insertAdjacentHTML("beforeend", '<div class="play-hover"><i class="bi bi-play-fill"></i></div>');
    }

    const go = () => (location.href = detailUrl(id));
    card.addEventListener("click", go);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter") go();
    });
  });
}
