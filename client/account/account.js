requireClientAuth();

document.addEventListener("DOMContentLoaded", () => {
  const avatarContainer = document.querySelector("#avatarContainer");
  const avatarPlaceholder = document.querySelector("#avatarPlaceholder");
  const avatarImg = document.querySelector("#avatarImg");

  const accountForm = document.querySelector("#accountForm");
  const imageUrlInput = document.querySelector("#imageUrl");
  const fullNameInput = document.querySelector("#fullName");
  const emailInput = document.querySelector("#email");
  const passwordInput = document.querySelector("#password");
  const submitBtn = accountForm.querySelector(".save-btn");

  // ===========================================
  // AVATAR ÖNİZLƏMƏSİ — URL yazıldıqca canlı yenilənir
  // ===========================================
  function updateAvatarPreview() {
    const url = imageUrlInput.value.trim();
    if (url) {
      avatarImg.src = url;
      avatarImg.classList.remove("d-none");
      avatarPlaceholder.classList.add("d-none");
    } else {
      avatarImg.classList.add("d-none");
      avatarPlaceholder.classList.remove("d-none");
    }
  }

  imageUrlInput.addEventListener("input", updateAvatarPreview);
  avatarContainer.addEventListener("click", () => imageUrlInput.focus());

  // ===========================================
  // PASSWORD SHOW/HIDE TOGGLE
  // ===========================================
  const passwordWrapper = passwordInput.closest(".input-wrapper");
  const passwordToggleIcon = passwordWrapper.querySelector(".action-icon");

  passwordToggleIcon.addEventListener("click", () => {
    passwordInput.type = passwordInput.type === "password" ? "text" : "password";
  });

  // ===========================================
  // PROFİLİ YÜKLƏ VƏ FORMANI DOLDUR
  // ===========================================
  let currentProfile = null;

  async function loadProfile() {
    try {
      currentProfile = await api.profile();
      fullNameInput.value = currentProfile.full_name || "";
      emailInput.value = currentProfile.email || "";
      imageUrlInput.value = currentProfile.img_url || "";
      updateAvatarPreview();
    } catch (err) {
      toast(err.message || "Profil yüklənmədi.", "error");
    }
  }

  // ===========================================
  // FORM SUBMIT — real API-ya PUT /profile
  // ===========================================
  accountForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const full_name = fullNameInput.value.trim();
    if (!full_name) {
      toast("Zəhmət olmasa adınızı daxil edin.", "error");
      return;
    }

    const body = {
      full_name,
      email: emailInput.value,
      img_url: imageUrlInput.value.trim(),
    };
    if (passwordInput.value) body.password = passwordInput.value;

    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = "Yadda saxlanılır…";

    try {
      const updated = await api.updateProfile(body);
      currentProfile = updated;
      passwordInput.value = "";
      toast("Profil yeniləndi.", "success");
    } catch (err) {
      toast(err.message || "Profil yenilənmədi.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });

  loadProfile();
});
