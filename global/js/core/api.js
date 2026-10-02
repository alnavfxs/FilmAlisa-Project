/* =========================================================
   Filmalisa — API qatı
   Bütün səhifələr fetch-i birbaşa yox, bu fayldan istifadə edir:
   base URL, token, xəta idarəsi, login/logout, qoruma (requireAuth).
   Səhifədən ƏVVƏL yüklənməlidir:
   <script src="../../global/js/core/api.js"></script>

   Məzmun:
   1. Konfiqurasiya (API_BASE, SITE_ROOT, TOKEN_KEY...)
   2. Sessiya köməkçiləri (getToken, saveSession, logout, requireAuth...)
   3. Ortaq UI köməkçiləri (esc, toast, confirmDialog, formatDate)
   4. Əsas sorğu funksiyası (apiRequest)
   5. Endpoint-lər (api.* / api.admin.*)
   ========================================================= */

/* ===========================================
   1. KONFİQURASİYA
   =========================================== */
const API_BASE = "https://api.sarkhanrahimli.dev/api/filmalisa";

// global/js/core/ içindədir → kök = "../../../" (alt-qovluqda deploy olunsa da işləyir)
const SITE_ROOT = new URL("../../../", document.currentScript.src).href;
const pageUrl = (path) => SITE_ROOT + path;

const LOGIN_PAGE = {
  client: "client/login/login.html",
  admin: "admin/admin_panel/admin_panel.html",
};
const REGISTER_PAGE = "client/register/register.html";
const TOKEN_KEY = { client: "filmalisa-token", admin: "filmalisa-admin-token" };
const PROFILE_KEY = { client: "filmalisa-profile", admin: "filmalisa-admin-profile" };

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/* ===========================================
   2. SESSİYA KÖMƏKÇİLƏRİ
   =========================================== */
const getToken = (role) => localStorage.getItem(TOKEN_KEY[role]);

function getProfile(role = "client") {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY[role]));
  } catch {
    return null;
  }
}

/* Profil şəkli brauzerin yaddaşında saxlanılır (email-ə görə) —
   logout/login etsən də, server img_url saxlamasa da itmir. */
const avatarKey = (email) => "filmalisa-avatar:" + String(email || "").toLowerCase();
const getLocalAvatar = (email) => localStorage.getItem(avatarKey(email)) || "";
const AVATAR_LAST_KEY = "filmalisa-avatar:last";
function setLocalAvatar(email, dataUrl) {
  try {
    if (dataUrl) {
      localStorage.setItem(avatarKey(email), dataUrl);
      localStorage.setItem(AVATAR_LAST_KEY, dataUrl); // ehtiyat: email uyğunlaşmasa belə tapılsın
    } else {
      localStorage.removeItem(avatarKey(email));
      localStorage.removeItem(AVATAR_LAST_KEY);
    }
  } catch (e) {
    console.error("[avatar] yaddaşa yazıla bilmədi:", e);
  }
}
/* Header/landing üçün: yerli şəkil → server img_url → boş */
function resolveAvatar(profile) {
  if (!profile) return "";
  return profile.avatar_local || getLocalAvatar(profile.email) || localStorage.getItem(AVATAR_LAST_KEY) || profile.img_url || "";
}

function saveSession(role, data) {
  localStorage.setItem(TOKEN_KEY[role], data.tokens.access_token);
  localStorage.setItem(PROFILE_KEY[role], JSON.stringify(data.profile));
}

function logout(role, redirect = true) {
  localStorage.removeItem(TOKEN_KEY[role]);
  localStorage.removeItem(PROFILE_KEY[role]);
  if (redirect) location.href = pageUrl(LOGIN_PAGE[role]);
}

/* Token yoxdursa login səhifəsinə göndərir */
function requireAuth(role) {
  if (getToken(role)) return true;
  location.replace(pageUrl(LOGIN_PAGE[role]));
  return false;
}

/* Client səhifələri (home, detail, favourite, account...) üçün qoruma.
   Qeydiyyatsız/token-siz ziyarətçi login-ə yox, birbaşa register-ə göndərilir. */
function requireClientAuth() {
  if (getToken("client")) return true;
  location.replace(pageUrl(REGISTER_PAGE));
  return false;
}

/* ===========================================
   3. ORTAQ UI KÖMƏKÇİLƏRİ
   =========================================== */
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function toastContainer() {
  let el = document.querySelector(".toast-container");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast-container";
    document.body.appendChild(el);
  }
  return el;
}

function toast(message, type = "error") {
  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  el.setAttribute("role", "status");
  el.innerHTML =
    '<span class="toast__icon" aria-hidden="true"></span>' +
    '<span class="toast__message"></span>' +
    '<button class="toast__close" type="button" aria-label="Close">&times;</button>';
  el.querySelector(".toast__message").textContent = message;

  const remove = () => el.remove();
  el.querySelector(".toast__close").addEventListener("click", remove);

  toastContainer().appendChild(el);
  setTimeout(remove, 4000);
}

/* Parol göstər/gizlət düyməsi — login, register və admin login üçün ortaq */
function setupPasswordToggle(btn, input, activeClass) {
  if (!btn || !input) return;
  btn.addEventListener("click", () => {
    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";
    btn.classList.toggle(activeClass, isHidden);
  });
}

/* Dizaynlı təsdiq pəncərəsi — window.confirm() əvəzinə.
   confirmDialog("Are you sure you want to delete this?", { danger: true }).then(ok => ...) */
function confirmDialog(message, opts = {}) {
  const {
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    danger = false,
  } = opts;

  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-box" role="alertdialog" aria-modal="true">
        <div class="confirm-box__icon${danger ? " confirm-box__icon--danger" : ""}" aria-hidden="true"></div>
        <p class="confirm-box__message"></p>
        <div class="confirm-box__actions">
          <button type="button" class="confirm-box__btn confirm-box__btn--cancel"></button>
          <button type="button" class="confirm-box__btn confirm-box__btn--ok${danger ? " confirm-box__btn--danger" : ""}"></button>
        </div>
      </div>`;

    overlay.querySelector(".confirm-box__message").textContent = message;
    overlay.querySelector(".confirm-box__btn--cancel").textContent = cancelLabel;
    overlay.querySelector(".confirm-box__btn--ok").textContent = confirmLabel;

    function settle(result) {
      document.removeEventListener("keydown", onKeydown);
      overlay.classList.remove("confirm-overlay--active");
      setTimeout(() => overlay.remove(), 180);
      resolve(result);
    }

    function onKeydown(e) {
      if (e.key === "Escape") settle(false);
    }

    overlay.querySelector(".confirm-box__btn--cancel").addEventListener("click", () => settle(false));
    overlay.querySelector(".confirm-box__btn--ok").addEventListener("click", () => settle(true));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) settle(false);
    });
    document.addEventListener("keydown", onKeydown);

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("confirm-overlay--active"));
  });
}

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/* ===========================================
   4. ƏSAS SORĞU FUNKSİYASI
   =========================================== */
async function apiRequest(path, opts) {
  window.PageLoader?.begin(); // yüklənmə ekranı sorğular bitənə qədər qalır
  try {
    return await apiRequestRaw(path, opts);
  } finally {
    window.PageLoader?.end();
  }
}

async function apiRequestRaw(path, { method = "GET", body, role, auth = true } = {}) {
  role = role || (path.startsWith("/admin") ? "admin" : "client");

  const headers = { Accept: "application/json", "Accept-Language": "en" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken(role);
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  const url = API_BASE + path;
  console.log(`[Filmalisa API] → ${method} ${url}`);
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    // Əsl səbəb (CORS / DNS / mixed-content / server tamam əlçatmazdır) brauzerin
    // Console-unda görünür — burada raw xətanı çap edirik ki, itməsin.
    console.error(`[Filmalisa API] ✕ ${method} ${url} — fetch failed:`, networkErr);
    const hint =
      location.protocol === "file:"
        ? "Could not connect to the server. Open the file through a local server (e.g. VS Code Live Server), not file://."
        : "Could not connect to the server. Check your internet connection and try again.";
    throw new ApiError(hint, 0);
  }
  console.log(`[Filmalisa API] ← ${res.status} ${method} ${url}`);

  let json = null;
  try {
    json = await res.json();
  } catch {
    /* boş cavab */
  }

  // Token bitib / yanlışdır → login-ə qaytar
  if (res.status === 401 && auth && token) {
    logout(role);
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  if (!res.ok || (json && json.result === false)) {
    console.error(`[Filmalisa API] ✕ ${method} ${url} responded ${res.status}:`, json);
    throw new ApiError((json && json.message) || `Request failed (${res.status})`, res.status);
  }
  return json ? json.data : null;
}

/* ===========================================
   5. ENDPOINT-LƏR (Postman kolleksiyasına görə)
   =========================================== */
const api = {
  /* Auth */
  async login(email, password) {
    const data = await apiRequest("/auth/login", { method: "POST", body: { email, password }, role: "client", auth: false });
    // Server profilində email/şəkil olmaya bilər → yazılan email ilə yerli şəkli bərpa et
    data.profile = { ...(data.profile || {}) };
    data.profile.email = data.profile.email || email;
    const localAvatar = getLocalAvatar(data.profile.email) || getLocalAvatar(email) || localStorage.getItem(AVATAR_LAST_KEY) || "";
    if (localAvatar) data.profile.avatar_local = localAvatar;
    saveSession("client", data);
    return data.profile;
  },
  async adminLogin(email, password) {
    const data = await apiRequest("/auth/admin/login", { method: "POST", body: { email, password }, role: "admin", auth: false });
    saveSession("admin", data);
    return data.profile;
  },
  signup: (full_name, email, password) =>
    apiRequest("/auth/signup", { method: "POST", body: { full_name, email, password }, role: "client", auth: false }),

  /* Client */
  profile: () => apiRequest("/profile", { role: "client" }),
  updateProfile: (body) => apiRequest("/profile", { method: "PUT", body, role: "client" }),
  categories: () => apiRequest("/categories"),
  movies: () => apiRequest("/movies"),
  movie: (id) => apiRequest(`/movies/${id}`),
  favorites: () => apiRequest("/movies/favorites"),
  toggleFavorite: (id) => apiRequest(`/movie/${id}/favorite`, { method: "POST" }), // əlavə edir / çıxarır
  comments: (id) => apiRequest(`/movies/${id}/comments`),
  addComment: (id, comment) => apiRequest(`/movies/${id}/comment`, { method: "POST", body: { comment } }),
  removeComment: (id, commentId) => apiRequest(`/movies/${id}/comment/${commentId}`, { method: "DELETE" }),
  sendContact: (body) => apiRequest("/contact", { method: "POST", body, role: "client" }),

  /* Admin */
  admin: {
    profile: () => apiRequest("/profile", { role: "admin" }),
    dashboard: () => apiRequest("/admin/dashboard"),
    users: () => apiRequest("/admin/users"),

    categories: () => apiRequest("/admin/categories"),
    createCategory: (name) => apiRequest("/admin/category", { method: "POST", body: { name } }),
    updateCategory: (id, name) => apiRequest(`/admin/category/${id}`, { method: "PUT", body: { name } }),
    removeCategory: (id) => apiRequest(`/admin/category/${id}`, { method: "DELETE" }),

    actors: () => apiRequest("/admin/actors"),
    createActor: (body) => apiRequest("/admin/actor", { method: "POST", body }),
    updateActor: (id, body) => apiRequest(`/admin/actor/${id}`, { method: "PUT", body }),
    removeActor: (id) => apiRequest(`/admin/actor/${id}`, { method: "DELETE" }),

    movies: () => apiRequest("/admin/movies"),
    movie: (id) => apiRequest(`/admin/movies/${id}`),
    createMovie: (body) => apiRequest("/admin/movie", { method: "POST", body }),
    updateMovie: (id, body) => apiRequest(`/admin/movie/${id}`, { method: "PUT", body }),
    removeMovie: (id) => apiRequest(`/admin/movie/${id}`, { method: "DELETE" }),

    comments: () => apiRequest("/admin/comments"),
    removeComment: (movieId, commentId) => apiRequest(`/admin/movies/${movieId}/comment/${commentId}`, { method: "DELETE" }),

    contacts: () => apiRequest("/admin/contacts"),
    removeContact: (id) => apiRequest(`/admin/contact/${id}`, { method: "DELETE" }),
  },
};

/* Client səhifələrinin (home/search/account/favourite/detail) öz statik
   sidebar-larındakı #appLogoutBtn-i avtomatik qoşur — hər səhifədə ayrıca
   yazmağa ehtiyac qalmasın deyə mərkəzi burada edilir. */
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("appLogoutBtn");
  if (!btn) return;

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    const confirmed = await confirmDialog(
      "Are you sure you want to log out?",
      { confirmLabel: "Log out", danger: true },
    );
    if (confirmed) logout("client");
  });
});
