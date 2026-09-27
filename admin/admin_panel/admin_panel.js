const toggleBtn = document.querySelector("#togglePassword");
const passwordInput = document.querySelector("#passwordInput");
toggleBtn.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  toggleBtn.classList.toggle("admin-form__toggle--active", isHidden);
});

// Artıq daxil olubsa → dashboard
if (getToken("admin")) location.replace(pageUrl("admin/dashboard/dashboard.html"));

const loginForm = document.querySelector("#adminLoginForm");
const usernameInput = document.querySelector("#usernameInput");
const errorBox = document.querySelector("#formError");
const submitBtn = loginForm.querySelector(".admin-form__submit");

const ALLOWED_ADMIN_EMAIL = "admin@admin.com";

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.textContent = "";

  const identifier = usernameInput.value.trim(); // sahənin adı "username"-dir, dəyər e-poçtdur
  const password = passwordInput.value;
  if (!identifier || !password) {
    errorBox.textContent = "Zəhmət olmasa email və şifrəni daxil edin.";
    return;
  }

  if (identifier.toLowerCase() !== ALLOWED_ADMIN_EMAIL) {
    errorBox.textContent = "Bu panelə yalnız admin hesabı daxil ola bilər.";
    return;
  }

  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = "Giriş edilir…";

  try {
    await api.adminLogin(identifier, password);
    location.href = pageUrl("admin/dashboard/dashboard.html");
  } catch (err) {
    errorBox.textContent = err.message;
    toast(err.message || "Giriş uğursuz oldu.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});
