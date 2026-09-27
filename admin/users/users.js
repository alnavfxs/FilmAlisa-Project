requireAuth("admin");

document.addEventListener("DOMContentLoaded", () => {
  loadUsers();
});

async function loadUsers() {
  const tableBody = document.querySelector("#usersTableBody");
  tableBody.innerHTML = `<tr><td colspan="4" class="table-empty">Yüklənir…</td></tr>`;

  try {
    const users = await api.admin.users();
    tableBody.innerHTML = "";
    if (!users || !users.length) {
      tableBody.innerHTML = `<tr><td colspan="4" class="table-empty">Hələ istifadəçi yoxdur.</td></tr>`;
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
    tableBody.innerHTML = `<tr><td colspan="4" class="table-empty">İstifadəçilər yüklənmədi.</td></tr>`;
    toast(err.message || "İstifadəçilər yüklənmədi.", "error");
  }
}
