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
          const size = 160;
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
  const passwordToggle = document.querySelector("#passwordToggle");
  const passwordToggleIcon = passwordToggle.querySelector(".action-icon");

  passwordToggle.addEventListener("click", () => {
    const show = passwordInput.type === "password";
    passwordInput.type = show ? "text" : "password";
    // açıq göz = gizlidir (klik edəndə göstərər), üstündən xətt çəkilmiş göz = göstərilir
    passwordToggleIcon.src = `../../assets/icons/${show ? "eye-off" : "passwordtog"}.svg`;
    passwordToggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
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
      localStorage.setItem(
        PROFILE_KEY.client,
        JSON.stringify({ ...(getProfile("client") || {}), ...currentProfile, avatar_local: storedAvatar }),
      );
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

    const typedUrl = imageUrlInput.value.trim();
    const body = { full_name, email: emailInput.value, img_url: typedUrl };
    if (passwordInput.value) body.password = passwordInput.value;

    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = "Saving…";

    // 1) ŞƏKLİ ƏVVƏLCƏ BRAUZERƏ YAZ — server nə cavab versə də şəkil itməsin
    const uploadedNow = pendingAvatar;
    if (pendingAvatar) {
      storedAvatar = pendingAvatar;
      setLocalAvatar(body.email, storedAvatar);
      pendingAvatar = null;
    } else if (typedUrl) {
      storedAvatar = "";
      setLocalAvatar(body.email, "");
    }
    const syncSession = (extra = {}) => {
      currentProfile = { ...currentProfile, full_name, ...extra };
      delete currentProfile.password;
      localStorage.setItem(
        PROFILE_KEY.client,
        JSON.stringify({ ...(getProfile("client") || {}), ...currentProfile, avatar_local: storedAvatar }),
      );
    };
    syncSession({ img_url: typedUrl || (currentProfile && currentProfile.img_url) || "" });
    updateAvatarPreview();

    // 2) SERVERƏ GÖNDƏR (fayl seçilibsə şəkil data-URL kimi cəhd olunur)
    try {
      if (uploadedNow) body.img_url = uploadedNow;
      let updated;
      try {
        updated = await api.updateProfile(body);
      } catch (firstErr) {
        if (!uploadedNow) throw firstErr;
        // Server data-URL qəbul etmədi → şəkilsiz yenilə, şəkil yalnız bu brauzerdə qalır
        console.warn("[account] server şəkli qəbul etmədi:", firstErr);
        body.img_url = (currentProfile && currentProfile.img_url) || "";
        updated = await api.updateProfile(body);
        syncSession({ ...(updated || {}), img_url: body.img_url });
        passwordInput.value = "";
        toast("Profile saved. The photo is stored on this device (the server only accepts image links).", "success");
        return;
      }
      syncSession({ ...(updated || {}), img_url: body.img_url });
      passwordInput.value = "";
      toast("Profile updated.", "success");
    } catch (err) {
      toast((err.message || "Failed to update profile.") + " Photo is saved on this device.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });

  loadProfile();
});
