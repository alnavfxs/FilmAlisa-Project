requireAuth("admin");

document.addEventListener("DOMContentLoaded", () => {
  setupContactTable();
});

function setupContactTable() {
  const tableBody = document.querySelector("#contactTableBody");
  const pagerEl = document.querySelector("#contactPager");

  function buildRow(c) {
    const row = document.createElement("tr");
    row.dataset.id = c.id;
    row.innerHTML = `
      <td>${c.id}</td>
      <td class="cell-name">${esc(c.full_name)}</td>
      <td>${esc(c.email)}</td>
      <td class="cell-message truncate-cell" title="${esc(c.reason)}">${esc(c.reason)}</td>
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
    colSpan: 5,
    pageSize: 9,
    emptyText: "No messages yet.",
    renderRow: buildRow,
  });

  async function loadContacts() {
    tableBody.innerHTML = `<tr><td colspan="5" class="table-empty">Loading…</td></tr>`;
    try {
      const contacts = await api.admin.contacts();
      // Məlumatları (əgər varsa) tərsinə çevirib paginator-a ötürürük
      pager.setItems((contacts || []).reverse());
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="5" class="table-empty">Failed to load messages.</td></tr>`;
      toast(err.message || "Failed to load messages.", "error");
    }
  }

  // Delete button click triggers the global confirmDialog
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
          pager.removeItem(id);
          toast("Message deleted successfully.", "success");
        } catch (err) {
          toast(err.message || "Failed to delete message.", "error");
        }
      });
    }
  });

  loadContacts();
}
