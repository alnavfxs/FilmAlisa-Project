requireAuth("admin");

document.addEventListener("DOMContentLoaded", () => {
  setupContactTable();
});

function setupContactTable() {
  const tableBody = document.querySelector("#contactTableBody");
  const modal = document.querySelector("#deleteModal");
  const closeBtn = document.querySelector("#closeModalBtn");
  const cancelBtn = document.querySelector("#cancelDeleteBtn");
  const confirmBtn = document.querySelector("#confirmDeleteBtn");

  let rowToDelete = null;

  function buildRow(c) {
    const row = document.createElement("tr");
    row.dataset.id = c.id;
    row.innerHTML = `
      <td>${c.id}</td>
      <td class="cell-name">${esc(c.full_name)}</td>
      <td>${esc(c.email)}</td>
      <td class="cell-message" title="${esc(c.reason)}">${esc(c.reason)}</td>
      <td>
        <button class="table-btn table-btn--delete" type="button" title="Delete">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    return row;
  }

  async function loadContacts() {
    tableBody.innerHTML = `<tr><td colspan="5" class="table-empty">Loading…</td></tr>`;
    try {
      const contacts = await api.admin.contacts();
      tableBody.innerHTML = "";
      if (!contacts || !contacts.length) {
        tableBody.innerHTML = `<tr><td colspan="5" class="table-empty">No messages yet.</td></tr>`;
        return;
      }
      contacts.forEach((c) => tableBody.appendChild(buildRow(c)));
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="5" class="table-empty">Failed to load messages.</td></tr>`;
      toast(err.message || "Failed to load messages.", "error");
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
    const id = rowToDelete.dataset.id;
    confirmBtn.disabled = true;
    try {
      await api.admin.removeContact(id);
      rowToDelete.remove();
      toast("Message deleted.", "success");
      closeModal();
    } catch (err) {
      toast(err.message || "Failed to delete message.", "error");
    } finally {
      confirmBtn.disabled = false;
    }
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  loadContacts();
}
