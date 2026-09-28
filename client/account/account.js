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
  // AVATAR — URL yaz və ya cihazdan şəkil seç (kliklə)
  // ===========================================
  let pendingAvatar = null; // yeni seçilmiş fayl (data URL), hələ saxlanmayıb
  let storedAvatar = ""; // artıq yaddaşda olan şəkil

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.hidden = true;
  document.body.appendChild(fileInput);

  // Şəkli kvadrat kəsib 256×256-ya kiçildir (yaddaşa sığsın deyə)
  function fileToAvatar(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const size = 256;
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = size;
          const side = Math.min(img.width, img.height);
          canvas
            .getContext("2d")
            .drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function updateAvatarPreview() {
    const url = imageUrlInput.value.trim() || pendingAvatar || storedAvatar;
    if (url) {
      avatarImg.src = url;
      avatarImg.classList.remove("d-none");
      avatarPlaceholder.classList.add("d-none");
    } else {
      avatarImg.classList.add("d-none");
      avatarPlaceholder.classList.remove("d-none");
    }
  }

  avatarImg.addEventListener("error", () => {
    avatarImg.classList.add("d-none");
    avatarPlaceholder.classList.remove("d-none");
  });

  // URL yazılırsa o üstünlük qazanır
  imageUrlInput.addEventListener("input", () => {
    if (imageUrlInput.value.trim()) pendingAvatar = null;
    updateAvatarPreview();
  });

  // Dairəyə klik → cihazdan şəkil seç
  avatarContainer.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    fileInput.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Please choose an image file.", "error");
      return;
    }
    try {
      pendingAvatar = await fileToAvatar(file);
      imageUrlInput.value = "";
      updateAvatarPreview();
    } catch {
      toast("Could not read this image.", "error");
    }
  });

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
      storedAvatar = getLocalAvatar(currentProfile.email);
      updateAvatarPreview();
      localStorage.setItem(PROFILE_KEY.client, JSON.stringify({ ...(getProfile("client") || {}), ...currentProfile }));
    } catch (err) {
      toast(err.message || "Failed to load profile.", "error");
    }
  }

  // ===========================================
  // FORM SUBMIT — real API-ya PUT /profile
  // ===========================================
  accountForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const full_name = fullNameInput.value.trim();
    if (!full_name) {
      toast("Please enter your name.", "error");
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
    submitBtn.textContent = "Saving…";

    try {
      const updated = await api.updateProfile(body);

      // Şəkli yaddaşa yaz (email-ə görə) — səhifə/logout sonrası da qalır
      if (pendingAvatar) {
        storedAvatar = pendingAvatar;
        setLocalAvatar(body.email, storedAvatar);
        pendingAvatar = null;
      } else if (body.img_url) {
        // URL yazılıb → o istifadə olunsun, köhnə yerli şəkil silinsin
        storedAvatar = "";
        setLocalAvatar(body.email, "");
      }
      currentProfile = { ...currentProfile, ...(updated || {}), ...body };
      delete currentProfile.password;
      // Landing page header-i bu profili localStorage-dan oxuyur → sinxronlaşdır
      localStorage.setItem(PROFILE_KEY.client, JSON.stringify({ ...(getProfile("client") || {}), ...currentProfile }));
      passwordInput.value = "";
      toast("Profile updated.", "success");
    } catch (err) {
      toast(err.message || "Failed to update profile.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });

  loadProfile();
});
