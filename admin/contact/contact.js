requireAuth("admin");

document.addEventListener("DOMContentLoaded", () => {
  setupContactTable();
});

function setupContactTable() {
  const tableBody = document.querySelector("#contactTableBody");

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
    tableBody.innerHTML = `<tr><td colspan="5" class="table-empty">Loading...</td></tr>`;
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

  tableBody.addEventListener("click", (e) => {
    const deleteBtn = e.target.closest(".table-btn--delete");
    const row = e.target.closest("tr");

    if (!row || !row.dataset.id) return;

    if (deleteBtn) {
      const contactName = row.querySelector(".cell-name").textContent;
      confirmDialog(
        `Are you sure you want to delete the message from "${contactName}"?`,
        {
          confirmLabel: "Delete",
          cancelLabel: "Cancel",
          danger: true,
        },
      ).then(async (confirmed) => {
        if (!confirmed) return;

        const id = row.dataset.id;

        try {
          await api.admin.removeContact(id);
          row.remove();
          toast("Message deleted successfully.", "success");
        } catch (err) {
          toast(err.message || "Failed to delete message.", "error");
        }
      });
    }
  });

  loadContacts();
}
