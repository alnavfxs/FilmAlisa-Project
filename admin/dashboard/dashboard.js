requireAuth("admin");

document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
});

async function loadDashboard() {
  const fields = {
    favorites: "#statFavorites",
    users: "#statUsers",
    movies: "#statMovies",
    comments: "#statComments",
    categories: "#statCategories",
    actors: "#statActors",
    contacts: "#statContacts",
  };

  try {
    const stats = await api.admin.dashboard();
    Object.entries(fields).forEach(([key, selector]) => {
      const el = document.querySelector(selector);
      if (el) el.textContent = stats[key] ?? 0;
    });
  } catch (err) {
    Object.values(fields).forEach((selector) => {
      const el = document.querySelector(selector);
      if (el) el.textContent = "—";
    });
    toast(err.message || "Dashboard məlumatı yüklənmədi.", "error");
  }
}
