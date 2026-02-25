const API_BASE = window.location.origin;

let token = localStorage.getItem('adminToken');
let currentPage = 'dashboard';
let currentDoc = null;
let currentPSW = null;

// API helpers
async function apiCall(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  });
  
  if (res.status === 401) {
    logout();
    throw new Error('Session expired');
  }
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Auth
async function login(username, password) {
  const data = await apiCall('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  token = data.token;
  localStorage.setItem('adminToken', token);
  return data;
}

function logout() {
  token = null;
  localStorage.removeItem('adminToken');
  showScreen('login-screen');
}

function showScreen(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(screen).classList.remove('hidden');
}

function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(`page-${page}`).classList.remove('hidden');
  document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  currentPage = page;
  loadPage(page);
}

async function loadPage(page) {
  switch(page) {
    case 'dashboard': loadDashboard(); break;
    case 'psws': loadPSWs(); break;
    case 'documents': loadDocuments(); break;
    case 'bookings': loadBookings(); break;
    case 'audit': loadAudit(); break;
  }
}

// Dashboard
async function loadDashboard() {
  try {
    const [pendingRes, pswsRes] = await Promise.all([
      apiCall('/admin/documents/pending'),
      apiCall('/admin/psws')
    ]);
    
    document.getElementById('stat-pending').textContent = pendingRes.pendingCount || 0;
    document.getElementById('stat-psws').textContent = pswsRes.total || 0;
    
    const approved = pswsRes.psws?.filter(p => p.profile?.approvedByAdmin).length || 0;
    document.getElementById('stat-approved').textContent = approved;
    
    const docs = await apiCall('/admin/documents?status=PENDING&limit=5');
    renderRecentDocs(docs.documents || []);
  } catch (e) {
    console.error(e);
  }
}

function renderRecentDocs(docs) {
  const container = document.getElementById('recent-docs');
  if (!docs.length) {
    container.innerHTML = '<p class="loading">No pending documents</p>';
    return;
  }
  
  let html = '<table><thead><tr><th>Type</th><th>Status</th><th>Submitted</th></tr></thead><tbody>';
  docs.forEach(d => {
    html += `<tr>
      <td>${d.docType}</td>
      <td><span class="badge badge-${d.status.toLowerCase()}">${d.status}</span></td>
      <td>${new Date(d.submittedAt).toLocaleDateString()}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

// PSWs
async function loadPSWs() {
  const approved = document.getElementById('psw-filter').value;
  const query = approved !== '' ? `?approved=${approved}` : '';
  try {
    const data = await apiCall(`/admin/psws${query}`);
    renderPSWs(data.psws || []);
    
    document.getElementById('stat-psws').textContent = data.total || 0;
    document.getElementById('stat-approved').textContent = data.psws?.filter(p => p.profile?.approvedByAdmin).length || 0;
  } catch (e) {
    console.error(e);
  }
}

function renderPSWs(psws) {
  const tbody = document.querySelector('#psw-table tbody');
  if (!psws.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading">No PSWs found</td></tr>';
    return;
  }
  
  tbody.innerHTML = psws.map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${p.phone}</td>
      <td>${p.profile?.qualificationType || 'PSW'}</td>
      <td>${p.profile?.experienceYears || 0} yrs</td>
      <td><span class="badge badge-${p.profile?.approvedByAdmin ? 'approved' : 'pending'}">${p.profile?.approvedByAdmin ? 'Approved' : 'Pending'}</span></td>
      <td>
        <button class="btn btn-view" onclick="viewPSW('${p._id}')">View</button>
        ${!p.profile?.approvedByAdmin ? `<button class="btn btn-approve" onclick="approvePSW('${p._id}')">Approve</button>` : ''}
      </td>
    </tr>
  `).join('');
}

async function viewPSW(pswId) {
  try {
    const data = await apiCall(`/admin/psws/${pswId}`);
    currentPSW = data.psw;
    
    const docsData = await apiCall(`/admin/documents/psw/${pswId}`);
    
    const p = data.psw;
    let html = `
      <div class="psw-detail-section">
        <h4>Name</h4><p>${p.name}</p>
      </div>
      <div class="psw-detail-section">
        <h4>Phone</h4><p>${p.phone}</p>
      </div>
      <div class="psw-detail-section">
        <h4>Email</h4><p>${p.email || 'N/A'}</p>
      </div>
      <div class="psw-detail-section">
        <h4>Qualification</h4><p>${p.profile?.qualificationType || 'PSW'}</p>
      </div>
      <div class="psw-detail-section">
        <h4>License</h4><p>${p.profile?.licenseNumber || 'N/A'}</p>
      </div>
      <div class="psw-detail-section">
        <h4>College</h4><p>${p.profile?.collegeName || 'N/A'}</p>
      </div>
      <div class="psw-detail-section">
        <h4>Experience</h4><p>${p.profile?.experienceYears || 0} years</p>
      </div>
      <div class="psw-detail-section">
        <h4>Police Check</h4><p>${p.profile?.policeCheckCleared ? '✅ Cleared' : '❌ Not cleared'}</p>
      </div>
      <div class="psw-detail-section">
        <h4>Status</h4><p><span class="badge badge-${p.profile?.approvedByAdmin ? 'approved' : 'pending'}">${p.profile?.approvedByAdmin ? 'Approved' : 'Pending'}</span></p>
      </div>
      <div class="psw-detail-section">
        <h4>Documents (${docsData.documents?.length || 0})</h4>
        ${docsData.documents?.map(d => {
          const imgSrc = d.url || d.dataUrl || '';
          const isImg = imgSrc && (d.mimeType?.startsWith('image/') || imgSrc.startsWith('data:image') || imgSrc.match(/\.(jpg|jpeg|png|gif)$/i));
          return `
          <div style="margin:8px 0;padding:12px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <strong>${d.docType}</strong>
              <span class="badge badge-${d.status.toLowerCase()}">${d.status}</span>
            </div>
            ${isImg ? `<img src="${imgSrc}" style="width:100%;max-height:200px;object-fit:contain;border-radius:6px;background:#000;" />` : ''}
            ${!isImg && imgSrc ? `<a href="${imgSrc}" target="_blank" class="btn btn-view" style="display:inline-block;margin-top:4px;">View File</a>` : ''}
            ${!imgSrc ? '<p style="color:#9ca3af;font-size:12px;">No file uploaded</p>' : ''}
            ${d.status === 'PENDING' ? `
              <div style="margin-top:8px;display:flex;gap:8px;">
                <button class="btn btn-approve" onclick="approveDocFromPSW('${d._id}','${p._id}')">✅ Approve</button>
                <button class="btn" style="background:#fee2e2;color:#dc2626;" onclick="rejectDocFromPSW('${d._id}','${p._id}')">✗ Reject</button>
              </div>` : ''}
          </div>`;
        }).join('') || '<p style="color:#9ca3af;">No documents uploaded yet</p>'}
      </div>
    `;
    
    document.getElementById('psw-modal-body').innerHTML = html;
    document.getElementById('psw-modal').classList.remove('hidden');
  } catch (e) {
    alert(e.message);
  }
}

async function approvePSW(pswId) {
  if (!confirm('Approve this PSW?')) return;
  try {
    await apiCall(`/admin/psws/${pswId}/approve`, { method: 'POST' });
    alert('PSW approved!');
    loadPSWs();
  } catch (e) {
    alert(e.message);
  }
}

// Documents
async function loadDocuments() {
  const status = document.getElementById('doc-status-filter').value;
  const docType = document.getElementById('doc-type-filter').value;
  
  let query = '?';
  if (status) query += `status=${status}&`;
  if (docType) query += `docType=${docType}&`;
  
  try {
    const data = await apiCall(`/admin/documents${query}`);
    renderDocuments(data.documents || []);
  } catch (e) {
    console.error(e);
  }
}

function renderDocuments(docs) {
  const tbody = document.querySelector('#documents-table tbody');
  if (!docs.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading">No documents found</td></tr>';
    return;
  }
  
  tbody.innerHTML = docs.map(d => `
    <tr>
      <td>${d.docType}</td>
      <td>${d.label || '-'}</td>
      <td>${d.originalName || d.fileName}</td>
      <td><span class="badge badge-${d.status.toLowerCase()}">${d.status}</span></td>
      <td>${new Date(d.submittedAt).toLocaleDateString()}</td>
      <td>
        ${d.url ? `<a href="${d.url}" target="_blank" class="btn btn-view">View</a>` : ''}
        ${d.status === 'PENDING' ? `
          <button class="btn btn-approve" onclick="openDocModal('${d._id}')">Review</button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

async function openDocModal(docId) {
  try {
    const data = await apiCall(`/admin/documents/${docId}`);
    currentDoc = data.document;
    
    const imgSrc = currentDoc.url || currentDoc.dataUrl || '';
    const isImg = imgSrc && (currentDoc.mimeType?.startsWith('image/') || imgSrc.startsWith('data:image') || imgSrc.match(/\.(jpg|jpeg|png|gif)$/i));
    document.getElementById('doc-modal-body').innerHTML = `
      <div class="psw-detail-section">
        <h4>Document Type</h4><p>${currentDoc.docType}</p>
      </div>
      <div class="psw-detail-section">
        <h4>Label</h4><p>${currentDoc.label || '-'}</p>
      </div>
      <div class="psw-detail-section">
        <h4>File</h4>
        ${isImg ? `<img src="${imgSrc}" style="width:100%;max-height:400px;object-fit:contain;border-radius:8px;background:#000;margin-top:8px;" />` : ''}
        ${!isImg && imgSrc ? `<a href="${imgSrc}" target="_blank" class="btn btn-view">Download / View File</a>` : ''}
        ${!imgSrc ? '<p style="color:#9ca3af;">No file available</p>' : ''}
      </div>
      <div class="psw-detail-section">
        <h4>Size</h4><p>${currentDoc.size ? Math.round(currentDoc.size / 1024) + ' KB' : 'N/A'}</p>
      </div>
      <div class="psw-detail-section">
        <h4>Submitted</h4><p>${new Date(currentDoc.submittedAt).toLocaleString()}</p>
      </div>
      <div class="psw-detail-section">
        <h4>Status</h4><p><span class="badge badge-${currentDoc.status.toLowerCase()}">${currentDoc.status}</span></p>
      </div>
    `;
    
    document.getElementById('reject-reason-container').classList.add('hidden');
    document.getElementById('doc-modal').classList.remove('hidden');
  } catch (e) {
    alert(e.message);
  }
}

async function approveDocument() {
  if (!currentDoc) return;
  try {
    await apiCall(`/admin/documents/${currentDoc._id}/approve`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    alert('Document approved!');
    document.getElementById('doc-modal').classList.add('hidden');
    loadDocuments();
  } catch (e) {
    alert(e.message);
  }
}

function showRejectForm() {
  document.getElementById('reject-reason-container').classList.remove('hidden');
}

async function confirmReject() {
  const reason = document.getElementById('reject-reason').value.trim();
  if (!reason) {
    alert('Rejection reason is required');
    return;
  }
  try {
    await apiCall(`/admin/documents/${currentDoc._id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
    alert('Document rejected!');
    document.getElementById('doc-modal').classList.add('hidden');
    document.getElementById('reject-reason').value = '';
    loadDocuments();
  } catch (e) {
    alert(e.message);
  }
}

// Bookings
async function loadBookings() {
  const status = document.getElementById('booking-status-filter').value;
  const query = status ? `?status=${status}` : '';
  
  try {
    const data = await apiCall(`/admin/bookings${query}`);
    renderBookings(data.bookings || []);
    
    document.getElementById('stat-bookings').textContent = data.total || 0;
  } catch (e) {
    console.error(e);
  }
}

function renderBookings(bookings) {
  const tbody = document.querySelector('#bookings-table tbody');
  if (!bookings.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading">No bookings found</td></tr>';
    return;
  }
  
  tbody.innerHTML = bookings.map(b => `
    <tr>
      <td>${b._id.slice(-8)}</td>
      <td>${b.serviceType}</td>
      <td>${b.customer?.name || 'N/A'}</td>
      <td>${b.psw?.name || 'Unassigned'}</td>
      <td><span class="badge badge-${b.status.toLowerCase()}">${b.status}</span></td>
      <td>${new Date(b.scheduledAt).toLocaleDateString()}</td>
    </tr>
  `).join('');
}

// Audit
async function loadAudit() {
  try {
    const data = await apiCall('/admin/audit-logs?limit=100');
    renderAudit(data.logs || []);
  } catch (e) {
    console.error(e);
  }
}

function renderAudit(logs) {
  const tbody = document.querySelector('#audit-table tbody');
  if (!logs.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="loading">No audit logs</td></tr>';
    return;
  }
  
  tbody.innerHTML = logs.map(l => `
    <tr>
      <td>${new Date(l.createdAt).toLocaleString()}</td>
      <td>${l.adminId?.username || 'N/A'}</td>
      <td>${l.action}</td>
      <td>${JSON.stringify(l.details)}</td>
    </tr>
  `).join('');
}

// Approve/Reject docs from PSW detail panel
async function approveDocFromPSW(docId, pswId) {
  if (!confirm('Approve this document?')) return;
  try {
    await apiCall(`/admin/documents/${docId}/approve`, { method: 'POST', body: JSON.stringify({}) });
    alert('Document approved!');
    viewPSW(pswId);
  } catch (e) { alert(e.message); }
}

async function rejectDocFromPSW(docId, pswId) {
  const reason = prompt('Enter rejection reason:');
  if (!reason) return;
  try {
    await apiCall(`/admin/documents/${docId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
    alert('Document rejected!');
    viewPSW(pswId);
  } catch (e) { alert(e.message); }
}

// Event Listeners
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  try {
    const data = await login(username, password);
    document.getElementById('admin-name').textContent = data.admin.username;
    showScreen('admin-screen');
    showPage('dashboard');
  } catch (err) {
    document.getElementById('login-error').textContent = err.message;
  }
});

document.getElementById('logout-btn').addEventListener('click', logout);

document.querySelectorAll('.sidebar nav a').forEach(a => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    showPage(a.dataset.page);
  });
});

document.getElementById('psw-filter').addEventListener('change', loadPSWs);
document.getElementById('doc-status-filter').addEventListener('change', loadDocuments);
document.getElementById('doc-type-filter').addEventListener('change', loadDocuments);
document.getElementById('booking-status-filter').addEventListener('change', loadBookings);

document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.closest('.modal').classList.add('hidden');
  });
});

document.getElementById('approve-doc-btn').addEventListener('click', approveDocument);
document.getElementById('reject-doc-btn').addEventListener('click', showRejectForm);
document.getElementById('confirm-reject-btn').addEventListener('click', confirmReject);

// Check auth on load
(async function init() {
  if (token) {
    try {
      const data = await apiCall('/admin/me');
      document.getElementById('admin-name').textContent = data.admin.username;
      showScreen('admin-screen');
      showPage('dashboard');
    } catch {
      logout();
    }
  } else {
    showScreen('login-screen');
  }
})();
