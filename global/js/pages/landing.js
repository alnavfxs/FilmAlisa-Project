/* =========================================================
   Landing (index.html) — məntiq
   1. Header: daxil olmayanda "Sign in", daxil olanda ad + Settings/Logout menyusu
   2. Contact Us formu → real API (POST /contact)
   api.js-dən SONRA yüklənməlidir.
   ========================================================= */

/* ===========================================
   0. HERO BAŞLIĞI — typewriter: səhifə açılanda 1 dəfə yazılır
   =========================================== */
(function typeHeroTitle() {
  const title = document.querySelector(".landing-hero__title");
  if (!title || title.dataset.typed === "true") return;

  const text = title.textContent.trim().replace(/\s+/g, " ");
  if (!text) return;

  // Hərəkəti azaltmaq istəyənlər üçün animasiyasız, adi başlıq
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const START_MS = 400;     // səhifə açılandan sonra başlama gecikməsi
  const TYPE_MS = 55;       // 1 hərf yazma sürəti
  const CARET_HIDE_MS = 1200; // yazı bitəndən sonra kursor nə qədər qalsın

  // Screen reader bütöv cümləni oxusun
  title.setAttribute("aria-label", text);
  title.dataset.typed = "true";
  title.textContent = "";

  // Görünməz tam mətn: başlığın hündürlüyü sabit qalsın
  const ghost = document.createElement("span");
  ghost.className = "hero-ghost";
  ghost.setAttribute("aria-hidden", "true");
  ghost.textContent = text;

  const live = document.createElement("span");
  live.className = "hero-live";
  live.setAttribute("aria-hidden", "true");

  title.append(ghost, live);

  let count = 0;

  function tick() {
    count++;
    live.textContent = text.slice(0, count);

    if (count < text.length) {
      setTimeout(tick, TYPE_MS);
    } else {
      // Bitdi: kursoru bir az sonra gizlət, təkrar yoxdur
      setTimeout(() => live.classList.add("is-done"), CARET_HIDE_MS);
    }
  }

  setTimeout(tick, START_MS);
})();

/* ===========================================
   1. HEADER (Sign in ↔ profil menyusu)
   =========================================== */
(function setupHeaderAuth() {
  const signInLink = document.getElementById("headerAuthLink");
  const profileBox = document.getElementById("headerProfile");
  const trigger = document.getElementById("headerProfileTrigger");
  const menu = document.getElementById("headerMenu");
  const logoutBtn = document.getElementById("headerLogoutBtn");
  const nameEl = document.getElementById("headerUsername");
  const avatarEl = document.getElementById("headerAvatar");
  const defaultAvatar = avatarEl ? avatarEl.getAttribute("src") : "";

  if (!signInLink || !profileBox || !trigger || !menu || !logoutBtn) {
    console.error("[landing] Header elementləri tapılmadı.");
    return;
  }

  function closeMenu() {
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }

  // Token varsa → profil, yoxdursa → "Sign in"
  function renderAuthState() {
    const loggedIn = !!getToken("client");
    signInLink.hidden = loggedIn;
    renderHeroAuth(loggedIn);
    profileBox.hidden = !loggedIn;
    closeMenu();

    if (!loggedIn) return;

    const profile = getProfile("client") || {};
    nameEl.textContent = profile.full_name || profile.email || "Account";
    avatarEl.src = resolveAvatar(profile) || defaultAvatar;
  }

  // Şəkil linki sınıqdırsa default ikona qayıt
  avatarEl.addEventListener("error", () => {
    if (avatarEl.getAttribute("src") !== defaultAvatar) avatarEl.src = defaultAvatar;
  });

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
    trigger.setAttribute("aria-expanded", String(!menu.hidden));
  });

  // Menyudan kənara klik / Escape → bağla
  document.addEventListener("click", (e) => {
    if (menu.hidden) return;
    if (menu.contains(e.target) || trigger.contains(e.target)) return;
    closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  logoutBtn.addEventListener("click", async () => {
    closeMenu();

    const confirmed =
      typeof confirmDialog === "function"
        ? await confirmDialog("Are you sure you want to log out?", {
            confirmLabel: "Log out",
            danger: true,
          })
        : window.confirm("Are you sure you want to log out?");
    if (!confirmed) return;

    // Səhifəni yeniləmədən: sessiyanı sil → dərhal "Sign in" görünsün
    logout("client", false);
    renderAuthState();
    toast("Logged out successfully.", "success");
  });

  // Geri düyməsi ilə (bfcache) qayıdanda da düzgün vəziyyət göstərilsin
  window.addEventListener("pageshow", renderAuthState);

  renderAuthState();
})();

/* ===========================================
   HERO FORMU: daxil olmayana "Get Started" (register),
   daxil olana "Go to Home" (email sahəsi gizlənir)
   =========================================== */
function renderHeroAuth(loggedIn) {
  const form = document.getElementById("heroForm");
  const email = document.getElementById("heroEmail");
  const label = document.getElementById("heroSubmitLabel");
  const text = document.getElementById("heroText");
  if (!form || !email || !label || !text) return;

  // İlk çağırışda orijinal mətni yadda saxla (logout-dan sonra qaytarmaq üçün)
  if (!text.dataset.guestText) text.dataset.guestText = text.textContent.trim();

  const profile = loggedIn ? getProfile("client") || {} : {};
  const name = profile.full_name ? `, ${profile.full_name}` : "";

  form.action = loggedIn
    ? "./client/home/home.html"
    : "./client/register/register.html";
  form.classList.toggle("is-signed-in", loggedIn);
  email.hidden = loggedIn;
  email.disabled = loggedIn; // gizli sahə nə yoxlanılsın, nə də URL-ə ?email= əlavə olunsun
  label.textContent = loggedIn ? "Go to Home" : "Get Started";
  text.textContent = loggedIn
    ? `Welcome back${name}! Pick up where you left off.`
    : text.dataset.guestText;
}

/* ===========================================
   2. CONTACT US → POST /contact
   =========================================== */
(function setupContactForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;

  const nameInput = document.getElementById("contactName");
  const emailInput = document.getElementById("contactEmail");
  const reasonInput = document.getElementById("contactReason");
  const submitBtn = form.querySelector(".landing-contact__submit");

  // Daxil olubsa ad və email avtomatik dolsun
  const profile = getToken("client") ? getProfile("client") : null;
  if (profile) {
    if (profile.full_name) nameInput.value = profile.full_name;
    if (profile.email) emailInput.value = profile.email;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const body = {
      full_name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      reason: reasonInput.value.trim(),
    };
    if (!body.full_name || !body.email || !body.reason) {
      toast("Please fill in all fields.", "error");
      return;
    }

    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = "Sending…";

    try {
      await api.sendContact(body);
      toast("Your message has been sent. Thank you!", "success");
      reasonInput.value = "";
      if (!profile) {
        nameInput.value = "";
        emailInput.value = "";
      }
    } catch (err) {
      // Backend bu endpoint üçün token tələb edir
      if (err.status === 401 || err.status === 403) {
        toast("Please log in first to send a message.", "error");
      } else {
        toast(err.message || "Message could not be sent.", "error");
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
})();
