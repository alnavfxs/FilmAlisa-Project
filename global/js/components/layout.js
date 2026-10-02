/* =========================================================
   Filmalisa — Ortaq Layout (Sidebar) skripti
   Admin panel (dashboard, movies, categories, users, comments,
   contact, actors) və istifadəçi (search, account, favourite)
   səhifələrində təkrarlanan sidebar HTML-ini mərkəzləşdirir.

   İSTİFADƏ:
   1) Səhifədəki <aside class="sidebar_menu">...</aside> və ya
      <aside class="sidebar">...</aside> bloğunu bununla əvəz et:

      <div id="sidebar-placeholder" data-type="admin" data-active="movies"></div>
      <!-- app səhifələri üçün: data-type="app" data-active="search" -->

   2) Səhifənin öz JS-indən ƏVVƏL bunu əlavə et:
      <script src="../../global/js/components/layout.js"></script>

   Qeyd: admin sidebar-dakı Logout düyməsinin təsdiq dialoqu da
   bu fayl tərəfindən avtomatik qoşulur — səhifənin öz JS-ində
   ayrıca setupLogout() yazmağa ehtiyac yoxdur.
   ========================================================= */

// layout.js global/js/components/ içindədir → BASE layihənin kökünə (../../../) işarə edir.
// Beləliklə saytı GitHub Pages alt-qovluğunda (/repo-adi/) da yerləşdirsən yollar pozulmur.
const BASE = new URL("../../../", document.currentScript.src).href;

const ADMIN_NAV = [
  {
    key: "dashboard",
    href: "admin/dashboard/dashboard.html",
    icon: "Dashboard.svg",
    label: "Dashboard",
  },
  {
    key: "movies",
    href: "admin/movies/movies.html",
    icon: "Movies.svg",
    label: "Movies",
  },
  {
    key: "categories",
    href: "admin/categories/categories.html",
    icon: "Categories.svg",
    label: "Categories",
  },
  {
    key: "users",
    href: "admin/users/users.html",
    icon: "Users.svg",
    label: "Users",
  },
  {
    key: "comments",
    href: "admin/comments/comments.html",
    icon: "Comments.svg",
    label: "Comments",
  },
  {
    key: "contact",
    href: "admin/contact/contact.html",
    icon: "Contact us.svg",
    label: "Contact us",
  },
  {
    key: "actors",
    href: "admin/actors/actors.html",
    icon: "Users.svg",
    label: "Actors",
  },
];

const APP_NAV = [
  { key: "home", href: "client/home/home.html", icon: "home", title: "Home" },
  {
    key: "search",
    href: "client/search-panel/search.html",
    icon: "search",
    title: "Movies Search",
  },
  {
    key: "account",
    href: "client/account/account.html",
    icon: "account",
    title: "Account",
  },
  {
    key: "favourite",
    href: "client/favourite/favourite.html",
    icon: "favourite",
    title: "Favorites",
  },
];

function renderAdminSidebar(active) {
  const links = ADMIN_NAV.map(
    (item) => `
      <li>
        <a href="${BASE}${item.href}" class="sidebar_link${item.key === active ? " active" : ""}">
          <img src="${BASE}assets/icons/${item.icon}" alt="" />
          <span>${item.label}</span>
        </a>
      </li>`,
  ).join("");

  return `
    <aside class="sidebar_menu">
      <div class="sidebar_logo">
        <img src="${BASE}assets/icons/image 1.svg" alt="Filmalisa logo" />
        <h4 class="logo-title">Filmalisa</h4>
      </div>
      <nav class="sidebar_menu_nav">
        <ul>${links}</ul>
      </nav>
      <a href="${BASE}client/login/login.html" class="sidebar_link_logout" id="logoutBtn">
        <img src="${BASE}assets/icons/Logout.svg" alt="" />
        <span>Logout</span>
      </a>
    </aside>`;
}

function renderAppSidebar(active) {
  const links = APP_NAV.map((item) => {
    const isActive = item.key === active;
    const icon = isActive ? `${item.icon}-active.svg` : `${item.icon}.svg`;
    return `
      <a href="${BASE}${item.href}" class="sidebar-link${isActive ? " active" : ""}" title="${item.title}">
        <img src="${BASE}assets/icons/${icon}" alt="${item.title}" class="svg-icon" />
      </a>`;
  }).join("");

  return `
    <aside class="sidebar">
      <div class="sidebar-logo">
        <a href="${BASE}index.html" class="sidebar-link" title="Back to Landing Page">
          <img src="${BASE}assets/images/filmalisa.svg" alt="Filmalisa Logo" class="svg-logo" />
        </a>
      </div>
      <nav class="sidebar-nav">${links}</nav>
      <button type="button" class="sidebar-link sidebar-logout" id="appLogoutBtn" title="Logout">
        <img src="${BASE}assets/icons/logout-sidebar.svg" alt="Logout" class="svg-icon" />
      </button>
    </aside>`;
}

function initLayout() {
  const mount = document.querySelector("#sidebar-placeholder");
  if (!mount) return;

  const type = mount.dataset.type;
  const active = mount.dataset.active || "";

  mount.outerHTML =
    type === "app" ? renderAppSidebar(active) : renderAdminSidebar(active);

  if (type === "app") {
    setupLogout("client", "#appLogoutBtn");
  } else {
    setupLogout("admin", "#logoutBtn");
  }
}

// Çıxışdan əvvəl təsdiq istəyir (həm admin, həm də app sidebar-ın Logout düyməsi üçün)
function setupLogout(role, selector) {
  const logoutBtn = document.querySelector(selector);
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const confirmed = await confirmDialog("Are you sure you want to log out?", {
      confirmLabel: "Log out",
      danger: true,
    });
    if (confirmed) logout(role);
  });
}

document.addEventListener("DOMContentLoaded", initLayout);
