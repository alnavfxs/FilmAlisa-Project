requireAuth("admin");

document.addEventListener("DOMContentLoaded", () => {
  setupActorsCRUD();
});

function setupActorsCRUD() {
  const tableBody = document.querySelector("#actorsTableBody");
  const pagerEl = document.querySelector("#actorsPager");
  const modal = document.querySelector("#actorModal");
  const form = document.querySelector("#actorForm");
  const modalTitle = document.querySelector("#modalTitle");
  const createBtn = document.querySelector("#createActorBtn");
  const closeBtn = document.querySelector("#closeModalBtn");
  const submitBtn = form.querySelector(".category-form__submit");

  const nameInput = document.querySelector("#actorName");
  const surnameInput = document.querySelector("#actorSurname");
  const imgInput = document.querySelector("#actorImage");

  let editingRow = null;

  function buildRow(id, name, surname, image) {
    const row = document.createElement("tr");
    row.dataset.id = id;
    row.innerHTML = `
      <td>${id}</td>
      <td>
        <div class="cell-profile">
          <img src="${esc(image)}" alt="${esc(name)} ${esc(surname)}">
          <span class="cell-name">${esc(name)}</span>
          <span class="cell-surname">${esc(surname)}</span>
        </div>
      </td>
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

  const pager = createTablePaginator({
    tableBody,
    pagerEl,
    colSpan: 3,
    pageSize: 7,
    emptyText: "No actors yet.",
    renderRow: (a) => buildRow(a.id, a.name, a.surname, a.img_url),
  });

  async function loadActors() {
    tableBody.innerHTML = `<tr><td colspan="3" class="table-empty">Loading…</td></tr>`;
    try {
      const actors = await api.admin.actors();
      // 1. Gələn məlumatları tərsinə çeviririk ki, yenilər başda olsun
      pager.setItems((actors || []).reverse());
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="3" class="table-empty">Failed to load actors.</td></tr>`;
      toast(err.message || "Failed to load actors.", "error");
    }
  }

  function openModal(mode, row = null) {
    editingRow = row;
    form.reset();

    if (mode === "edit" && row) {
      modalTitle.textContent = "Edit Actor";
      nameInput.value = row.querySelector(".cell-name").textContent;
      surnameInput.value = row.querySelector(".cell-surname").textContent;
      imgInput.value = row.querySelector("img").src;
    } else {
      modalTitle.textContent = "Create Actor";
    }

    modal.classList.add("active");
    nameInput.focus();
  }

  function closeModal() {
    modal.classList.remove("active");
    form.reset();
    editingRow = null;
  }

  createBtn.addEventListener("click", () => openModal("create"));
  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("active")) closeModal();
  });

  tableBody.addEventListener("click", (e) => {
    const row = e.target.closest("tr");
    if (!row || !row.dataset.id) return;

    if (e.target.closest(".table-btn--edit")) {
      openModal("edit", row);
    }

    if (e.target.closest(".table-btn--delete")) {
      const name = row.querySelector(".cell-name").textContent;
      confirmDialog(`Are you sure you want to delete the actor "${name}"?`, {
        confirmLabel: "Delete",
        danger: true,
      }).then(async (confirmed) => {
        if (!confirmed) return;
        try {
          await api.admin.removeActor(row.dataset.id);
          pager.removeItem(row.dataset.id);
          toast("Actor deleted.", "success");
        } catch (err) {
          toast(err.message || "Failed to delete actor.", "error");
        }
      });
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const body = {
      name: nameInput.value.trim(),
      surname: surnameInput.value.trim(),
      img_url: imgInput.value.trim(),
    };

    if (!body.name || !body.surname || !body.img_url) return;

    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = editingRow ? "Updating…" : "Adding…";

    try {
      if (editingRow) {
        const id = editingRow.dataset.id;
        await api.admin.updateActor(id, body);
        pager.updateItem(id, body);
        toast("Actor updated.", "success");
      } else {
        await api.admin.createActor(body);
        // 2. pager.addItem() əvəzinə datanı yenidən yükləyirik ki, yeni aktyor ən başa gəlsin
        await loadActors();
        toast("Actor added.", "success");
      }
      closeModal();
    } catch (err) {
      toast(err.message || "Operation failed.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });

  loadActors();
}
