// Artıq daxil olubsa qeydiyyat səhifəsi lazım deyil
if (getToken("client")) location.replace(pageUrl("client/home/home.html"));

const toggleBtn = document.querySelector("#togglePassword");
const passwordInput = document.querySelector("#passwordInput");
toggleBtn.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  toggleBtn.classList.toggle("login-form__toggle--active", isHidden);
});

/* Landing səhifəsindən (index.html) ?email=... ilə gələn dəyəri doldurur */
const emailInput = document.querySelector("#emailInput");
const prefillEmail = new URLSearchParams(location.search).get("email");
if (prefillEmail) emailInput.value = prefillEmail;

const registerForm = document.querySelector("#registerForm");
const fullnameInput = document.querySelector("#fullnameInput");
const submitBtn = registerForm.querySelector(".login-form__submit");

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const full_name = fullnameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = "Creating account…";

  try {
    await api.signup(full_name, email, password);
    // toast burada görünməz (səhifə dəyişir) → login səhifəsi bayrağa görə göstərir
    location.href = pageUrl("client/login/login.html?registered=1");
  } catch (err) {
    toast(err.message || "Registration failed. Try again.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});
