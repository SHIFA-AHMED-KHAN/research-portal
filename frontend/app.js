// Research Opportunity Portal - frontend logic (vanilla JS, talks to the REST API).
const API = '/api/opportunities';

const $ = (id) => document.getElementById(id);
const messageBox = $('message');
const listEl = $('list');
const modal = $('modal');
const modalBody = $('modal-body');

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = 'message ' + type;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  clearTimeout(showMessage.timer);
  showMessage.timer = setTimeout(() => messageBox.classList.add('hidden'), 6000);
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function statusBadge(status) {
  const cls = status === 'Open' ? 'open' : 'closed';
  return `<span class="badge ${cls}">${esc(status)}</span>`;
}

async function api(path, options) {
  const res = await fetch(path, options);
  let body = null;
  try { body = await res.json(); } catch (_) { /* non-JSON body */ }
  if (!res.ok) {
    const detail = body && body.details ? ' ' + body.details.join(' ') : '';
    throw new Error((body && body.error ? body.error : `Request failed (${res.status})`) + detail);
  }
  return body;
}

// ------------------------------------------------ list ----
async function loadOpportunities() {
  try {
    const items = await api(API);
    if (!items.length) {
      listEl.innerHTML = '<p class="empty">No research opportunities posted yet.</p>';
      return;
    }
    listEl.innerHTML = items.map((o) => `
      <div class="opp" data-id="${o.id}">
        <h3>${esc(o.title)}${statusBadge(o.status)}</h3>
        <p class="meta"><strong>${esc(o.faculty_name)}</strong> &middot; ${esc(o.department)}</p>
        <p class="meta">${esc(o.research_area)} &middot; ${o.positions} position(s) &middot; Deadline: ${esc(o.deadline)}</p>
      </div>`).join('');
    listEl.querySelectorAll('.opp').forEach((el) => {
      el.addEventListener('click', () => openDetail(Number(el.dataset.id)));
    });
  } catch (err) {
    listEl.innerHTML = `<p class="empty">Could not load opportunities: ${esc(err.message)}</p>`;
  }
}

// ------------------------------------------------ detail ----
function detailHtml(o) {
  return `
    <h2>${esc(o.title)}${statusBadge(o.status)}</h2>
    <dl>
      <dt>Research Area</dt><dd>${esc(o.research_area)}</dd>
      <dt>Faculty</dt><dd>${esc(o.faculty_name)}</dd>
      <dt>Department</dt><dd>${esc(o.department)}</dd>
      <dt>Required Skills</dt><dd>${esc(o.required_skills || 'Not specified')}</dd>
      <dt>Positions</dt><dd>${o.positions}</dd>
      <dt>Deadline</dt><dd>${esc(o.deadline)}</dd>
      <dt>Description</dt><dd>${esc(o.description)}</dd>
    </dl>
    <div style="margin-top:16px">
      <button class="btn primary" id="btn-edit">Edit</button>
      <button class="btn warn" id="btn-toggle">${o.status === 'Open' ? 'Close' : 'Reopen'}</button>
      <button class="btn danger" id="btn-delete">Delete</button>
    </div>`;
}

async function openDetail(id) {
  try {
    const o = await api(`${API}/${id}`);
    modalBody.innerHTML = detailHtml(o);
    modal.classList.remove('hidden');

    $('btn-edit').addEventListener('click', () => openEdit(o));
    $('btn-toggle').addEventListener('click', () => toggleStatus(o));
    $('btn-delete').addEventListener('click', () => deleteOpportunity(o));
  } catch (err) {
    showMessage(err.message, 'error');
  }
}

function closeModal() { modal.classList.add('hidden'); }
$('modal-close').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

// ------------------------------------------------ edit ----
function openEdit(o) {
  modalBody.innerHTML = `
    <h2>Edit Opportunity</h2>
    <form id="edit-form" novalidate>
      <div class="grid">
        <label>Research Title *<input type="text" id="e-title" required maxlength="255" value="${esc(o.title)}" /></label>
        <label>Research Area *<input type="text" id="e-area" required maxlength="255" value="${esc(o.research_area)}" /></label>
        <label>Faculty Member *<input type="text" id="e-faculty" required maxlength="255" value="${esc(o.faculty_name)}" /></label>
        <label>Department *<input type="text" id="e-dept" required maxlength="255" value="${esc(o.department)}" /></label>
        <label>Required Skills<input type="text" id="e-skills" maxlength="500" value="${esc(o.required_skills || '')}" /></label>
        <label>Available Positions *<input type="number" id="e-positions" required min="1" value="${o.positions}" /></label>
        <label>Application Deadline *<input type="date" id="e-deadline" required value="${esc(o.deadline)}" /></label>
        <label>Status<select id="e-status">
          <option value="Open" ${o.status === 'Open' ? 'selected' : ''}>Open</option>
          <option value="Closed" ${o.status === 'Closed' ? 'selected' : ''}>Closed</option>
        </select></label>
      </div>
      <label class="full">Research Description *<textarea id="e-desc" required rows="4">${esc(o.description)}</textarea></label>
      <button type="submit" class="btn primary">Save Changes</button>
    </form>`;

  $('edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      title: $('e-title').value.trim(),
      research_area: $('e-area').value.trim(),
      faculty_name: $('e-faculty').value.trim(),
      department: $('e-dept').value.trim(),
      required_skills: $('e-skills').value.trim(),
      positions: Number($('e-positions').value),
      deadline: $('e-deadline').value,
      status: $('e-status').value,
    };
    const missing = ['title', 'research_area', 'faculty_name', 'department', 'deadline']
      .filter((k) => !payload[k]);
    if (missing.length || !Number.isInteger(payload.positions) || payload.positions < 1) {
      showMessage('Please fill all required fields with valid values.', 'error');
      return;
    }
    try {
      await api(`${API}/${o.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      closeModal();
      showMessage('Opportunity updated successfully.', 'success');
      loadOpportunities();
    } catch (err) {
      showMessage(err.message, 'error');
    }
  });
}

// ------------------------------------------------ status ----
async function toggleStatus(o) {
  const next = o.status === 'Open' ? 'Closed' : 'Open';
  const verb = next === 'Closed' ? 'close' : 'reopen';
  if (!confirm(`Are you sure you want to ${verb} this opportunity?`)) return;
  try {
    await api(`${API}/${o.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    closeModal();
    showMessage(`Opportunity ${next === 'Closed' ? 'closed' : 'reopened'} successfully.`, 'success');
    loadOpportunities();
  } catch (err) {
    showMessage(err.message, 'error');
  }
}

// ------------------------------------------------ delete ----
async function deleteOpportunity(o) {
  if (!confirm('Delete this opportunity permanently?')) return;
  try {
    await api(`${API}/${o.id}`, { method: 'DELETE' });
    closeModal();
    showMessage('Opportunity deleted successfully.', 'success');
    loadOpportunities();
  } catch (err) {
    showMessage(err.message, 'error');
  }
}

// ------------------------------------------------ create ----
$('create-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    title: $('f-title').value.trim(),
    research_area: $('f-area').value.trim(),
    faculty_name: $('f-faculty').value.trim(),
    department: $('f-dept').value.trim(),
    required_skills: $('f-skills').value.trim(),
    positions: Number($('f-positions').value),
    deadline: $('f-deadline').value,
    status: $('f-status').value,
    description: $('f-desc').value.trim(),
  };
  const missing = ['title', 'research_area', 'faculty_name', 'department', 'deadline', 'description']
    .filter((k) => !payload[k]);
  if (missing.length || !Number.isInteger(payload.positions) || payload.positions < 1) {
    showMessage('Please fill all required fields with valid values.', 'error');
    return;
  }
  try {
    await api(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    e.target.reset();
    $('f-positions').value = 1;
    showMessage('Research opportunity posted successfully.', 'success');
    loadOpportunities();
  } catch (err) {
    showMessage(err.message, 'error');
  }
});

$('refresh-btn').addEventListener('click', loadOpportunities);

loadOpportunities();
