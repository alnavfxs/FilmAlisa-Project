requireAuth("admin");

document.addEventListener("DOMContentLoaded", () => {
  setupCategoryModal();
});

// Handles opening/closing the modal and creating, editing and deleting categories
function setupCategoryModal() {
  const modal = document.querySelector("#categoryModal");
  const form = document.querySelector("#categoryForm");
  const nameInput = document.querySelector("#categoryName");
  const tableBody = document.querySelector("#categoriesTableBody");
  const submitBtn = form.querySelector('[type="submit"]');

  const createBtn = document.querySelector("#createCategoryBtn");
  const closeBtn = document.querySelector("#closeModalBtn");

  let editingRow = null; // holds the <tr> being edited, or null when creating

  function openModal(mode, row = null) {
    editingRow = row;
    form.reset();

    if (mode === "edit" && row) {
      nameInput.value = row.querySelector(".cell-name").textContent;
    }

    modal.classList.add("active");
    nameInput.focus();
  }

  function closeModal() {
    modal.classList.remove("active");
    form.reset();
    editingRow = null;
  }

  function buildRow(id, name) {
    const row = document.createElement("tr");
    row.dataset.id = id;
    row.innerHTML = `
      <td class="cell-name">${esc(name)}</td>
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

  async function loadCategories() {
    tableBody.innerHTML = `<tr><td colspan="2" class="table-empty">Loading…</td></tr>`;
    try {
      const categories = await api.admin.categories();
      tableBody.innerHTML = "";
      if (!categories || !categories.length) {
        tableBody.innerHTML = `<tr><td colspan="2" class="table-empty">No categories yet.</td></tr>`;
        return;
      }
      categories.forEach((c) => tableBody.appendChild(buildRow(c.id, c.name)));
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="2" class="table-empty">Failed to load categories.</td></tr>`;
      toast(err.message || "Failed to load categories.", "error");
    }
  }

  createBtn.addEventListener("click", () => openModal("create"));
  closeBtn.addEventListener("click", closeModal);

  // Close when clicking the dark overlay (not the modal box itself)
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("active")) closeModal();
  });

  // Edit / Delete — delegated so it also works for rows added later
  tableBody.addEventListener("click", (e) => {
    const row = e.target.closest("tr");
    if (!row || !row.dataset.id) return;

    if (e.target.closest(".table-btn--edit")) {
      openModal("edit", row);
    }

    if (e.target.closest(".table-btn--delete")) {
      const name = row.querySelector(".cell-name").textContent;
      confirmDialog(`Are you sure you want to delete the category "${name}"?`, {
        confirmLabel: "Delete",
        danger: true,
      }).then(async (confirmed) => {
        if (!confirmed) return;
        try {
          await api.admin.removeCategory(row.dataset.id);
          row.remove();
          toast("Category deleted.", "success");
        } catch (err) {
          toast(err.message || "Failed to delete category.", "error");
        }
      });
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    if (!name) return;

    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = editingRow ? "Updating…" : "Adding…";

    try {
      if (editingRow) {
        await api.admin.updateCategory(editingRow.dataset.id, name);
        editingRow.querySelector(".cell-name").textContent = name;
        toast("Category updated.", "success");
      } else {
        const created = await api.admin.createCategory(name);
        tableBody.appendChild(buildRow(created.id, created.name));
        toast("Category added.", "success");
      }
      closeModal();
    } catch (err) {
      toast(err.message || "Operation failed.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });

  loadCategories();
}
