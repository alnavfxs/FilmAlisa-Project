requireAuth("admin");

document.addEventListener("DOMContentLoaded", () => {
  loadUsers();
});

function buildUserRow(user) {
  const row = document.createElement("tr");
  row.dataset.id = user.id;
  row.innerHTML = `
    <td>${user.id}</td>
    <td class="cell-name">${esc(user.full_name)}</td>
    <td>${esc(user.email)}</td>
    <td>${formatDate(user.created_at)}</td>
  `;
  return row;
}

async function loadUsers() {
  const tableBody = document.querySelector("#usersTableBody");
  const pagerEl = document.querySelector("#usersPager");
  tableBody.innerHTML = `<tr><td colspan="4" class="table-empty">Loading…</td></tr>`;

  const pager = createTablePaginator({
    tableBody,
    pagerEl,
    colSpan: 4,
    pageSize: 13,
    emptyText: "No users yet.",
    renderRow: buildUserRow,
  });

  try {
    const users = await api.admin.users();
    // Məlumatları (əgər varsa) tərsinə çevirib paginator-a ötürürük
    pager.setItems((users || []).reverse());
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="4" class="table-empty">Failed to load users.</td></tr>`;
    toast(err.message || "Failed to load users.", "error");
  }
}
