// admin.js — LuxeRadiant Admin Dashboard
const SHEETS_WEB_APP = 'https://script.google.com/macros/s/AKfycbwUPwxJgknNHJTTsudn4bZxw4AMuWjiwTQOM9vGXoCHqQ0kUzaDC8Pl8dPzXfqQm7or/exec';
const PASSWORD = 'Nandani123';

function showLogin() {
  document.getElementById('login-screen').style.display = 'block';
  document.getElementById('admin-panel').style.display = 'none';
}

function showPanel() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'block';
}

document.getElementById('loginBtn').addEventListener('click', () => {
  const pass = document.getElementById('adminPass').value;
  if (pass === PASSWORD) {
    showPanel();
    loadAll();
  } else {
    document.getElementById('loginMsg').textContent = 'Wrong password';
  }
});

document.getElementById('logout').addEventListener('click', showLogin);

async function fetchSheet(type) {
  try {
    const res = await fetch(SHEETS_WEB_APP + '?type=' + type);
    const data = await res.json();
    return data;
  } catch (e) {
    console.error('Fetch error', e);
    return [];
  }
}

function buildTable(rows) {
  if (!rows.length) return '<p>No data found.</p>';
  let html = '<table><thead><tr>';
  Object.keys(rows[0]).forEach(h => html += `<th>${h}</th>`);
  html += '</tr></thead><tbody>';
  rows.forEach(r => {
    html += '<tr>';
    Object.values(r).forEach(v => html += `<td>${v}</td>`);
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

async function loadAll(){
  // Orders
  const orders = await fetchSheet('order');
  document.getElementById('ordersTable').innerHTML = buildTable(orders);

  // Contacts
  const contacts = await fetchSheet('contact');
  document.getElementById('contactsTable').innerHTML = buildTable(contacts);
}

document.getElementById('refresh').addEventListener('click', loadAll);
document.getElementById('download').addEventListener('click', () => {
  if (window.LuxeAdmin && typeof window.LuxeAdmin.downloadCSV === 'function') {
    window.LuxeAdmin.downloadCSV();
  } else {
    alert('Open the main site first to enable CSV export.');
  }
});

// Initially show login
showLogin();
