requireAuth("admin");

document.addEventListener("DOMContentLoaded", () => {
  setupCommentsTable();
});

function setupCommentsTable() {
  const tableBody = document.querySelector("#commentsTableBody");
  const pagerEl = document.querySelector("#commentsPager");

  const placeholderPoster =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='90' viewBox='0 0 60 90'%3E%3Crect width='60' height='90' rx='6' fill='%231c1c24'/%3E%3C/svg%3E";

  function buildRow(c) {
    const row = document.createElement("tr");
    row.dataset.id = c.id;
    row.dataset.movieId = c.movie ? c.movie.id : "";
    row.innerHTML = `
      <td>${c.id}</td>
      <td>
        <div class="cell-movie">
          <img src="${esc(c.movie && c.movie.cover_url) || placeholderPoster}" alt="">
          <span>${esc(c.movie ? c.movie.title : "—")}</span>
        </div>
      </td>
      <td class="cell-comment truncate-cell">${esc(c.comment)}</td>
      <td>
        <button class="table-btn table-btn--delete" type="button" title="Delete">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    return row;
  }

  const pager = createTablePaginator({
    tableBody,
    pagerEl,
    colSpan: 4,
    pageSize: 7,
    emptyText: "No comments yet.",
    renderRow: buildRow,
  });

  async function loadComments() {
    tableBody.innerHTML = `<tr><td colspan="4" class="table-empty">Loading…</td></tr>`;
    try {
      const comments = await api.admin.comments();
      pager.setItems(comments || []);
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="4" class="table-empty">Failed to load comments.</td></tr>`;
      toast(err.message || "Failed to load comments.", "error");
    }
  }

  // Delete button click triggers the global confirmDialog
  tableBody.addEventListener("click", (e) => {
    const deleteBtn = e.target.closest(".table-btn--delete");
    const row = e.target.closest("tr");

    if (!row || !row.dataset.id) return;

    if (deleteBtn) {
      confirmDialog("Are you sure you want to delete this comment?", {
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        danger: true,
      }).then(async (confirmed) => {
        if (!confirmed) return;

        const { id, movieId } = row.dataset;

        try {
          await api.admin.removeComment(movieId, id);
          pager.removeItem(id);
          toast("Comment deleted successfully.", "success");
        } catch (err) {
          toast(err.message || "Failed to delete comment.", "error");
        }
      });
    }
  });

  loadComments();
}
