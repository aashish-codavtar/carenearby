const API_BASE = window.location.origin;

let token = localStorage.getItem('adminToken');
let currentPage = 'dashboard';
let currentDoc = null;
let currentPSW = null;
let currentBooking = null;
let _bookings = [];
let _loggingOut = false;  // guard against concurrent logout calls

// Decode the exp claim from a JWT without verifying signature (client-side only)
function parseJwtExpiry(tok) {
  try { return JSON.parse(atob(tok.split('.')[1])).exp * 1000; }
  catch { return 0; }
}

// ── Toast notifications ────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('toast-show'), 10);
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// API helpers
async function apiCall(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  });

  // Read body once so we can use the error message in all branches
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    // Login endpoint returns 401 for wrong credentials — don't treat as session expiry
    if (endpoint === '/admin/login') {
      throw new Error(data.error || 'Invalid credentials');
    }
    // Only call logout once even if multiple in-flight requests all get 401
    if (!_loggingOut) {
      logout((data.error || 'Session expired') + '. Please sign in again.');
    }
    throw new Error('__session_expired__');
  }

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

function logout(message) {
  _loggingOut = true;
  token = null;
  localStorage.removeItem('adminToken');
  // Clear the password field so user doesn't have to clear it manually
  const pwField = document.getElementById('password');
  if (pwField) pwField.value = '';
  showScreen('login-screen');
  const errEl = document.getElementById('login-error');
  if (errEl) errEl.textContent = (typeof message === 'string' ? message : '') || '';
  // Allow future logout calls after a short delay (prevents rapid re-triggers)
  setTimeout(() => { _loggingOut = false; }, 500);
}

function isSessionError(e) {
  return e && e.message === '__session_expired__';
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
    const [pendingRes, pswsRes, bookingsRes] = await Promise.all([
      apiCall('/admin/documents/pending'),
      apiCall('/admin/psws'),
      apiCall('/admin/bookings?limit=1'),
    ]);

    document.getElementById('stat-pending').textContent = pendingRes.pendingCount || 0;
    document.getElementById('stat-psws').textContent = pswsRes.total || 0;
    document.getElementById('stat-bookings').textContent = bookingsRes.total || 0;

    const approved = pswsRes.psws?.filter(p => p.profile?.approvedByAdmin).length || 0;
    document.getElementById('stat-approved').textContent = approved;

    const docs = await apiCall('/admin/documents?status=PENDING&limit=5');
    renderRecentDocs(docs.documents || []);
  } catch (e) {
    if (isSessionError(e)) return;
    console.error(e);
    showToast('Failed to load dashboard data', 'error');
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
    if (isSessionError(e)) return;
    console.error(e);
    showToast('Failed to load PSW list: ' + e.message, 'error');
    document.querySelector('#psw-table tbody').innerHTML = '<tr><td colspan="6" class="loading error-text">Failed to load. Try refreshing.</td></tr>';
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
    const [data, docsData] = await Promise.all([
      apiCall(`/admin/psws/${pswId}`),
      apiCall(`/admin/documents/psw/${pswId}`),
    ]);
    currentPSW = data.psw;

    const p = data.psw;
    const isApproved = p.profile?.approvedByAdmin ?? false;

    let html = `
      <div class="psw-info-grid">
        <div class="psw-detail-section"><h4>Name</h4><p>${p.name}</p></div>
        <div class="psw-detail-section"><h4>Phone</h4><p>${p.phone}</p></div>
        <div class="psw-detail-section"><h4>Email</h4><p>${p.email || 'N/A'}</p></div>
        <div class="psw-detail-section"><h4>Qualification</h4><p>${p.profile?.qualificationType || 'PSW'}</p></div>
        <div class="psw-detail-section"><h4>License</h4><p>${p.profile?.licenseNumber || 'N/A'}</p></div>
        <div class="psw-detail-section"><h4>College</h4><p>${p.profile?.collegeName || 'N/A'}</p></div>
        <div class="psw-detail-section"><h4>Experience</h4><p>${p.profile?.experienceYears || 0} yrs</p></div>
        <div class="psw-detail-section"><h4>Police Check</h4><p>${p.profile?.policeCheckCleared ? '✅ Cleared' : '❌ Not cleared'}</p></div>
        <div class="psw-detail-section"><h4>Status</h4><p><span class="badge badge-${isApproved ? 'approved' : 'pending'}">${isApproved ? 'Approved' : 'Pending'}</span></p></div>
        <div class="psw-detail-section"><h4>First Aid Certified</h4><p>${p.profile?.firstAidCertified ? '✅ Yes' : '❌ No'}</p></div>
        <div class="psw-detail-section"><h4>Driver's Licence</h4><p>${p.profile?.driversLicense ? '✅ Yes' : '❌ No'}</p></div>
        <div class="psw-detail-section"><h4>Own Transport</h4><p>${p.profile?.ownTransportation ? '✅ Yes' : '❌ No'}</p></div>
        <div class="psw-detail-section"><h4>Insurance Verified</h4><p>${p.profile?.insuranceVerified ? '✅ Verified' : '❌ Not verified'}</p></div>
        <div class="psw-detail-section"><h4>Languages</h4><p>${(p.profile?.languages || ['English']).join(', ')}</p></div>
        <div class="psw-detail-section"><h4>Specialties</h4><p>${p.profile?.specialties?.length ? p.profile.specialties.join(', ') : 'None listed'}</p></div>
      </div>
      ${p.profile?.bio ? `<div style="margin:12px 0;padding:12px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;"><h4 style="margin:0 0 6px;color:#374151;">Bio</h4><p style="margin:0;color:#6b7280;">${p.profile.bio}</p></div>` : ''}
      <hr style="margin:16px 0;border:none;border-top:1px solid #e5e7eb;">
      <h4 style="margin-bottom:12px;color:#374151;">Documents (${docsData.documents?.length || 0})</h4>
      ${docsData.documents?.length ? docsData.documents.map(d => {
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
              <button class="btn btn-approve" onclick="approveDocFromPSW('${d._id}','${p._id}')">✅ Approve Doc</button>
              <button class="btn btn-reject" onclick="rejectDocFromPSW('${d._id}','${p._id}')">✗ Reject Doc</button>
            </div>` : ''}
        </div>`;
      }).join('') : '<p style="color:#9ca3af;padding:12px 0;">No documents uploaded yet</p>'}
    `;

    document.getElementById('psw-modal-body').innerHTML = html;

    // Show PSW-level approve/reject actions
    const actions = document.getElementById('psw-modal-actions');
    actions.classList.remove('hidden');
    const approveBtn = document.getElementById('approve-psw-modal-btn');
    const rejectBtn  = document.getElementById('reject-psw-modal-btn');
    approveBtn.textContent = isApproved ? '✓ Already Approved' : '✅ Approve PSW';
    approveBtn.disabled = isApproved;
    rejectBtn.textContent = isApproved ? '✗ Revoke Approval' : '✗ Reject PSW';

    document.getElementById('psw-modal').classList.remove('hidden');
  } catch (e) {
    showToast('Failed to load PSW: ' + e.message, 'error');
  }
}

async function approvePSW(pswId) {
  if (!confirm('Approve this PSW?')) return;
  try {
    await apiCall(`/admin/psws/${pswId}/approve`, { method: 'POST' });
    showToast('PSW approved successfully!', 'success');
    loadPSWs();
  } catch (e) {
    showToast('Failed to approve PSW: ' + e.message, 'error');
  }
}

async function approvePSWFromModal() {
  if (!currentPSW) return;
  if (!confirm(`Approve ${currentPSW.name} as a verified PSW?`)) return;
  try {
    await apiCall(`/admin/psws/${currentPSW._id}/approve`, { method: 'POST' });
    showToast('PSW approved!', 'success');
    document.getElementById('psw-modal').classList.add('hidden');
    if (currentPage === 'psws') loadPSWs();
  } catch (e) {
    showToast('Failed to approve: ' + e.message, 'error');
  }
}

async function rejectPSWFromModal() {
  if (!currentPSW) return;
  const reason = prompt(`Rejection reason for ${currentPSW.name} (optional):`);
  if (reason === null) return; // cancelled
  try {
    await apiCall(`/admin/psws/${currentPSW._id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Application not approved.' }),
    });
    showToast('PSW rejected.', 'info');
    document.getElementById('psw-modal').classList.add('hidden');
    if (currentPage === 'psws') loadPSWs();
  } catch (e) {
    showToast('Failed to reject: ' + e.message, 'error');
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
    if (isSessionError(e)) return;
    console.error(e);
    showToast('Failed to load documents: ' + e.message, 'error');
    document.querySelector('#documents-table tbody').innerHTML = '<tr><td colspan="6" class="loading error-text">Failed to load. Try refreshing.</td></tr>';
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
      body: JSON.stringify({}),
    });
    showToast('Document approved!', 'success');
    document.getElementById('doc-modal').classList.add('hidden');
    loadDocuments();
  } catch (e) {
    showToast('Failed to approve: ' + e.message, 'error');
  }
}

function showRejectForm() {
  document.getElementById('reject-reason-container').classList.remove('hidden');
}

async function confirmReject() {
  const reason = document.getElementById('reject-reason').value.trim();
  if (!reason) {
    showToast('Rejection reason is required', 'error');
    return;
  }
  try {
    await apiCall(`/admin/documents/${currentDoc._id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    showToast('Document rejected.', 'info');
    document.getElementById('doc-modal').classList.add('hidden');
    document.getElementById('reject-reason').value = '';
    loadDocuments();
  } catch (e) {
    showToast('Failed to reject: ' + e.message, 'error');
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
    if (isSessionError(e)) return;
    console.error(e);
    showToast('Failed to load bookings: ' + e.message, 'error');
    document.querySelector('#bookings-table tbody').innerHTML = '<tr><td colspan="6" class="loading error-text">Failed to load. Try refreshing.</td></tr>';
  }
}

function renderBookings(bookings) {
  _bookings = bookings;
  const tbody = document.querySelector('#bookings-table tbody');
  if (!bookings.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading">No bookings found</td></tr>';
    return;
  }

  tbody.innerHTML = bookings.map(b => `
    <tr>
      <td><a href="#" onclick="viewBooking('${b._id}');return false;" style="font-family:monospace;color:#2563eb;">${b._id.slice(-8)}</a></td>
      <td>${b.serviceType}</td>
      <td>${b.customer?.name || 'N/A'}</td>
      <td>${b.psw?.name || 'Unassigned'}</td>
      <td><span class="badge badge-${b.status.toLowerCase()}">${b.status}</span></td>
      <td>${new Date(b.scheduledAt).toLocaleDateString()}</td>
    </tr>
  `).join('');
}

function viewBooking(bookingId) {
  const b = _bookings.find(x => x._id === bookingId);
  if (!b) return;
  currentBooking = b;
  const psw = b.psw || b.pswId;
  const customer = b.customer || b.customerId;
  document.getElementById('booking-modal-body').innerHTML = `
    <div class="psw-info-grid">
      <div class="psw-detail-section"><h4>Booking ID</h4><p style="font-family:monospace">${b._id}</p></div>
      <div class="psw-detail-section"><h4>Service</h4><p>${b.serviceType}</p></div>
      <div class="psw-detail-section"><h4>Status</h4><p><span class="badge badge-${b.status.toLowerCase()}">${b.status}</span></p></div>
      <div class="psw-detail-section"><h4>Date</h4><p>${new Date(b.scheduledAt).toLocaleString()}</p></div>
      <div class="psw-detail-section"><h4>Hours</h4><p>${b.hours || 'N/A'}</p></div>
      <div class="psw-detail-section"><h4>Total</h4><p>$${b.totalPrice ?? b.price ?? 'N/A'}</p></div>
      <div class="psw-detail-section"><h4>Customer</h4><p>${customer?.name || 'N/A'} · ${customer?.phone || ''}</p></div>
      <div class="psw-detail-section"><h4>PSW</h4><p>${psw?.name || 'Unassigned'} · ${psw?.phone || ''}</p></div>
      <div class="psw-detail-section"><h4>Address</h4><p>${b.address || 'N/A'}</p></div>
    </div>
    ${b.notes ? `<div style="margin-top:16px;padding:14px;background:#f0f9ff;border-radius:8px;border:1px solid #bae6fd;"><h4 style="margin:0 0 8px;color:#0369a1;">Notes</h4><p style="margin:0;color:#374151;white-space:pre-wrap;">${b.notes}</p></div>` : '<p style="color:#9ca3af;margin-top:12px;">No notes for this booking.</p>'}
  `;
  document.getElementById('booking-modal').classList.remove('hidden');
}

// Audit
async function loadAudit() {
  try {
    const data = await apiCall('/admin/audit-logs?limit=100');
    renderAudit(data.logs || []);
  } catch (e) {
    if (isSessionError(e)) return;
    console.error(e);
    showToast('Failed to load audit logs: ' + e.message, 'error');
    document.querySelector('#audit-table tbody').innerHTML = '<tr><td colspan="4" class="loading error-text">Failed to load. Try refreshing.</td></tr>';
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
    showToast('Document approved!', 'success');
    viewPSW(pswId);
  } catch (e) { showToast('Failed: ' + e.message, 'error'); }
}

async function rejectDocFromPSW(docId, pswId) {
  const reason = prompt('Enter rejection reason:');
  if (!reason) return;
  try {
    await apiCall(`/admin/documents/${docId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
    showToast('Document rejected.', 'info');
    viewPSW(pswId);
  } catch (e) { showToast('Failed: ' + e.message, 'error'); }
}

// Event Listeners
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  // Clear any previous error and reset logout guard before attempting login
  document.getElementById('login-error').textContent = '';
  _loggingOut = false;

  try {
    const data = await login(username, password);
    document.getElementById('admin-name').textContent = data.admin.username;
    showScreen('admin-screen');
    showPage('dashboard');
  } catch (err) {
    document.getElementById('login-error').textContent = err.message;
  }
});

document.getElementById('logout-btn').addEventListener('click', () => logout());

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
document.getElementById('approve-psw-modal-btn').addEventListener('click', approvePSWFromModal);
document.getElementById('reject-psw-modal-btn').addEventListener('click', rejectPSWFromModal);

// Check auth on load
(async function init() {
  if (!token) { showScreen('login-screen'); return; }

  // Client-side expiry check — avoids a server round-trip and the "Session expired"
  // message appearing on a simple page refresh with a known-expired token
  if (parseJwtExpiry(token) < Date.now()) {
    localStorage.removeItem('adminToken');
    token = null;
    showScreen('login-screen');
    return;
  }

  try {
    const data = await apiCall('/admin/me');
    document.getElementById('admin-name').textContent = data.admin.username;
    showScreen('admin-screen');
    showPage('dashboard');
  } catch (e) {
    // 401 already called logout() with the actual error message — don't call it again
    if (!isSessionError(e)) logout();
  }
})();
