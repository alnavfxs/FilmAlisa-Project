document.addEventListener("DOMContentLoaded", () => {
  setupMovieModal();
});

// Handles opening/closing the modal and creating, editing and deleting movies
function setupMovieModal() {
  const modal = document.querySelector("#movieModal");
  const form = document.querySelector("#movieForm");
  const tableBody = document.querySelector("#moviesTableBody");

  const createBtn = document.querySelector("#createMovieBtn");
  const closeBtn = document.querySelector("#closeModalBtn");
  const submitBtn = form.querySelector(".movie-form__submit");

  const titleInput = document.querySelector("#movieTitle");
  const overviewInput = document.querySelector("#movieOverview");
  const coverInput = document.querySelector("#movieCover");
  const trailerInput = document.querySelector("#movieTrailer");
  const watchUrlInput = document.querySelector("#movieWatchUrl");
  const imdbInput = document.querySelector("#movieImdb");
  const runtimeInput = document.querySelector("#movieRuntime");
  const categoryInput = document.querySelector("#movieCategory");
  const actorsInput = document.querySelector("#movieActors");
  const adultInput = document.querySelector("#movieAdult");
  const previewImg = document.querySelector("#moviePreviewImg");

  const placeholderPoster =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='296' viewBox='0 0 200 296'%3E%3Crect width='200' height='296' rx='10' fill='%231c1c24'/%3E%3Cpath d='M70 118h60v60H70z' fill='%232c2c3a'/%3E%3C/svg%3E";

  let editingId = null;

  function updatePreview() {
    previewImg.src = coverInput.value.trim() || placeholderPoster;
  }

  async function loadOptions() {
    try {
      const [categories, actors] = await Promise.all([
        api.admin.categories(),
        api.admin.actors(),
      ]);
      categoryInput.innerHTML =
        '<option value="" disabled selected>category</option>' +
        categories
          .map((c) => `<option value="${c.id}">${esc(c.name)}</option>`)
          .join("");
      actorsInput.innerHTML = actors
        .map(
          (a) =>
            `<option value="${a.id}">${esc(a.name)} ${esc(a.surname)}</option>`,
        )
        .join("");
    } catch (err) {
      toast(err.message || "Failed to load category/actor lists.", "error");
    }
  }

  function fillForm(data) {
    titleInput.value = data.title || "";
    overviewInput.value = data.overview || "";
    imdbInput.value = data.imdb || "";
    coverInput.value = data.cover_url || "";
    trailerInput.value = data.fragman || "";
    watchUrlInput.value = data.watch_url || "";
    runtimeInput.value = data.run_time_min || "";
    adultInput.checked = !!data.adult;

    categoryInput.value = data.category ? String(data.category.id) : "";
    const actorIds = new Set((data.actors || []).map((a) => String(a.id)));
    Array.from(actorsInput.options).forEach((opt) => {
      opt.selected = actorIds.has(opt.value);
    });
  }

  function openCreateModal() {
    editingId = null;
    form.reset();
    Array.from(actorsInput.options).forEach((opt) => (opt.selected = false));
    updatePreview();
    modal.classList.add("active");
  }

  async function openEditModal(id, triggerBtn) {
    const originalIcon = triggerBtn.innerHTML;
    triggerBtn.disabled = true;
    triggerBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
      const movie = await api.admin.movie(id);
      editingId = id;
      form.reset();
      fillForm(movie);
      updatePreview();
      modal.classList.add("active");
    } catch (err) {
      toast(err.message || "Failed to load movie data.", "error");
    } finally {
      triggerBtn.disabled = false;
      triggerBtn.innerHTML = originalIcon;
    }
  }

  function closeModal() {
    modal.classList.remove("active");
    form.reset();
    editingId = null;
    updatePreview();
  }

  function buildRow(id, data) {
    const row = document.createElement("tr");
    row.dataset.id = id;
    row.innerHTML = `
      <td><img class="poster-thumb" src="${data.cover_url || placeholderPoster}" alt=""></td>
      <td class="cell-title">${esc(data.title)}</td>
      <td class="cell-overview">${esc(data.overview || "—")}</td>
      <td class="cell-imdb">${esc(data.imdb)}</td>
      <td>
        <button class="table-btn table-btn--edit" type="button" title="Edit">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="table-btn table-btn--delete" type="button" title="Delete">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    return row;
  }

  async function loadMovies() {
    tableBody.innerHTML = `<tr><td colspan="5" class="table-empty">Loading...</td></tr>`;
    try {
      const movies = await api.admin.movies();
      tableBody.innerHTML = "";
      if (!movies || !movies.length) {
        tableBody.innerHTML = `<tr><td colspan="5" class="table-empty">No movies added yet.</td></tr>`;
        return;
      }
      movies.forEach((movie) =>
        tableBody.appendChild(buildRow(movie.id, movie)),
      );
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="5" class="table-empty">Failed to load movies.</td></tr>`;
      toast(err.message || "Failed to load movies.", "error");
    }
  }

  createBtn.addEventListener("click", openCreateModal);
  closeBtn.addEventListener("click", closeModal);
  coverInput.addEventListener("input", updatePreview);

  // Düzenleme/Ekleme modalını dışarı tıklayarak kapatma
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (modal.classList.contains("active")) closeModal();
    }
  });

  // Edit / Delete — delegated so it also works for rows added later
  tableBody.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".table-btn--edit");
    const deleteBtn = e.target.closest(".table-btn--delete");
    const row = e.target.closest("tr");

    if (!row || !row.dataset.id) return;

    if (editBtn) {
      openEditModal(row.dataset.id, editBtn);
    }

    // Kategorilerdeki global confirmDialog() fonksiyonu ile aynı yapı
    if (deleteBtn) {
      const movieTitle = row.querySelector(".cell-title").textContent;
      confirmDialog(
        `Are you sure you want to delete the "${movieTitle}" movie?`,
        {
          confirmLabel: "Delete",
          cancelLabel: "Cancel",
          danger: true,
        },
      ).then(async (confirmed) => {
        if (!confirmed) return;
        try {
          await api.admin.removeMovie(row.dataset.id);
          row.remove();
          toast("Movie deleted successfully.", "success");
        } catch (err) {
          toast(err.message || "Failed to delete movie.", "error");
        }
      });
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const actorIds = Array.from(actorsInput.selectedOptions).map((o) =>
      Number(o.value),
    );

    const data = {
      title: titleInput.value.trim(),
      overview: overviewInput.value.trim() || "—",
      cover_url: coverInput.value.trim(),
      fragman: trailerInput.value.trim(),
      watch_url: watchUrlInput.value.trim(),
      imdb: imdbInput.value.trim(),
      run_time_min: runtimeInput.value ? Number(runtimeInput.value) : 0,
      category: categoryInput.value ? Number(categoryInput.value) : null,
      actors: actorIds,
      adult: adultInput.checked,
    };

    if (!data.title || !data.category || !data.imdb) return;

    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = editingId ? "Updating..." : "Adding...";

    try {
      if (editingId) {
        await api.admin.updateMovie(editingId, data);
        const row = tableBody.querySelector(`tr[data-id="${editingId}"]`);
        if (row) row.replaceWith(buildRow(editingId, data));
        toast("Movie updated successfully.", "success");
      } else {
        const created = await api.admin.createMovie(data);
        tableBody.appendChild(buildRow(created.id, created));
        toast("Movie added successfully.", "success");
      }
      closeModal();
    } catch (err) {
      toast(err.message || "Operation failed.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });

  loadOptions();
  loadMovies();
}
