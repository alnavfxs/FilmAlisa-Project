requireAuth("admin");

document.addEventListener("DOMContentLoaded", () => {
  loadUsers();
});

async function loadUsers() {
  const tableBody = document.querySelector("#usersTableBody");
  tableBody.innerHTML = `<tr><td colspan="4" class="table-empty">Loading…</td></tr>`;

  try {
    const users = await api.admin.users();
    tableBody.innerHTML = "";
    if (!users || !users.length) {
      tableBody.innerHTML = `<tr><td colspan="4" class="table-empty">No users yet.</td></tr>`;
      return;
    }
    users.forEach((user) => {
      const row = document.createElement("tr");
      row.dataset.id = user.id;
      row.innerHTML = `
        <td>${user.id}</td>
        <td class="cell-name">${esc(user.full_name)}</td>
        <td>${esc(user.email)}</td>
        <td>${formatDate(user.created_at)}</td>
      `;
      tableBody.appendChild(row);
    });
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="4" class="table-empty">Failed to load users.</td></tr>`;
    toast(err.message || "Failed to load users.", "error");
  }
}
