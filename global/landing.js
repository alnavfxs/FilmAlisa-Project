/* =========================================================
   Landing (index.html) — məntiq
   1. Header: daxil olmayanda "Sign in", daxil olanda ad + Settings/Logout menyusu
   2. Contact Us formu → real API (POST /contact)
   api.js-dən SONRA yüklənməlidir.
   ========================================================= */

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
    profileBox.hidden = !loggedIn;
    closeMenu();

    if (!loggedIn) return;

    const profile = getProfile("client") || {};
    nameEl.textContent = profile.full_name || profile.email || "Account";
    avatarEl.src = profile.img_url || defaultAvatar;
  }

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
        ? await confirmDialog("Çıxış etmək istədiyinizə əminsiniz?", {
            confirmLabel: "Çıxış et",
            danger: true,
          })
        : window.confirm("Çıxış etmək istədiyinizə əminsiniz?");
    if (!confirmed) return;

    // Səhifəni yeniləmədən: sessiyanı sil → dərhal "Sign in" görünsün
    logout("client", false);
    renderAuthState();
    toast("Çıxış edildi.", "success");
  });

  // Geri düyməsi ilə (bfcache) qayıdanda da düzgün vəziyyət göstərilsin
  window.addEventListener("pageshow", renderAuthState);

  renderAuthState();
})();

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
      toast("Bütün sahələri doldurun.", "error");
      return;
    }

    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = "Göndərilir…";

    try {
      await api.sendContact(body);
      toast("Müraciətiniz göndərildi. Təşəkkür edirik!", "success");
      reasonInput.value = "";
      if (!profile) {
        nameInput.value = "";
        emailInput.value = "";
      }
    } catch (err) {
      // Backend bu endpoint üçün token tələb edir
      if (err.status === 401 || err.status === 403) {
        toast("Müraciət göndərmək üçün əvvəlcə daxil olun.", "error");
      } else {
        toast(err.message || "Müraciət göndərilmədi.", "error");
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
})();
