const toggleBtn = document.querySelector("#togglePassword");
const passwordInput = document.querySelector("#passwordInput");
toggleBtn.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  toggleBtn.classList.toggle("login-form__toggle--active", isHidden);
});

const loginForm = document.querySelector("#loginForm");
const emailInput = document.querySelector("#emailInput");
const submitBtn = loginForm.querySelector(".login-form__submit");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = "Logging in…";

  try {
    await api.login(email, password);
    location.href = pageUrl("client/home/home.html");
  } catch (err) {
    toast(err.message || "Login failed. Try again.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});
