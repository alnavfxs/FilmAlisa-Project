requireAuth("admin");

document.addEventListener("DOMContentLoaded", () => {
  setupCommentsTable();
});

function setupCommentsTable() {
  const tableBody = document.querySelector("#commentsTableBody");
  const modal = document.querySelector("#deleteModal");
  const closeBtn = document.querySelector("#closeModalBtn");
  const cancelBtn = document.querySelector("#cancelDeleteBtn");
  const confirmBtn = document.querySelector("#confirmDeleteBtn");

  const placeholderPoster =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='90' viewBox='0 0 60 90'%3E%3Crect width='60' height='90' rx='6' fill='%231c1c24'/%3E%3C/svg%3E";

  let rowToDelete = null;

  function buildRow(c) {
    const row = document.createElement("tr");
    row.dataset.id = c.id;
    row.dataset.movieId = c.movie ? c.movie.id : "";
    row.innerHTML = `
      <td>${c.id}</td>
      <td>
        <div class="cell-movie">
          <img src="${(c.movie && c.movie.cover_url) || placeholderPoster}" alt="">
          <span>${esc(c.movie ? c.movie.title : "—")}</span>
        </div>
      </td>
      <td class="cell-comment">${esc(c.comment)}</td>
      <td>
        <button class="table-btn table-btn--delete" type="button" title="Delete">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    return row;
  }

  async function loadComments() {
    tableBody.innerHTML = `<tr><td colspan="4" class="table-empty">Yüklənir…</td></tr>`;
    try {
      const comments = await api.admin.comments();
      tableBody.innerHTML = "";
      if (!comments || !comments.length) {
        tableBody.innerHTML = `<tr><td colspan="4" class="table-empty">Hələ şərh yoxdur.</td></tr>`;
        return;
      }
      comments.forEach((c) => tableBody.appendChild(buildRow(c)));
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="4" class="table-empty">Şərhlər yüklənmədi.</td></tr>`;
      toast(err.message || "Şərhlər yüklənmədi.", "error");
    }
  }

  // Delete button click opens the modal
  tableBody.addEventListener("click", (e) => {
    if (e.target.closest(".table-btn--delete")) {
      rowToDelete = e.target.closest("tr");
      modal.classList.add("active");
    }
  });

  function closeModal() {
    modal.classList.remove("active");
    rowToDelete = null;
  }

  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);

  confirmBtn.addEventListener("click", async () => {
    if (!rowToDelete) return;
    const { id, movieId } = rowToDelete.dataset;
    confirmBtn.disabled = true;
    try {
      await api.admin.removeComment(movieId, id);
      rowToDelete.remove();
      toast("Şərh silindi.", "success");
      closeModal();
    } catch (err) {
      toast(err.message || "Şərh silinmədi.", "error");
    } finally {
      confirmBtn.disabled = false;
    }
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  loadComments();
}
